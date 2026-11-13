export type UserRole = "INTERN" | "HR" | "GPM" | "ADMIN";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import type {
    AssignGroupManagersInput,
    CreateTeamInput,
    ListTeamsQuery,
    ManageTeamInternsInput,
    UpdateTeamInput,
} from "../validators/team.validator.js";

const userSafeSelect = {
    id: true,
    username: true,
    email: true,
    role: true,
    photoUrl: true,
    activeStatus: true,
    verificationStatus: true,
};

const teamInclude = {
    batch: {
        select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isArchived: true,
        },
    },
    gpm: {
        select: userSafeSelect,
    },
    groupManagers: {
        select: userSafeSelect,
    },
    interns: {
        select: userSafeSelect,
    },
    _count: {
        select: {
            interns: true,
            tasks: true,
        },
    },
};

interface RequesterContext {
    id: string;
    role: UserRole;
}

/**
 * Validates that every user ID exists, is active, and has the GPM role.
 */
async function validateGroupManagerIds(ids: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > 2) {
        throw new ApiError(400, "A team can have at most 2 Group Managers.");
    }

    const managers = await prisma.user.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, role: true, activeStatus: true, username: true },
    });

    if (managers.length !== uniqueIds.length) {
        throw new ApiError(404, "One or more selected Group Managers were not found.");
    }

    for (const mgr of managers) {
        if (mgr.role !== "GPM") {
            throw new ApiError(
                400,
                `User "${mgr.username}" does not have the Group Manager (GPM) role.`,
            );
        }
        if (!mgr.activeStatus) {
            throw new ApiError(
                400,
                `Group Manager "${mgr.username}" is currently deactivated.`,
            );
        }
    }

    return uniqueIds;
}

/**
 * Validates that every intern ID exists, has role INTERN, and belongs to the target batch.
 */
async function validateInternIdsForBatch(
    ids: string[],
    batchId: string,
): Promise<string[]> {
    const uniqueIds = [...new Set(ids)];

    const interns = await prisma.user.findMany({
        where: { id: { in: uniqueIds } },
        select: {
            id: true,
            role: true,
            batchId: true,
            activeStatus: true,
            username: true,
        },
    });

    if (interns.length !== uniqueIds.length) {
        throw new ApiError(404, "One or more selected interns were not found.");
    }

    for (const intern of interns) {
        if (intern.role !== "INTERN") {
            throw new ApiError(
                400,
                `User "${intern.username}" is not an Intern.`,
            );
        }
        if (!intern.activeStatus) {
            throw new ApiError(
                400,
                `Intern "${intern.username}" is currently deactivated.`,
            );
        }
        if (intern.batchId && intern.batchId !== batchId) {
            throw new ApiError(
                400,
                `Intern "${intern.username}" is assigned to a different batch.`,
            );
        }
    }

    return uniqueIds;
}

/**
 * Ensures a GPM can only modify teams they manage, while HR/ADMIN have full access.
 */
function assertCanManageTeam(
    team: { gpmId: string | null; groupManagers: Array<{ id: string }> },
    requester: RequesterContext,
): void {
    if (requester.role === "ADMIN" || requester.role === "HR") return;

    if (requester.role === "GPM") {
        const isLead = team.gpmId === requester.id;
        const isAssignedManager = team.groupManagers.some(
            (gm) => gm.id === requester.id,
        );
        if (isLead || isAssignedManager) return;
    }

    throw new ApiError(403, "You do not have permission to modify this team.");
}

