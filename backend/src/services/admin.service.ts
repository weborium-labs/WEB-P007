import {
    AttendanceStatus,
    LeaveStatus,
    Prisma,
    Role,
    TaskStatus,
    TicketStatus,
    type User,
} from "../generated/prisma/client.js";
import {
    ADMIN_AUDIT,
    ADMIN_USER_ENTITY,
} from "../constants/admin.constants.js";
import type { AuthContext } from "../types/express.js";
import type {
    ListUsersQuery,
    UpdateUserInput,
} from "../validators/admin.validator.js";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../lib/prisma.js";
import { recordAudit } from "./audit.service.js";

/**
 * Admin user-management services (`/admin`).
 *
 * Response rules (same as `user.service`):
 *  - never return password hashes, OTP material or `googleId` — provider
 *    status is derived (`password != null` / `googleId != null`);
 *  - every list projection is a `select` allow-list, so a new sensitive column
 *    added to `User` cannot leak by default;
 *  - every write is audited in the same transaction as the change.
 */

export type Actor = AuthContext & { ipAddress?: string };

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Record with every key pre-set to 0 so the UI never branches on missing keys. */
const zeroFilled = <T extends string>(keys: readonly T[]): Record<T, number> =>
    Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;

/* ------------------------------------------------------------------ */
/* Directory list (GET /admin/users)                                   */
/* ------------------------------------------------------------------ */

/** Allow-list projection: never selects password, otpHash, googleId or otp*. */
const userListSelect = {
    id: true,
    username: true,
    email: true,
    role: true,
    activeStatus: true,
    photoUrl: true,
    verificationStatus: true,
    isEmailVerified: true,
    score: true,
    lastLoginAt: true,
    lastActivityAt: true,
    deactivatedAt: true,
    createdAt: true,
    batch: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

export interface AdminUserListItem {
    id: string;
    username: string;
    email: string;
    role: Role;
    activeStatus: boolean;
    photoUrl: string | null;
    verificationStatus: User["verificationStatus"];
    isEmailVerified: boolean;
    score: number;
    batch: { id: string; name: string } | null;
    lastLoginAt: Date | null;
    lastActivityAt: Date | null;
    deactivatedAt: Date | null;
    createdAt: Date;
}

const toListItem = (row: UserListRow): AdminUserListItem => ({
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    activeStatus: row.activeStatus,
    photoUrl: row.photoUrl,
    verificationStatus: row.verificationStatus,
    isEmailVerified: row.isEmailVerified,
    score: row.score,
    batch: row.batch,
    lastLoginAt: row.lastLoginAt,
    lastActivityAt: row.lastActivityAt,
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
});

export const listUsers = async (
    query: ListUsersQuery,
): Promise<{ items: AdminUserListItem[]; meta: PageMeta }> => {
    const and: Prisma.UserWhereInput[] = [];

    if (query.search) {
        // Username and email are both unique, case-insensitive matches here.
        and.push({
            OR: [
                { username: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
            ],
        });
    }

    if (query.role) and.push({ role: query.role });

    if (query.status === "active") and.push({ activeStatus: true });
    if (query.status === "inactive") and.push({ activeStatus: false });

    const where: Prisma.UserWhereInput = { AND: and };
    const orderBy: Prisma.UserOrderByWithRelationInput[] = [
        { [query.sortBy]: query.order },
        { id: "asc" }, // stable pagination when the sort key ties
    ];
    const paging = {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
    };

    const [total, rows] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            orderBy,
            ...paging,
            select: userListSelect,
        }),
    ]);

    return {
        items: rows.map(toListItem),
        meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};

export interface PageMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/* ------------------------------------------------------------------ */
/* Dashboard overview (GET /admin/stats)                               */
/* ------------------------------------------------------------------ */

export interface AdminDashboardStats {
    totals: {
        users: number;
        active: number;
        inactive: number;
        pendingVerification: number;
        /** Accounts created in the last 30 days. */
        recentSignups: number;
    };
    byRole: Record<Role, number>;
    recentUsers: AdminUserListItem[];
}

const RECENT_SIGNUP_WINDOW_DAYS = 30;

