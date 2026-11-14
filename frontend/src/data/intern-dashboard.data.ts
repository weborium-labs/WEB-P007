import type { Chat, InternshipOption, OverviewStat, Task } from "../types/types";

/** Placeholder data — replace with API responses. */
export const INTERN_NAME = "Divyesh Moraniya";

export const INTERNSHIP_OPTIONS: readonly InternshipOption[] = [
    { id: "internship-1", institute: "IISPPR", batch: "B-Jan7:Jul7" },
    { id: "internship-2", institute: "IISPPR", batch: "B-Jan7:Jul7" },
    { id: "internship-3", institute: "IISPPR", batch: "B-Jan7:Jul7" },
];

export const OVERVIEW_STATS: readonly OverviewStat[] = [
    { id: "score", label: "Score", value: "92", suffix: "/100" },
    { id: "tasks-done", label: "Tasks Done", value: "7", suffix: "/10" },
    { id: "attendance", label: "Attendance", value: "92.5", suffix: "%", suffixBold: true },
];

export const TASKS: readonly Task[] = [
    {
        id: "t1",
        title: "Solve the bug for appointment scheduling.",
        assignee: { name: "Tejas Thakkar", initials: "GM" },
        team: "#Team-Name",
        start: "12/12/26 - 14:23PM",
        end: "13/12/26 - 00:00AM",
        urgent: true,
    },
    {
        id: "t2",
        title: "Update the UI for the user profile section.",
        assignee: { name: "Maya Lin", initials: "GM" },
        team: "#Design-Team",
        start: "12/12/26 - 16:00PM",
        end: "13/12/26 - 02:00PM",
        urgent: true,
    },
    {
        id: "t3",
        title: "Implement new feature for user notifications.",
        assignee: { name: "Aisha Khan", initials: "GM" },
        team: "#Dev-Team",
        start: "13/12/26 - 09:00AM",
        end: "16/12/26 - 10:30AM",
    },
    {
        id: "t4",
        title: "Prepare presentation for client feedback.",
        assignee: { name: "Ravi Kumar", initials: "GM" },
        team: "#Design-Team",
        start: "13/12/26 - 11:00AM",
        end: "17/12/26 - 12:30PM",
    },
];

export const CHATS: readonly Chat[] = [
    {
        id: "c1",
        initials: "B1",
        title: "B1-Just Share Care Developent",
        preview: "Intern is typing...",
        time: "12:33PM",
        unread: 5,
        typing: true,
    },
    {
        id: "c2",
        initials: "B2",
        title: "B2-IMS System Development",
        preview: "Yug made the changes required, if not then kindly check it",
        time: "1:00PM",
    },
    {
        id: "c3",
        initials: "B3",
        title: "T2-Dashboard Design(B2)",
        preview: "Everyone Join Meeting!!!",
        time: "1:15PM",
    },
];