// ==========================================
// CREATE TEAM (HR, ADMIN, or GPM)
// ==========================================
export const createTeam = async (
    input: CreateTeamInput,
    requester: RequesterContext,
) => {
    const batch = await prisma.batch.findUnique({
        where: { id: input.batchId },
        select: { id: true, name: true, isArchived: true },
    });

    if (!batch) {
        throw new ApiError(404, "Batch not found.");
    }

    if (batch.isArchived) {
        throw new ApiError(400, "Cannot create a team inside an archived batch.");
    }

    // Prevent duplicate team name inside the same batch (@@unique([batchId, name]))
    const existingTeam = await prisma.team.findUnique({
        where: {
            batchId_name: {
                batchId: input.batchId,
                name: input.name,
            },
        },
    });

    if (existingTeam) {
        throw new ApiError(
            409,
            `A team named "${input.name}" already exists in batch "${batch.name}".`,
        );
    }

    // Resolve Group Managers (1 or 2)
    let rawManagerIds: string[] = input.groupManagerIds ? [...input.groupManagerIds] : [];
    let resolvedGpmId: string | null = input.gpmId ?? null;

    // If a GPM creates the team without specifying a lead, auto-assign them
    if (requester.role === "GPM" && !resolvedGpmId && rawManagerIds.length === 0) {
        resolvedGpmId = requester.id;
    }

    if (resolvedGpmId && !rawManagerIds.includes(resolvedGpmId)) {
        rawManagerIds.unshift(resolvedGpmId);
    }

    const validManagerIds =
        rawManagerIds.length > 0
            ? await validateGroupManagerIds(rawManagerIds)
            : [];

    if (!resolvedGpmId && validManagerIds.length > 0) {
        resolvedGpmId = validManagerIds[0];
    }

    // Resolve Interns if provided at creation
    const validInternIds =
        input.internIds && input.internIds.length > 0
            ? await validateInternIdsForBatch(input.internIds, input.batchId)
            : [];

    return prisma.$transaction(async (tx) => {
        // Ensure assigned interns are linked to this batch if their batchId was null
        if (validInternIds.length > 0) {
            await tx.user.updateMany({
                where: {
                    id: { in: validInternIds },
                    batchId: null,
                },
                data: { batchId: input.batchId },
            });
        }

        return tx.team.create({
            data: {
                name: input.name,
                batchId: input.batchId,
                gpmId: resolvedGpmId,
                groupManagers:
                    validManagerIds.length > 0
                        ? { connect: validManagerIds.map((id) => ({ id })) }
                        : undefined,
                interns:
                    validInternIds.length > 0
                        ? { connect: validInternIds.map((id) => ({ id })) }
                        : undefined,
            },
            include: teamInclude,
        });
    });
};

// ==========================================
// GET ALL TEAMS (FILTERED & PAGINATED)
// ==========================================
export const getAllTeams = async (
    query: ListTeamsQuery,
    requester: RequesterContext,
) => {
    const { batchId, gpmId, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (batchId) where.batchId = batchId;

    if (gpmId) {
        where.OR = [
            { gpmId },
            { groupManagers: { some: { id: gpmId } } },
        ];
    }

    // Interns only see teams they belong to
    if (requester.role === "INTERN") {
        where.interns = { some: { id: requester.id } };
    }

    if (search) {
        where.name = { contains: search, mode: "insensitive" };
    }

    const [teams, total] = await Promise.all([
        prisma.team.findMany({
            where,
            include: teamInclude,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.team.count({ where }),
    ]);

    return {
        teams,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// ==========================================
// GET TEAM BY ID
// ==========================================
export const getTeamById = async (
    teamId: string,
    requester: RequesterContext,
) => {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: teamInclude,
    });

    if (!team) {
        throw new ApiError(404, "Team not found.");
    }

    if (requester.role === "INTERN") {
        const isMember = team.interns.some((intern) => intern.id === requester.id);
        if (!isMember) {
            throw new ApiError(403, "You are not a member of this team.");
        }
    }

    return team;
};

// ==========================================
// UPDATE TEAM (Name / Lead GPM / Group Managers)
// ==========================================
export const updateTeam = async (
    teamId: string,
    input: UpdateTeamInput,
    requester: RequesterContext,
) => {
    const existing = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            batch: { select: { name: true, isArchived: true } },
            groupManagers: { select: { id: true } },
        },
    });

    if (!existing) {
        throw new ApiError(404, "Team not found.");
    }

    if (existing.batch.isArchived) {
        throw new ApiError(400, "Cannot modify a team inside an archived batch.");
    }

    assertCanManageTeam(existing, requester);

    // Check duplicate name if renaming
    if (input.name && input.name !== existing.name) {
        const duplicate = await prisma.team.findUnique({
            where: {
                batchId_name: {
                    batchId: existing.batchId,
                    name: input.name,
                },
            },
        });
        if (duplicate) {
            throw new ApiError(
                409,
                `A team named "${input.name}" already exists in batch "${existing.batch.name}".`,
            );
        }
    }

    // Only HR/ADMIN can reassign Group Managers
    if (
        (input.gpmId !== undefined || input.groupManagerIds !== undefined) &&
        requester.role !== "HR" &&
        requester.role !== "ADMIN"
    ) {
        throw new ApiError(
            403,
            "Only HR or Admin can assign or change Group Managers.",
        );
    }

    let validManagerIds: string[] | undefined;
    let resolvedGpmId: string | null | undefined = input.gpmId;

    if (input.groupManagerIds !== undefined || input.gpmId !== undefined) {
        const baseIds =
            input.groupManagerIds ??
            existing.groupManagers.map((gm) => gm.id);

        const combined = [...baseIds];
        if (resolvedGpmId && !combined.includes(resolvedGpmId)) {
            combined.unshift(resolvedGpmId);
        }

        validManagerIds =
            combined.length > 0 ? await validateGroupManagerIds(combined) : [];

        if (resolvedGpmId === undefined) {
            resolvedGpmId = validManagerIds[0] ?? null;
        }
    }

    return prisma.team.update({
        where: { id: teamId },
        data: {
            ...(input.name ? { name: input.name } : {}),
            ...(resolvedGpmId !== undefined ? { gpmId: resolvedGpmId } : {}),
            ...(validManagerIds !== undefined
                ? {
                      groupManagers: {
                          set: validManagerIds.map((id) => ({ id })),
                      },
                  }
                : {}),
        },
        include: teamInclude,
    });
};

