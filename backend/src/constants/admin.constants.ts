/** Bounds and enums for the admin user-management module. */

/** Longest accepted `search` term (username / email / display fields). */
export const USER_SEARCH_MAX_LENGTH = 100;

/**
 * Sort keys exposed by `GET /admin/users`. Each is a real, indexed-or-cheap
 * column; `id` is appended in the service as a stable pagination tiebreak.
 */
export const ADMIN_USER_SORT_FIELDS = [
    "createdAt",
    "username",
    "lastLoginAt",
    "role",
] as const;

/** Account-activity filter for the users list. */
export const USER_STATUS_FILTERS = ["all", "active", "inactive"] as const;

/** AuditLog values written by the admin module. */
export const ADMIN_AUDIT = {
    UPDATE_USER: "ADMIN_UPDATE_USER",
} as const;

/** AuditLog entityType for writes against the User table. */
export const ADMIN_USER_ENTITY = "User";
