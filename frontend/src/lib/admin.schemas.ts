import { z } from "zod";

/**
 * Zod contracts for the admin surface (`/admin/*`).
 *
 * Every response is parsed before it reaches the cache, so a malformed or
 * unexpected payload fails loudly in `queryFn` instead of rendering
 * `undefined` deep inside a component. The shapes mirror
 * `backend/src/validators/admin.validator.ts` and the `admin.service`
 * projections one-to-one.
 */

/* ------------------------------------------------------------------ */
/* Enums (mirrored from the Prisma schema)                             */
/* ------------------------------------------------------------------ */

export const USER_ROLES = ["INTERN", "HR", "GPM", "ADMIN"] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const VERIFICATION_STATUSES = [
    "NOT_SUBMITTED",
    "PENDING",
    "APPROVED",
    "REJECTED",
] as const;
export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const AUTH_TYPES = ["UNP", "GOOGLE"] as const;
export const authTypeSchema = z.enum(AUTH_TYPES);

export const USER_STATUS_FILTERS = ["all", "active", "inactive"] as const;
export const userStatusFilterSchema = z.enum(USER_STATUS_FILTERS);
export type UserStatusFilter = z.infer<typeof userStatusFilterSchema>;

export const USER_SORT_FIELDS = [
    "createdAt",
    "username",
    "lastLoginAt",
    "role",
] as const;
export const userSortFieldSchema = z.enum(USER_SORT_FIELDS);
export type UserSortField = z.infer<typeof userSortFieldSchema>;

export const SORT_ORDERS = ["asc", "desc"] as const;
export const sortOrderSchema = z.enum(SORT_ORDERS);

/**
 * UI-level sort keys (labels live in `data/admin.data.ts`); mapped onto
 * `sortBy` / `order` by `SORT_QUERY`.
 */
export const SORT_KEYS = ["newest", "oldest", "username"] as const;
export const sortKeySchema = z.enum(SORT_KEYS);
export type SortKey = z.infer<typeof sortKeySchema>;

export const TASK_STATUSES = [
    "PENDING",
    "TODO",
    "IN_PROGRESS",
    "SUBMITTED",
    "DONE",
] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const ATTENDANCE_STATUSES = [
    "ABSENT",
    "PRESENT",
    "HALF_DAY",
    "LEAVE",
] as const;
export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const LEAVE_STATUSES = ["REJECT", "APPROVED", "SCRUTINY"] as const;
export const leaveStatusSchema = z.enum(LEAVE_STATUSES);
export type LeaveStatus = z.infer<typeof leaveStatusSchema>;

export const TICKET_STATUSES = ["RESOLVED", "REJECT", "SCRUTINY"] as const;
export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Backend `Date` serialises to an ISO string; coerce for display helpers. */
const isoDateTime = z.coerce.date();

const uuid = z.string().min(1);

/** Zero-filled status tally: every known status is always a number. */
const statusTally = <T extends readonly [string, ...string[]]>(values: T) =>
    z.object(
        Object.fromEntries(values.map((value) => [value, z.number()])) as {
            [K in T[number]]: z.ZodNumber;
        },
    );

/* ------------------------------------------------------------------ */
/* Users list                                                          */
/* ------------------------------------------------------------------ */

export const adminUserListItemSchema = z.object({
    id: uuid,
    username: z.string().min(1),
    email: z.string().min(1),
    role: userRoleSchema,
    activeStatus: z.boolean(),
    photoUrl: z.string().nullable(),
    verificationStatus: verificationStatusSchema,
    isEmailVerified: z.boolean(),
    score: z.number(),
    batch: z
        .object({ id: uuid, name: z.string().min(1) })
        .nullable(),
    lastLoginAt: isoDateTime.nullable(),
    lastActivityAt: isoDateTime.nullable(),
    deactivatedAt: isoDateTime.nullable(),
    createdAt: isoDateTime,
});
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;

export const pageMetaSchema = z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
});
export type PageMeta = z.infer<typeof pageMetaSchema>;

export const listUsersResponseSchema = z.object({
    items: z.array(adminUserListItemSchema),
    meta: pageMetaSchema,
});
export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;

/** Query actually sent to `GET /admin/users` — validated before the request. */
export const listUsersParamsSchema = z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    search: z.string().trim().min(1).max(100).optional(),
    role: userRoleSchema.optional(),
    status: userStatusFilterSchema,
    sortBy: userSortFieldSchema,
    order: sortOrderSchema,
});
export type ListUsersParams = z.infer<typeof listUsersParamsSchema>;

