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