export const getDashboardStats = async (): Promise<AdminDashboardStats> => {
    const since = new Date();
    since.setDate(since.getDate() - RECENT_SIGNUP_WINDOW_DAYS);

    const [users, active, pendingVerification, recentSignups, roleRows, recentRows] =
        await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { activeStatus: true } }),
            prisma.user.count({ where: { verificationStatus: "PENDING" } }),
            prisma.user.count({ where: { createdAt: { gte: since } } }),
            prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
            prisma.user.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: userListSelect,
            }),
        ]);

    const byRole = zeroFilled<Role>(Object.values(Role));
    for (const row of roleRows) {
        byRole[row.role] = row._count._all;
    }

    return {
        totals: {
            users,
            active,
            inactive: users - active,
            pendingVerification,
            recentSignups,
        },
        byRole,
        recentUsers: recentRows.map(toListItem),
    };
};

/* ------------------------------------------------------------------ */
/* Per-user stats (GET /admin/users/:userId)                           */
/* ------------------------------------------------------------------ */

const statsSelect = {
    id: true,
    username: true,
    email: true,
    role: true,
    activeStatus: true,
    photoUrl: true,
    phone: true,
    dob: true,
    universityName: true,
    authType: true,
    score: true,
    verificationStatus: true,
    isEmailVerified: true,
    lastLoginAt: true,
    lastActivityAt: true,
    deactivatedAt: true,
    createdAt: true,
    updatedAt: true,
    // Derived as booleans in the response; the raw values never leave.
    password: true,
    googleId: true,
    batch: {
        select: { id: true, name: true, startDate: true, endDate: true },
    },
    documents: {
        select: {
            aadharStatus: true,
            pancardStatus: true,
            sscStatus: true,
            hscStatus: true,
            rejectionReason: true,
            reviewedAt: true,
            createdAt: true,
        },
    },
    _count: {
        select: {
            taskAssignments: true,
            tasksAssigned: true,
            attendances: true,
            leaves: true,
            ticketsCreated: true,
            ticketsResolved: true,
            messagesSent: true,
            managedBatches: true,
        },
    },
} satisfies Prisma.UserSelect;

type StatsRow = Prisma.UserGetPayload<{ select: typeof statsSelect }>;

const teamSelect = {
    id: true,
    name: true,
    batch: { select: { name: true } },
    _count: { select: { interns: true, groupManagers: true } },
} satisfies Prisma.TeamSelect;

type TeamRow = Prisma.TeamGetPayload<{ select: typeof teamSelect }>;

export interface AdminUserStats {
    profile: {
        id: string;
        username: string;
        email: string;
        role: Role;
        activeStatus: boolean;
        photoUrl: string | null;
        phone: string | null;
        dob: string | null;
        universityName: string | null;
        authType: User["authType"];
        score: number;
        verificationStatus: User["verificationStatus"];
        isEmailVerified: boolean;
        providers: { password: boolean; google: boolean };
        batch: { id: string; name: string; startDate: Date; endDate: Date } | null;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
        lastActivityAt: Date | null;
        deactivatedAt: Date | null;
    };
    tasks: {
        /** Assignments handed to this user. */
        assigned: number;
        /** Tasks this user created for others (staff only, 0 for interns). */
        created: number;
        byStatus: Record<TaskStatus, number>;
        evaluated: number;
        averageScore: number | null;
    };
    attendance: {
        total: number;
        byStatus: Record<AttendanceStatus, number>;
        /** PRESENT share of recorded days, 0–100, null when nothing recorded. */
        presentRate: number | null;
    };
    leaves: {
        total: number;
        byStatus: Record<LeaveStatus, number>;
    };
    tickets: {
        created: { total: number; byStatus: Record<TicketStatus, number> };
        resolved: number;
    };
    documents: {
        submitted: number;
        approved: number;
        pending: number;
        rejected: number;
        rejectionReason: string | null;
        reviewedAt: Date | null;
    } | null;
    membership: {
        internTeams: Array<{ id: string; name: string; batchName: string }>;
        managedTeams: Array<{ id: string; name: string; batchName: string }>;
        managedBatches: number;
        messagesSent: number;
    };
}

const toTeamView = (row: TeamRow) => ({
    id: row.id,
    name: row.name,
    batchName: row.batch.name,
});

const DOCUMENT_STATUSES = [
    { key: "aadharStatus" as const },
    { key: "pancardStatus" as const },
    { key: "sscStatus" as const },
    { key: "hscStatus" as const },
];

