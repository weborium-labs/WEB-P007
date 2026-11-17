export interface InternshipOption {
    id: string;
    institute: string;
    batch: string;
}

export interface OverviewStat {
    id: string;
    label: string;
    value: string;
    suffix: string;
    suffixBold?: boolean;
}

export interface Task {
    id: string;
    title: string;
    assignee: { name: string; initials: string };
    team: string;
    start: string;
    end: string;
    urgent?: boolean;
}

export interface Chat {
    id: string;
    initials: string;
    title: string;
    preview: string;
    time: string;
    unread?: number;
    typing?: boolean;
}

/* ----------------------------- Onboarding ----------------------------- */

export type DocType = "aadhaar" | "pan" | "ssc" | "hsc";

export interface OnboardingDocument {
    type: DocType;
    label: string;
}

export interface BatchPreview {
    id: string;
    code: string;
    institute: string;
    /** Display label, e.g. "Jan – Mar". */
    batch: string;
    /** ISO calendar dates (YYYY-MM-DD). */
    startDate: string;
    endDate: string;
    hrName: string;
}

export type BatchLookupStatus = "idle" | "loading" | "found" | "notFound" | "error";

export interface UploadDocumentPayload {
    docType: DocType;
    file: File;
    onProgress?: (percent: number) => void;
}