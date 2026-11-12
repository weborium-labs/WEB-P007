import { Role, type Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
    BATCH_AUDIT,
    BATCH_ENTITY,
} from "../constants/batch.constants.js";
import type { AuthContext } from "../types/express.js";
import type {
    CreateBatchInput,
    ListBatchesQuery,
    UpdateBatchInput,
} from "../validators/batch.validator.js";
import { ApiError } from "../utils/ApiError.js";
import {
    checkBatchDateRange,
    istEndOfDay,
    istStartOfDay,
    toIstDay,
} from "../utils/date.js";
import { recordAudit } from "./audit.service.js";

export type Actor = AuthContext & { ipAddress?: string };

/* ------------------------------------------------------------------ */
/* Projections                                                         */
/* ------------------------------------------------------------------ */

/** Admin / HR see the full record. */
const staffSelect = {
    id: true,
    name: true,
    startDate: true,
    endDate: true,
    isArchived: true,
    createdAt: true,
    updatedAt: true,
    hr: {
        select: { id: true, username: true, email: true },
        orderBy: { username: "asc" },
    },
    _count: { select: { interns: true, teams: true } },
} satisfies Prisma.BatchSelect;

/** Interns / GPMs never receive HR contact details or head-counts. */
const publicSelect = {
    id: true,
    name: true,
    startDate: true,
    endDate: true,
} satisfies Prisma.BatchSelect;

type StaffRow = Prisma.BatchGetPayload<{ select: typeof staffSelect }>;
type PublicRow = Prisma.BatchGetPayload<{ select: typeof publicSelect }>;

export type BatchStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

const deriveStatus = (
    batch: { startDate: Date; endDate: Date },
    now: Date,
): BatchStatus => {
    if (now < batch.startDate) return "UPCOMING";
    if (now > batch.endDate) return "COMPLETED";
    return "ONGOING";
};

const baseView = (row: PublicRow, now: Date) => ({
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    /** Calendar days in IST, same format the API accepts. */
    startDay: toIstDay(row.startDate),
    endDay: toIstDay(row.endDate),
    status: deriveStatus(row, now),
});

const toPublicView = (row: PublicRow, now: Date) => baseView(row, now);

const toStaffView = (row: StaffRow, now: Date) => ({
    ...baseView(row, now),
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hr: row.hr,
    counts: { interns: row._count.interns, teams: row._count.teams },
});

export type BatchStaffView = ReturnType<typeof toStaffView>;
export type BatchPublicView = ReturnType<typeof toPublicView>;

const isStaff = (role: Role): boolean =>
    role === Role.ADMIN || role === Role.HR;

const notFound = () => new ApiError(404, "Batch not found.");

/* ------------------------------------------------------------------ */
/* Scope (row-level access, SRS section 4)                             */
/* ------------------------------------------------------------------ */

/** Batches the actor may MANAGE (edit, assign HR, archive). Admin / HR only. */
const manageScope = (actor: Actor): Prisma.BatchWhereInput =>
    actor.role === Role.ADMIN ? {} : { hr: { some: { id: actor.userId } } };

/**
 * Batches the actor may VIEW.
 *  - Admin : everything
 *  - HR    : batches they own
 *  - GPM   : batches containing a team they lead
 *  - Intern: their own batch + batches still open for enrolment (REG-02)
 * Non-admins never see archived batches.
 */
const viewScope = (actor: Actor, now: Date): Prisma.BatchWhereInput => {
    switch (actor.role) {
        case Role.ADMIN:
            return {};

        case Role.HR:
            return { isArchived: false, hr: { some: { id: actor.userId } } };

        case Role.GPM:
            return {
                isArchived: false,
                teams: {
                    some: {
                        OR: [
                            { gpmId: actor.userId },
                            { groupManagers: { some: { id: actor.userId } } },
                        ],
                    },
                },
            };

        case Role.INTERN:
            return {
                isArchived: false,
                OR: [
                    ...(actor.batchId ? [{ id: actor.batchId }] : []),
                    { endDate: { gte: now } },
                ],
            };

        default:
            // Unknown role: deny everything.
            return { id: { in: [] } };
    }
};

