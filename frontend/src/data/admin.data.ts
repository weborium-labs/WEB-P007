import type {
    AttendanceStatus,
    LeaveStatus,
    TaskStatus,
    TicketStatus,
    UserSortField,
    UserRole,
    UserStatusFilter,
    VerificationStatus,
} from "../lib/admin.schemas";
import { USER_ROLES, type SortKey } from "../lib/admin.schemas";

/**
 * Static presentation data for the admin surface: labels, tone mappings and
 * dropdown options. Keeping them here mirrors `intern-dashboard.data.ts` and
 * stops label maps from leaking into components.
 */

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const ROLE_LABELS: Record<UserRole, string> = {
    INTERN: "Intern",
    HR: "HR",
    GPM: "Group Manager",
    ADMIN: "Admin",
};

export interface RoleOption {
    value: UserRole;
    label: string;
}

export const ROLE_OPTIONS: readonly RoleOption[] = USER_ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
}));

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export const STATUS_OPTIONS: ReadonlyArray<{
    value: UserStatusFilter;
    label: string;
}> = [
    { value: "all", label: "All accounts" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

export const ROLE_FILTER_OPTIONS: ReadonlyArray<{
    value: UserRole | "all";
    label: string;
}> = [{ value: "all", label: "All roles" }, ...ROLE_OPTIONS];

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "username", label: "Username A–Z" },
];

/** Maps a UI sort key onto the `sortBy` / `order` pair the API accepts. */
export const SORT_QUERY: Record<
    SortKey,
    { sortBy: UserSortField; order: "asc" | "desc" }
> = {
    newest: { sortBy: "createdAt", order: "desc" },
    oldest: { sortBy: "createdAt", order: "asc" },
    username: { sortBy: "username", order: "asc" },
};

/* ------------------------------------------------------------------ */
/* Status labels                                                       */
/* ------------------------------------------------------------------ */

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
    NOT_SUBMITTED: "Not submitted",
    PENDING: "Pending review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    PENDING: "Pending",
    TODO: "To do",
    IN_PROGRESS: "In progress",
    SUBMITTED: "Submitted",
    DONE: "Done",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
    PRESENT: "Present",
    ABSENT: "Absent",
    HALF_DAY: "Half day",
    LEAVE: "On leave",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
    APPROVED: "Approved",
    SCRUTINY: "In review",
    REJECT: "Rejected",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
    RESOLVED: "Resolved",
    SCRUTINY: "In review",
    REJECT: "Rejected",
};

/* ------------------------------------------------------------------ */
/* Badge tones                                                         */
/* ------------------------------------------------------------------ */

/** Status → badge tone, shared by the list and the detail page. */
export const ROLE_TONES: Record<UserRole, "brand" | "ok" | "warn" | "neutral"> =
    {
        ADMIN: "warn",
        HR: "brand",
        GPM: "ok",
        INTERN: "neutral",
    };

export const VERIFICATION_TONES: Record<
    VerificationStatus,
    "ok" | "warn" | "bad" | "neutral"
> = {
    APPROVED: "ok",
    PENDING: "warn",
    REJECTED: "bad",
    NOT_SUBMITTED: "neutral",
};
