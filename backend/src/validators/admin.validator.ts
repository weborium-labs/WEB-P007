import { z } from "zod";

import {
    ADMIN_USER_SORT_FIELDS,
    USER_SEARCH_MAX_LENGTH,
    USER_STATUS_FILTERS,
} from "../constants/admin.constants.js";
import {
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
} from "../constants/pagination.constants.js";
import { Role } from "../generated/prisma/client.js";

/**
 * Admin user-management endpoints (`/admin/users`).
 *
 * All schemas assume `authenticate` + `authorize(Role.ADMIN)` already ran;
 * they only shape the request itself.
 */

const uuid = (label: string) => z.uuid({ error: `${label} must be a valid UUID.` });

/** Route param `:userId`. */
export const userIdParamSchema = z.object({
    userId: uuid("userId"),
});

/**
 * GET /admin/users — paginated, searchable directory.
 *
 * Unknown keys are stripped (plain object, not strict) so extra query params
 * such as cache-busters never fail the request.
 */
export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE),
    search: z.string().trim().min(1).max(USER_SEARCH_MAX_LENGTH).optional(),
    role: z.enum(Role).optional(),
    status: z.enum(USER_STATUS_FILTERS).default("all"),
    sortBy: z.enum(ADMIN_USER_SORT_FIELDS).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * PATCH /admin/users/:userId — role and/or activation management.
 *
 * `.strict()` rejects unknown keys (mass-assignment guard), and at least one
 * field must be present so an empty PATCH cannot silently no-op.
 */
export const updateUserSchema = {
    params: userIdParamSchema,
    body: z
        .strictObject({
            role: z.enum(Role, { error: "Role must be a valid role." }).optional(),
            activeStatus: z
                .boolean({ error: "activeStatus must be a boolean." })
                .optional(),
        })
        .refine(
            (value) =>
                value.role !== undefined || value.activeStatus !== undefined,
            { error: "Provide at least one field to update." },
        ),
};

/* ------------------------------------------------------------------ */
/* Inferred types (validated output)                                   */
/* ------------------------------------------------------------------ */

export type UserIdParams = z.infer<typeof userIdParamSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema.body>;