/** `PATCH /admin/users/:userId` body — at least one field, nothing else. */
export const updateUserPayloadSchema = z
    .object({
        role: userRoleSchema.optional(),
        activeStatus: z.boolean().optional(),
    })
    .refine(
        (value) =>
            value.role !== undefined || value.activeStatus !== undefined,
        { message: "Provide at least one field to update." },
    );
export type UpdateUserPayload = z.infer<typeof updateUserPayloadSchema>;

/**
 * URL query state of the users page. Parsed on every navigation so a
 * hand-edited or stale URL falls back to safe defaults instead of crashing.
 */
export const usersSearchStateSchema = z.object({
    page: z.coerce.number().int().min(1).catch(1),
    q: z.string().max(100).catch(""),
    role: userRoleSchema.optional().catch(undefined),
    status: userStatusFilterSchema.catch("all"),
    sort: sortKeySchema.catch("newest"),
});
export type UsersSearchState = z.infer<typeof usersSearchStateSchema>;

/* ------------------------------------------------------------------ */
/* Dashboard overview (GET /admin/stats)                               */
/* ------------------------------------------------------------------ */

export const adminDashboardStatsSchema = z.object({
    totals: z.object({
        users: z.number().int().min(0),
        active: z.number().int().min(0),
        inactive: z.number().int().min(0),
        pendingVerification: z.number().int().min(0),
        recentSignups: z.number().int().min(0),
    }),
    byRole: statusTally(USER_ROLES),
    recentUsers: z.array(adminUserListItemSchema),
});
export type AdminDashboardStats = z.infer<typeof adminDashboardStatsSchema>;

/* ------------------------------------------------------------------ */
/* Per-user stats (GET /admin/users/:userId)                           */
/* ------------------------------------------------------------------ */

export const adminUserStatsSchema = z.object({
    profile: z.object({
        id: uuid,
        username: z.string().min(1),
        email: z.string().min(1),
        role: userRoleSchema,
        activeStatus: z.boolean(),
        photoUrl: z.string().nullable(),
        phone: z.string().nullable(),
        dob: z.string().nullable(),
        universityName: z.string().nullable(),
        authType: authTypeSchema,
        score: z.number(),
        verificationStatus: verificationStatusSchema,
        isEmailVerified: z.boolean(),
        providers: z.object({
            password: z.boolean(),
            google: z.boolean(),
        }),
        batch: z
            .object({
                id: uuid,
                name: z.string().min(1),
                startDate: isoDateTime,
                endDate: isoDateTime,
            })
            .nullable(),
        createdAt: isoDateTime,
        updatedAt: isoDateTime,
        lastLoginAt: isoDateTime.nullable(),
        lastActivityAt: isoDateTime.nullable(),
        deactivatedAt: isoDateTime.nullable(),
    }),
    tasks: z.object({
        assigned: z.number().int().min(0),
        created: z.number().int().min(0),
        byStatus: statusTally(TASK_STATUSES),
        evaluated: z.number().int().min(0),
        averageScore: z.number().nullable(),
    }),
    attendance: z.object({
        total: z.number().int().min(0),
        byStatus: statusTally(ATTENDANCE_STATUSES),
        presentRate: z.number().nullable(),
    }),
    leaves: z.object({
        total: z.number().int().min(0),
        byStatus: statusTally(LEAVE_STATUSES),
    }),
    tickets: z.object({
        created: z.object({
            total: z.number().int().min(0),
            byStatus: statusTally(TICKET_STATUSES),
        }),
        resolved: z.number().int().min(0),
    }),
    documents: z
        .object({
            submitted: z.number().int().min(0),
            approved: z.number().int().min(0),
            pending: z.number().int().min(0),
            rejected: z.number().int().min(0),
            rejectionReason: z.string().nullable(),
            reviewedAt: isoDateTime.nullable(),
        })
        .nullable(),
    membership: z.object({
        internTeams: z.array(
            z.object({
                id: uuid,
                name: z.string().min(1),
                batchName: z.string().min(1),
            }),
        ),
        managedTeams: z.array(
            z.object({
                id: uuid,
                name: z.string().min(1),
                batchName: z.string().min(1),
            }),
        ),
        managedBatches: z.number().int().min(0),
        messagesSent: z.number().int().min(0),
    }),
});
export type AdminUserStats = z.infer<typeof adminUserStatsSchema>;
