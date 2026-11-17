export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.pdf";

/** Batch codes are uppercase segments joined by dashes, e.g. IISPPR-JAN-MAR-XMGH. */
const BATCH_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+){2,5}$/;

export const normalizeBatchCode = (raw: string): string => raw.trim().toUpperCase();

export const isValidBatchCode = (code: string): boolean =>
    code.length <= 40 && BATCH_CODE_PATTERN.test(code);

/** Returns an error message, or `null` when the file is acceptable. */
export const validateDocumentFile = (file: File): string | null => {
    if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
        return "Only JPG, PNG or PDF files are allowed.";
    }
    if (file.size === 0) return "This file is empty.";
    if (file.size > MAX_FILE_SIZE_BYTES) return "File is larger than 5MB.";
    return null;
};

const parseCalendarDate = (iso: string): Date => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
};

/** "5 Jan 2027" */
export const formatBatchDate = (iso: string): string =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
        parseCalendarDate(iso),
    );

/** Whole calendar days from today until `iso` (negative once started). */
export const daysUntil = (iso: string, now: Date = new Date()): number => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((parseCalendarDate(iso).getTime() - today.getTime()) / 86_400_000);
};

export const startsInLabel = (iso: string): string => {
    const days = daysUntil(iso);
    if (days > 1) return `Starts in ${days} days`;
    if (days === 1) return "Starts tomorrow";
    if (days === 0) return "Starts today";
    return "Already started";
};

/**
 * Assumption: an intern is considered onboarded once HR has verified them.
 * Adjust to the backend's real `verificationStatus` value.
 */
export const isOnboardingComplete = (verificationStatus?: string | null): boolean =>
    verificationStatus === "VERIFIED";