export const getUserStats = async (userId: string): Promise<AdminUserStats> => {
    const [
        user,
        taskRows,
        attendanceRows,
        leaveRows,
        ticketRows,
        scoreAgg,
        internTeams,
        managedTeams,
    ] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: statsSelect }),
        prisma.taskAssignment.groupBy({
            by: ["status"],
            where: { internId: userId },
            _count: { _all: true },
        }),
        prisma.attendance.groupBy({
            by: ["status"],
            where: { userId },
            _count: { _all: true },
        }),
        prisma.leave.groupBy({
            by: ["status"],
            where: { userId },
            _count: { _all: true },
        }),
        prisma.ticket.groupBy({
            by: ["status"],
            where: { userId },
            _count: { _all: true },
        }),
        // Average score + evaluated count only over scored assignments.
        prisma.taskAssignment.aggregate({
            where: { internId: userId, score: { not: null } },
            _avg: { score: true },
            _count: { score: true },
        }),
        prisma.team.findMany({
            where: { interns: { some: { id: userId } } },
            orderBy: { name: "asc" },
            select: teamSelect,
        }),
        prisma.team.findMany({
            where: {
                OR: [
                    { groupManagers: { some: { id: userId } } },
                    { gpmId: userId },
                ],
            },
            orderBy: { name: "asc" },
            select: teamSelect,
        }),
    ]);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    return buildStats(user, {
        taskRows,
        attendanceRows,
        leaveRows,
        ticketRows,
        internTeams,
        managedTeams,
        averageScore: scoreAgg._avg.score,
        evaluated: scoreAgg._count.score,
    });
};

interface StatsParts {
    taskRows: Array<{ status: TaskStatus; _count: { _all: number } }>;
    attendanceRows: Array<{ status: AttendanceStatus; _count: { _all: number } }>;
    leaveRows: Array<{ status: LeaveStatus; _count: { _all: number } }>;
    ticketRows: Array<{ status: TicketStatus; _count: { _all: number } }>;
    internTeams: TeamRow[];
    managedTeams: TeamRow[];
    averageScore: number | null;
    evaluated: number;
}

const buildStats = (user: StatsRow, parts: StatsParts): AdminUserStats => {
    const byStatus = zeroFilled<TaskStatus>(Object.values(TaskStatus));
    let assigned = 0;
    for (const row of parts.taskRows) {
        byStatus[row.status] = row._count._all;
        assigned += row._count._all;
    }

    const attendanceByStatus = zeroFilled<AttendanceStatus>(
        Object.values(AttendanceStatus),
    );
    let attendanceTotal = 0;
    for (const row of parts.attendanceRows) {
        attendanceByStatus[row.status] = row._count._all;
        attendanceTotal += row._count._all;
    }

    const leaveByStatus = zeroFilled<LeaveStatus>(Object.values(LeaveStatus));
    let leaveTotal = 0;
    for (const row of parts.leaveRows) {
        leaveByStatus[row.status] = row._count._all;
        leaveTotal += row._count._all;
    }

    const ticketByStatus = zeroFilled<TicketStatus>(Object.values(TicketStatus));
    let ticketsCreated = 0;
    for (const row of parts.ticketRows) {
        ticketByStatus[row.status] = row._count._all;
        ticketsCreated += row._count._all;
    }

    const presentRate =
        attendanceTotal === 0
            ? null
            : Math.round(
                  (attendanceByStatus.PRESENT / attendanceTotal) * 1000,
              ) / 10;

    const documents = user.documents
        ? buildDocumentStats(user.documents)
        : null;

    return {
        profile: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            activeStatus: user.activeStatus,
            photoUrl: user.photoUrl,
            phone: user.phone,
            dob: user.dob,
            universityName: user.universityName,
            authType: user.authType,
            score: user.score,
            verificationStatus: user.verificationStatus,
            isEmailVerified: user.isEmailVerified,
            providers: {
                password: user.password !== null,
                google: user.googleId !== null,
            },
            batch: user.batch,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt,
            lastActivityAt: user.lastActivityAt,
            deactivatedAt: user.deactivatedAt,
        },
        tasks: {
            assigned,
            created: user._count.tasksAssigned,
            byStatus,
            evaluated: parts.evaluated,
            averageScore:
                parts.averageScore === null
                    ? null
                    : Math.round(parts.averageScore * 10) / 10,
        },
        attendance: {
            total: attendanceTotal,
            byStatus: attendanceByStatus,
            presentRate,
        },
        leaves: { total: leaveTotal, byStatus: leaveByStatus },
        tickets: {
            created: { total: ticketsCreated, byStatus: ticketByStatus },
            resolved: user._count.ticketsResolved,
        },
        documents,
        membership: {
            internTeams: parts.internTeams.map(toTeamView),
            managedTeams: parts.managedTeams.map(toTeamView),
            managedBatches: user._count.managedBatches,
            messagesSent: user._count.messagesSent,
        },
    };
};

