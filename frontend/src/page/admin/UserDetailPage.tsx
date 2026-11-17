import { useLocation, useNavigate, useParams } from "react-router-dom";

import OverviewStats from "../../component/intern-dashboard/OverviewStats";
import Button from "../../component/Button";
import UserProfileCard from "../../component/admin-dashboard/UserProfileCard";
import EmptyState from "../../component/ui/EmptyState";
import PageHeader from "../../component/ui/PageHeader";
import StatCard from "../../component/ui/StatCard";
import StatTile from "../../component/ui/StatTile";
import { ArrowLeftIcon } from "../../component/ui/icons";
import {
    ATTENDANCE_STATUS_LABELS,
    LEAVE_STATUS_LABELS,
    ROLE_LABELS,
    TASK_STATUS_LABELS,
    TICKET_STATUS_LABELS,
} from "../../data/admin.data";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import {
    useAdminUserStatsQuery,
    useUpdateUserMutation,
} from "../../hooks/useAdminUsers";
import type {
    AdminUserStats,
    AttendanceStatus,
    LeaveStatus,
    TaskStatus,
    TicketStatus,
    UserRole,
} from "../../lib/admin.schemas";
import {
    formatDateTime,
    formatNumber,
    formatPercent,
    formatRatio,
} from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";
import type { ApiClientError } from "../../api/apiClient";

/** Hero tiles reuse the dashboard's oversized `OverviewCard`. */
const buildOverview = (stats: AdminUserStats) => [
    {
        id: "score",
        label: "Overall score",
        value: formatNumber(stats.profile.score),
        suffix: "",
    },
    {
        id: "tasks",
        label: "Tasks assigned",
        value: formatNumber(stats.tasks.assigned),
        suffix: "",
    },
    {
        id: "attendance",
        label: "Attendance",
        value:
            stats.attendance.presentRate === null
                ? "—"
                : String(Math.round(stats.attendance.presentRate)),
        suffix: stats.attendance.presentRate === null ? "" : "%",
    },
    {
        id: "tickets",
        label: "Tickets resolved",
        value: formatNumber(stats.tickets.resolved),
        suffix: "",
    },
];

