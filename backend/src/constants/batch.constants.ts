export const BATCH_NAME_MIN_LENGTH = 2;
export const BATCH_NAME_MAX_LENGTH = 100;

/** Sanity bound that catches typos such as a year entered as 2062. */
export const MAX_BATCH_DURATION_DAYS = 366;

/** Upper bound on HR owners attached to a single batch. */
export const MAX_HR_PER_BATCH = 20;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const BATCH_SORT_FIELDS = [
    "startDate",
    "endDate",
    "name",
    "createdAt",
] as const;

export const BATCH_STATUS_FILTERS = [
    "upcoming",
    "ongoing",
    "completed",
] as const;

export const ARCHIVE_FILTERS = ["exclude", "include", "only"] as const;

export const BATCH_AUDIT = {
    CREATE: "BATCH_CREATE",
    UPDATE: "BATCH_UPDATE",
    ARCHIVE: "BATCH_ARCHIVE",
    RESTORE: "BATCH_RESTORE",
    ASSIGN_HR: "BATCH_ASSIGN_HR",
} as const;

export const BATCH_ENTITY = "Batch";