const buildDocumentStats = (
    docs: NonNullable<StatsRow["documents"]>,
): NonNullable<AdminUserStats["documents"]> => {
    const statuses = DOCUMENT_STATUSES.map((field) => docs[field.key]);

    return {
        submitted: statuses.filter(
            (status) => status !== "NOT_SUBMITTED",
        ).length,
        approved: statuses.filter((status) => status === "APPROVED").length,
        pending: statuses.filter((status) => status === "PENDING").length,
        rejected: statuses.filter((status) => status === "REJECTED").length,
        rejectionReason: docs.rejectionReason,
        reviewedAt: docs.reviewedAt,
    };
};

/* ------------------------------------------------------------------ */
/* Commands (PATCH /admin/users/:userId)                               */
/* ------------------------------------------------------------------ */

const adminGuardError = new ApiError(
    403,
    "You cannot change your own role or activation status.",
);

/**
 * Updates a user's role and/or activation status (Admin only).
 *
 * Guards (all server-side, never delegated to the client):
 *  - an admin can never edit their own record (lockout protection);
 *  - the last *active* ADMIN can never be demoted or deactivated;
 *  - a no-op PATCH writes nothing and records no audit entry.
 *
 * Deactivating stamps `deactivatedAt`; reactivating clears it, so the column
 * always reflects the current state.
 */
export const updateUser = async (
    actor: Actor,
    userId: string,
    input: UpdateUserInput,
): Promise<AdminUserListItem> => {
    if (actor.userId === userId) {
        throw adminGuardError;
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            activeStatus: true,
            deactivatedAt: true,
        },
    });

    if (!target) {
        throw new ApiError(404, "User not found.");
    }

    const nextRole = input.role ?? target.role;
    const nextActive = input.activeStatus ?? target.activeStatus;

    // Last-admin protection: only relevant when the target is an ADMIN today
    // and either leaves the role or stops being active.
    const losesAdmin = target.role === Role.ADMIN && nextRole !== Role.ADMIN;
    const losesActivation =
        target.activeStatus && nextActive === false && target.role === Role.ADMIN;

    if (losesAdmin || losesActivation) {
        const activeAdmins = await prisma.user.count({
            where: { role: Role.ADMIN, activeStatus: true },
        });

        if (activeAdmins <= 1) {
            throw new ApiError(
                409,
                "At least one active admin must remain.",
                [{ code: "LAST_ADMIN" }],
            );
        }
    }

    const data: Prisma.UserUpdateInput = {};
    const oldValue: { role?: Role; activeStatus?: boolean } = {};
    const newValue: { role?: Role; activeStatus?: boolean } = {};

    if (input.role !== undefined && input.role !== target.role) {
        data.role = input.role;
        oldValue.role = target.role;
        newValue.role = input.role;
    }

    if (
        input.activeStatus !== undefined &&
        input.activeStatus !== target.activeStatus
    ) {
        data.activeStatus = input.activeStatus;
        data.deactivatedAt = input.activeStatus ? null : new Date();
        oldValue.activeStatus = target.activeStatus;
        newValue.activeStatus = input.activeStatus;
    }

    // Nothing changed: return the current state without writing or auditing.
    if (Object.keys(data).length === 0) {
        const current = await prisma.user.findUnique({
            where: { id: userId },
            select: userListSelect,
        });
        if (!current) throw new ApiError(404, "User not found.");
        return toListItem(current);
    }

    const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.user.update({
            where: { id: userId },
            data,
            select: userListSelect,
        });

        await recordAudit(tx, {
            actorId: actor.userId,
            action: ADMIN_AUDIT.UPDATE_USER,
            entityType: ADMIN_USER_ENTITY,
            entityId: userId,
            oldValue,
            newValue,
            ipAddress: actor.ipAddress,
        });

        return row;
    });

    return toListItem(updated);
};