function TeamsList({
    title,
    teams,
}: {
    title: string;
    teams: AdminUserStats["membership"]["internTeams"];
}) {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-medium leading-4 text-ink-400">
                {title}
            </p>
            {teams.length === 0 ? (
                <p className="rounded-xl bg-grey-25 px-3.5 py-2.5 text-sm leading-5 text-ink-500">
                    None
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {teams.map((team) => (
                        <li
                            key={team.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-grey-25 px-3.5 py-2.5"
                        >
                            <span className="truncate text-sm font-medium leading-5 text-ink">
                                {team.name}
                            </span>
                            <span className="shrink-0 text-xs leading-4 text-ink-500">
                                {team.batchName}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Per-user stats and management page (`/admin/users/:userId`).
 *
 * Deep-linkable: the back control returns to the directory when there is
 * history, and falls back to it on a direct landing (so the list's search and
 * page state is never lost).
 */
export default function UserDetailPage() {
    useDocumentTitle("User details");
    const { userId = "" } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const currentUserId = useAuthStore((s) => s.user?.id);

    const statsQuery = useAdminUserStatsQuery(userId);
    const updateUser = useUpdateUserMutation();

    const handleBack = () => {
        if (location.key === "default") {
            navigate("/admin/users");
        } else {
            navigate(-1);
        }
    };

    const handleRoleChange = (role: UserRole) => {
        updateUser.mutate({ userId, payload: { role } });
    };

    const handleToggleActive = () => {
        if (!statsQuery.data) return;
        updateUser.mutate({
            userId,
            payload: { activeStatus: !statsQuery.data.profile.activeStatus },
        });
    };

    if (statsQuery.isPending) {
        return (
            <main className="@container flex min-h-screen flex-col gap-6 bg-grey-25 pb-8 pl-4 pr-4 pt-6 font-inter sm:pl-10 sm:pr-[34px] sm:pt-8">
                <div className="h-12 w-64 max-w-full animate-pulse rounded-xl bg-grey-100" />
                <div className="h-40 animate-pulse rounded-2xl bg-grey-100" />
                <div className="grid gap-4 @min-[1100px]:grid-cols-2">
                    <div className="h-56 animate-pulse rounded-2xl bg-grey-100" />
                    <div className="h-56 animate-pulse rounded-2xl bg-grey-100" />
                </div>
            </main>
        );
    }

    if (statsQuery.isError || !statsQuery.data) {
        const error = statsQuery.error as ApiClientError;
        return (
            <main className="@container flex min-h-screen flex-col items-center justify-center gap-4 bg-grey-25 px-5 font-inter">
                <EmptyState
                    title="Couldn't load this user"
                    description={
                        error?.message ??
                        "The account may have been removed. Try again in a moment."
                    }
                    action={
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void statsQuery.refetch()}
                            >
                                Try again
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/admin/users")}
                            >
                                Back to users
                            </Button>
                        </div>
                    }
                />
            </main>
        );
    }

    const stats = statsQuery.data;
    const { profile, tasks, attendance, leaves, tickets, documents, membership } =
        stats;
    const isSelf = profile.id === currentUserId;
    const mutationError = updateUser.error as ApiClientError | null;

    return (
        <main className="@container flex min-h-screen flex-col gap-6 bg-grey-25 pb-8 pl-4 pr-4 pt-6 font-inter sm:pl-10 sm:pr-[34px] sm:pt-8">
            <PageHeader
                title={profile.username}
                subtitle={`${ROLE_LABELS[profile.role]} · ${profile.email}`}
                actions={
                    <Button
                        variant="outline"
                        size="md"
                        startIcon={<ArrowLeftIcon className="size-5" />}
                        onClick={handleBack}
                    >
                        Back to users
                    </Button>
                }
            />

            {mutationError && (
                <div
                    role="alert"
                    className="flex items-center justify-between gap-3 rounded-xl border border-bad-line bg-bad-soft px-4 py-3"
                >
                    <p className="text-sm leading-5 text-bad-strong">
                        {mutationError.message || "Something went wrong."}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateUser.reset()}
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            <UserProfileCard
                stats={stats}
                isSelf={isSelf}
                isPending={updateUser.isPending}
                onRoleChange={handleRoleChange}
                onToggleActive={handleToggleActive}
            />

            <OverviewStats stats={buildOverview(stats)} />

            <div className="grid gap-4 @min-[1100px]:grid-cols-2">
                <StatCard
                    title="Tasks"
                    subtitle={`${formatRatio(
                        tasks.evaluated,
                        tasks.assigned,
                    )} evaluated · avg score ${
                        tasks.averageScore === null
                            ? "—"
                            : formatNumber(tasks.averageScore)
                    }`}
                    columns="3"
                >
                    {(Object.keys(tasks.byStatus) as TaskStatus[]).map(
                        (status) => (
                            <StatTile
                                key={status}
                                label={TASK_STATUS_LABELS[status]}
                                value={formatNumber(tasks.byStatus[status])}
                                tone={
                                    status === "DONE"
                                        ? "ok"
                                        : status === "PENDING"
                                          ? "warn"
                                          : "default"
                                }
                            />
                        ),
                    )}
                </StatCard>

                <StatCard
                    title="Attendance"
                    subtitle={`${formatNumber(
                        attendance.total,
                    )} recorded days · present rate ${formatPercent(
                        attendance.presentRate,
                    )}`}
                    columns="3"
                >
                    {(Object.keys(attendance.byStatus) as AttendanceStatus[]).map(
                        (status) => (
                            <StatTile
                                key={status}
                                label={ATTENDANCE_STATUS_LABELS[status]}
                                value={formatNumber(attendance.byStatus[status])}
                                tone={
                                    status === "PRESENT"
                                        ? "ok"
                                        : status === "ABSENT"
                                          ? "bad"
                                          : "default"
                                }
                            />
                        ),
                    )}
                </StatCard>

                <StatCard
                    title="Leaves"
                    subtitle={`${formatNumber(leaves.total)} leave requests`}
                    columns="3"
                >
                    {(Object.keys(leaves.byStatus) as LeaveStatus[]).map(
                        (status) => (
                            <StatTile
                                key={status}
                                label={LEAVE_STATUS_LABELS[status]}
                                value={formatNumber(leaves.byStatus[status])}
                                tone={
                                    status === "APPROVED"
                                        ? "ok"
                                        : status === "REJECT"
                                          ? "bad"
                                          : "default"
                                }
                            />
                        ),
                    )}
                </StatCard>

                <StatCard
                    title="Tickets"
                    subtitle={`${formatNumber(
                        tickets.created.total,
                    )} raised · ${formatNumber(tickets.resolved)} resolved`}
                    columns="3"
                >
                    {(Object.keys(tickets.created.byStatus) as TicketStatus[]).map(
                        (status) => (
                            <StatTile
                                key={status}
                                label={TICKET_STATUS_LABELS[status]}
                                value={formatNumber(
                                    tickets.created.byStatus[status],
                                )}
                                tone={
                                    status === "RESOLVED"
                                        ? "ok"
                                        : status === "REJECT"
                                          ? "bad"
                                          : "default"
                                }
                            />
                        ),
                    )}
                    <StatTile
                        label="Resolved by them"
                        value={formatNumber(tickets.resolved)}
                    />
                </StatCard>

                <StatCard
                    title="Documents"
                    subtitle="KYC submissions"
                    columns="3"
                >
                    {documents ? (
                        <>
                            <StatTile
                                label="Submitted"
                                value={formatNumber(documents.submitted)}
                            />
                            <StatTile
                                label="Approved"
                                value={formatNumber(documents.approved)}
                                tone="ok"
                            />
                            <StatTile
                                label="In review"
                                value={formatNumber(documents.pending)}
                                tone="warn"
                            />
                            <StatTile
                                label="Rejected"
                                value={formatNumber(documents.rejected)}
                                tone={documents.rejected > 0 ? "bad" : "default"}
                            />
                            {documents.rejectionReason && (
                                <p className="col-span-full rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm leading-5 text-bad-strong">
                                    {documents.rejectionReason}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="col-span-full rounded-xl bg-grey-25 px-3.5 py-2.5 text-sm leading-5 text-ink-500">
                            No documents submitted yet.
                        </p>
                    )}
                </StatCard>

                <StatCard
                    title="Teams & activity"
                    subtitle="Memberships and engagement"
                    columns="1"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TeamsList
                            title="Intern teams"
                            teams={membership.internTeams}
                        />
                        <TeamsList
                            title="Managed teams"
                            teams={membership.managedTeams}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile
                            label="Managed batches"
                            value={formatNumber(membership.managedBatches)}
                        />
                        <StatTile
                            label="Messages sent"
                            value={formatNumber(membership.messagesSent)}
                        />
                        <StatTile
                            label="Joined"
                            value={formatDateTime(profile.createdAt)}
                            size="sm"
                        />
                        <StatTile
                            label="Last login"
                            value={formatDateTime(profile.lastLoginAt)}
                            size="sm"
                        />
                    </div>
                </StatCard>
            </div>
        </main>
    );
}