// ==========================================
// ASSIGN GROUP MANAGERS (HR / ADMIN — 1 or 2 GPMs)
// ==========================================
export const assignGroupManagers = async (
    teamId: string,
    input: AssignGroupManagersInput,
) => {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { batch: { select: { isArchived: true } } },
    });

    if (!team) {
        throw new ApiError(404, "Team not found.");
    }

    if (team.batch.isArchived) {
        throw new ApiError(400, "Cannot modify a team inside an archived batch.");
    }

    const combined = [...input.groupManagerIds];
    if (input.gpmId && !combined.includes(input.gpmId)) {
        combined.unshift(input.gpmId);
    }

    const validManagerIds = await validateGroupManagerIds(combined);
    const primaryGpmId = input.gpmId ?? validManagerIds[0] ?? null;

    return prisma.team.update({
        where: { id: teamId },
        data: {
            gpmId: primaryGpmId,
            groupManagers: {
                set: validManagerIds.map((id) => ({ id })),
            },
        },
        include: teamInclude,
    });
};

// ==========================================
// ASSIGN INTERNS TO TEAM
// ==========================================
export const addInternsToTeam = async (
    teamId: string,
    input: ManageTeamInternsInput,
    requester: RequesterContext,
) => {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            batch: { select: { isArchived: true } },
            groupManagers: { select: { id: true } },
        },
    });

    if (!team) {
        throw new ApiError(404, "Team not found.");
    }

    if (team.batch.isArchived) {
        throw new ApiError(400, "Cannot modify a team inside an archived batch.");
    }

    assertCanManageTeam(team, requester);

    const validInternIds = await validateInternIdsForBatch(
        input.internIds,
        team.batchId,
    );

    return prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
            where: {
                id: { in: validInternIds },
                batchId: null,
            },
            data: { batchId: team.batchId },
        });

        return tx.team.update({
            where: { id: teamId },
            data: {
                interns: {
                    connect: validInternIds.map((id) => ({ id })),
                },
            },
            include: teamInclude,
        });
    });
};

// ==========================================
// REMOVE INTERNS FROM TEAM
// ==========================================
export const removeInternsFromTeam = async (
    teamId: string,
    input: ManageTeamInternsInput,
    requester: RequesterContext,
) => {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            batch: { select: { isArchived: true } },
            groupManagers: { select: { id: true } },
        },
    });

    if (!team) {
        throw new ApiError(404, "Team not found.");
    }

    if (team.batch.isArchived) {
        throw new ApiError(400, "Cannot modify a team inside an archived batch.");
    }

    assertCanManageTeam(team, requester);

    return prisma.team.update({
        where: { id: teamId },
        data: {
            interns: {
                disconnect: input.internIds.map((id) => ({ id })),
            },
        },
        include: teamInclude,
    });
};

// ==========================================
// DELETE TEAM
// ==========================================
export const deleteTeam = async (
    teamId: string,
    requester: RequesterContext,
) => {
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            groupManagers: { select: { id: true } },
        },
    });

    if (!team) {
        throw new ApiError(404, "Team not found.");
    }

    assertCanManageTeam(team, requester);

    await prisma.team.delete({
        where: { id: teamId },
    });

    return { id: teamId };
};