const statusWhere = (
    status: NonNullable<ListBatchesQuery["status"]>,
    now: Date,
): Prisma.BatchWhereInput => {
    switch (status) {
        case "upcoming":
            return { startDate: { gt: now } };
        case "ongoing":
            return { startDate: { lte: now }, endDate: { gte: now } };
        case "completed":
            return { endDate: { lt: now } };
    }
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Every id must be an existing, active user with role HR. */
const assertAssignableHr = async (
    tx: Prisma.TransactionClient,
    hrIds: string[],
): Promise<void> => {
    if (hrIds.length === 0) return;

    const users = await tx.user.findMany({
        where: { id: { in: hrIds } },
        select: { id: true, role: true, activeStatus: true },
    });

    const byId = new Map(users.map((user) => [user.id, user]));

    const invalid = hrIds.filter((id) => {
        const user = byId.get(id);
        return !user || user.role !== Role.HR || !user.activeStatus;
    });

    if (invalid.length > 0) {
        throw new ApiError(
            400,
            "Every hrId must belong to an active HR user.",
            invalid.map((id) => ({
                location: "body",
                path: "hrIds",
                message: `${id} is not an active HR user.`,
                code: "invalid_hr",
            })),
        );
    }
};

/**
 * Names are unique (case-insensitive) among non-archived batches.
 * Application-level check; the optional partial unique index in
 * docs/batch-module.md makes it race-proof.
 */
const assertNameAvailable = async (
    tx: Prisma.TransactionClient,
    name: string,
    excludeId?: string,
): Promise<void> => {
    const clash = await tx.batch.findFirst({
        where: {
            isArchived: false,
            name: { equals: name, mode: "insensitive" },
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
    });

    if (clash) {
        throw new ApiError(409, "An active batch with this name already exists.");
    }
};

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export async function listBatches(actor: Actor, query: ListBatchesQuery) {
    const now = new Date();
    const and: Prisma.BatchWhereInput[] = [viewScope(actor, now)];

    // Only Admin can see archived batches (BAT-04); `viewScope` already
    // excludes them for everyone else.
    if (actor.role === Role.ADMIN) {
        if (query.archived === "exclude") and.push({ isArchived: false });
        if (query.archived === "only") and.push({ isArchived: true });
    }

    if (query.search) {
        and.push({ name: { contains: query.search, mode: "insensitive" } });
    }

    if (query.status) {
        and.push(statusWhere(query.status, now));
    }

    const where: Prisma.BatchWhereInput = { AND: and };
    const orderBy: Prisma.BatchOrderByWithRelationInput[] = [
        { [query.sortBy]: query.order },
        { id: "asc" }, // stable pagination when the sort key ties
    ];
    const paging = {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
    };

    const total = await prisma.batch.count({ where });

    const items = isStaff(actor.role)
        ? (
            await prisma.batch.findMany({
                where,
                orderBy,
                ...paging,
                select: staffSelect,
            })
        ).map((row) => toStaffView(row, now))
        : (
            await prisma.batch.findMany({
                where,
                orderBy,
                ...paging,
                select: publicSelect,
            })
        ).map((row) => toPublicView(row, now));

    return {
        items,
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
}

export async function getBatch(actor: Actor, batchId: string) {
    const now = new Date();
    const where: Prisma.BatchWhereInput = {
        AND: [{ id: batchId }, viewScope(actor, now)],
    };

    if (isStaff(actor.role)) {
        const row = await prisma.batch.findFirst({ where, select: staffSelect });
        if (!row) throw notFound();
        return toStaffView(row, now);
    }

    const row = await prisma.batch.findFirst({ where, select: publicSelect });
    if (!row) throw notFound();
    return toPublicView(row, now);
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

/**
 * BAT-01 / BAT-02 / CHAT-03.
 * HR: becomes the owner. Admin: may pass `hrIds`, or leave the batch unowned.
 * The batch chat conversation is created in the same transaction.
 */
export async function createBatch(actor: Actor, input: CreateBatchInput) {
    let hrIds: string[];

    if (actor.role === Role.HR) {
        if (input.hrIds && input.hrIds.length > 0) {
            throw new ApiError(
                403,
                "Only an Admin can assign HR owners. You become the owner automatically.",
            );
        }
        hrIds = [actor.userId];
    } else {
        hrIds = input.hrIds ?? [];
    }

    const startDate = istStartOfDay(input.startDate);
    const endDate = istEndOfDay(input.endDate);

    return prisma.$transaction(async (tx) => {
        // An HR caller is the owner and was already verified as an active HR
        // by `authenticate`; only Admin-supplied ids need checking.
        if (actor.role !== Role.HR) {
            await assertAssignableHr(tx, hrIds);
        }
        await assertNameAvailable(tx, input.name);

        const created = await tx.batch.create({
            data: {
                name: input.name,
                startDate,
                endDate,
                hr: { connect: hrIds.map((id) => ({ id })) },
                conversation: { create: {} }, // CHAT-03
            },
            select: staffSelect,
        });

        await recordAudit(tx, {
            actorId: actor.userId,
            action: BATCH_AUDIT.CREATE,
            entityType: BATCH_ENTITY,
            entityId: created.id,
            newValue: {
                name: created.name,
                startDate: input.startDate,
                endDate: input.endDate,
                hrIds,
            },
            ipAddress: actor.ipAddress,
        });

        return toStaffView(created, new Date());
    });
}

/**
 * BAT-03 / BAT-04. Admin: any batch. HR: only batches they own.
 *  - archived batches are read-only until restored
 *  - the start date is frozen once the batch has started (AUTH-05 depends on it)
 */
export async function updateBatch(
    actor: Actor,
    batchId: string,
    input: UpdateBatchInput,
) {
    return prisma.$transaction(async (tx) => {
        const now = new Date();

        const existing = await tx.batch.findFirst({
            where: { AND: [{ id: batchId }, manageScope(actor)] },
            select: staffSelect,
        });

        if (!existing) throw notFound();

        if (existing.isArchived) {
            throw new ApiError(
                409,
                "Archived batches cannot be edited. Restore the batch first.",
            );
        }

        const current = {
            name: existing.name,
            startDate: toIstDay(existing.startDate),
            endDate: toIstDay(existing.endDate),
        };
        const next = {
            name: input.name ?? current.name,
            startDate: input.startDate ?? current.startDate,
            endDate: input.endDate ?? current.endDate,
        };

        const changed = (Object.keys(next) as Array<keyof typeof next>).filter(
            (key) => next[key] !== current[key],
        );

        // Nothing to write: skip the update and the audit noise.
        if (changed.length === 0) return toStaffView(existing, now);

        const range = checkBatchDateRange(next.startDate, next.endDate);
        if (!range.ok) {
            throw new ApiError(400, "Validation failed.", [
                {
                    location: "body",
                    path: "endDate",
                    message: range.message,
                    code: "custom",
                },
            ]);
        }

        if (changed.includes("startDate") && existing.startDate <= now) {
            throw new ApiError(
                409,
                "The start date cannot be changed after the batch has started.",
            );
        }

        if (changed.includes("name")) {
            await assertNameAvailable(tx, next.name, batchId);
        }

        const data: Prisma.BatchUpdateInput = {};
        if (changed.includes("name")) data.name = next.name;
        if (changed.includes("startDate")) {
            data.startDate = istStartOfDay(next.startDate);
        }
        if (changed.includes("endDate")) {
            data.endDate = istEndOfDay(next.endDate);
        }

        const updated = await tx.batch.update({
            where: { id: batchId },
            data,
            select: staffSelect,
        });

        await recordAudit(tx, {
            actorId: actor.userId,
            action: BATCH_AUDIT.UPDATE,
            entityType: BATCH_ENTITY,
            entityId: batchId,
            oldValue: Object.fromEntries(changed.map((k) => [k, current[k]])),
            newValue: Object.fromEntries(changed.map((k) => [k, next[k]])),
            ipAddress: actor.ipAddress,
        });

        return toStaffView(updated, now);
    });
}

/** Admin only. Replaces the full set of HR owners (BAT-02, matrix: "Assign HR"). */
export async function setBatchHr(
    actor: Actor,
    batchId: string,
    hrIds: string[],
) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.batch.findFirst({
            where: { AND: [{ id: batchId }, manageScope(actor)] },
            select: staffSelect,
        });

        if (!existing) throw notFound();

        if (existing.isArchived) {
            throw new ApiError(
                409,
                "Archived batches cannot be edited. Restore the batch first.",
            );
        }

        await assertAssignableHr(tx, hrIds);

        const updated = await tx.batch.update({
            where: { id: batchId },
            data: { hr: { set: hrIds.map((id) => ({ id })) } },
            select: staffSelect,
        });

        await recordAudit(tx, {
            actorId: actor.userId,
            action: BATCH_AUDIT.ASSIGN_HR,
            entityType: BATCH_ENTITY,
            entityId: batchId,
            oldValue: { hrIds: existing.hr.map((hr) => hr.id) },
            newValue: { hrIds },
            ipAddress: actor.ipAddress,
        });

        return toStaffView(updated, new Date());
    });
}

/**
 * BAT-04: Admin only. Soft delete (`isArchived`), never a hard delete, so chat,
 * attendance and logs stay intact (SRS 5.4).
 */
export async function archiveBatch(actor: Actor, batchId: string) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.batch.findUnique({
            where: { id: batchId },
            select: { id: true, isArchived: true },
        });

        if (!existing) throw notFound();

        if (existing.isArchived) {
            throw new ApiError(409, "Batch is already archived.");
        }

        const updated = await tx.batch.update({
            where: { id: batchId },
            data: { isArchived: true },
            select: staffSelect,
        });

        await recordAudit(tx, {
            actorId: actor.userId,
            action: BATCH_AUDIT.ARCHIVE,
            entityType: BATCH_ENTITY,
            entityId: batchId,
            oldValue: { isArchived: false },
            newValue: { isArchived: true },
            ipAddress: actor.ipAddress,
        });

        return toStaffView(updated, new Date());
    });
}

/** Admin only. Reverses `archiveBatch`. */
export async function restoreBatch(actor: Actor, batchId: string) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.batch.findUnique({
            where: { id: batchId },
            select: { id: true, name: true, isArchived: true },
        });

        if (!existing) throw notFound();

        if (!existing.isArchived) {
            throw new ApiError(409, "Batch is not archived.");
        }

        // Another active batch may have taken the name in the meantime.
        await assertNameAvailable(tx, existing.name, batchId);

        const updated = await tx.batch.update({
            where: { id: batchId },
            data: { isArchived: false },
            select: staffSelect,
        });

        await recordAudit(tx, {
            actorId: actor.userId,
            action: BATCH_AUDIT.RESTORE,
            entityType: BATCH_ENTITY,
            entityId: batchId,
            oldValue: { isArchived: true },
            newValue: { isArchived: false },
            ipAddress: actor.ipAddress,
        });

        return toStaffView(updated, new Date());
    });
}