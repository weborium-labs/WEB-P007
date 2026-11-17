import { useNavigate } from "react-router-dom";

import Avatar from "../../../component/intern-dashboard/Avatar";
import OverviewStats from "../../../component/intern-dashboard/OverviewStats";
import ViewAllLink from "../../../component/intern-dashboard/ViewAllLink";
import Button from "../../../component/Button";
import Badge from "../../../component/ui/Badge";
import EmptyState from "../../../component/ui/EmptyState";
import PageHeader from "../../../component/ui/PageHeader";
import { ChevronRightIcon } from "../../../component/ui/icons";
import {
    ROLE_LABELS,
    ROLE_TONES,
    VERIFICATION_LABELS,
} from "../../../data/admin.data";
import { useAdminDashboardStatsQuery } from "../../../hooks/useAdminDashboard";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import {
    formatDate,
    formatNumber,
    initialsOf,
} from "../../../lib/format";
import type { AdminDashboardStats, UserRole } from "../../../lib/admin.schemas";
import type { ApiClientError } from "../../../api/apiClient";

/** Bar fills reuse the badge tone palette so role colour is consistent. */
const BAR_TONES: Record<(typeof ROLE_TONES)[UserRole], string> = {
    brand: "bg-brand",
    ok: "bg-ok",
    warn: "bg-warn",
    neutral: "bg-line-mid",
};

const buildOverview = (stats: AdminDashboardStats) => [
    {
        id: "users",
        label: "Total users",
        value: formatNumber(stats.totals.users),
        suffix: "",
    },
    {
        id: "active",
        label: "Active accounts",
        value: formatNumber(stats.totals.active),
        suffix: "",
    },
    {
        id: "pending",
        label: "Pending verification",
        value: formatNumber(stats.totals.pendingVerification),
        suffix: "",
    },
    {
        id: "recent",
        label: "New this month",
        value: formatNumber(stats.totals.recentSignups),
        suffix: "",
    },
];

function RoleBreakdown({ stats }: { stats: AdminDashboardStats }) {
    const { byRole, totals } = stats;

    return (
        <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-grey-50 bg-surface p-5 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)] sm:p-6">
            <header className="flex flex-col gap-0.5">
                <h2 className="text-lg font-semibold leading-7 text-ink">
                    Roles
                </h2>
                <p className="text-sm leading-5 text-ink-500">
                    How access is distributed across the platform
                </p>
            </header>

            <ul className="flex flex-col gap-4">
                {(Object.keys(byRole) as UserRole[]).map((role) => {
                    const count = byRole[role];
                    const percent =
                        totals.users === 0
                            ? 0
                            : (count / totals.users) * 100;

                    return (
                        <li key={role} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <Badge tone={ROLE_TONES[role]}>
                                    {ROLE_LABELS[role]}
                                </Badge>
                                <span className="text-sm leading-5 text-ink-500">
                                    <span className="font-medium text-ink">
                                        {formatNumber(count)}
                                    </span>{" "}
                                    ({Math.round(percent)}%)
                                </span>
                            </div>
                            <div
                                role="img"
                                aria-label={`${ROLE_LABELS[role]}: ${count} users`}
                                className="h-2 overflow-hidden rounded-full bg-grey-100"
                            >
                                <div
                                    className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${BAR_TONES[ROLE_TONES[role]]}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function RecentUsers({ stats }: { stats: AdminDashboardStats }) {
    const navigate = useNavigate();

    return (
        <section className="flex min-w-0 flex-col rounded-2xl border border-grey-50 bg-surface p-5 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)] sm:p-6">
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg font-semibold leading-7 text-ink">
                        Recent signups
                    </h2>
                    <p className="text-sm leading-5 text-ink-500">
                        The five newest accounts
                    </p>
                </div>
                <ViewAllLink to="/admin/users">View all</ViewAllLink>
            </header>

            {stats.recentUsers.length === 0 ? (
                <EmptyState
                    title="No users yet"
                    description="Accounts appear here as soon as they sign up."
                />
            ) : (
                <ul className="mt-2 flex flex-col">
                    {stats.recentUsers.map((user) => (
                        <li key={user.id}>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/admin/users/${user.id}`)
                                }
                                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-grey-25 focus-visible:ring-2 focus-visible:ring-ink/30"
                            >
                                <Avatar
                                    initials={initialsOf(user.username)}
                                    gradient={
                                        user.role === "INTERN"
                                            ? "blue"
                                            : "purple"
                                    }
                                />
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-semibold leading-5 text-ink">
                                        {user.username}
                                    </span>
                                    <span className="truncate text-xs leading-4 text-ink-500">
                                        {user.email}
                                    </span>
                                </span>

                                <Badge
                                    tone={ROLE_TONES[user.role]}
                                    className="hidden sm:inline-flex"
                                >
                                    {ROLE_LABELS[user.role]}
                                </Badge>

                                {user.verificationStatus !==
                                    "NOT_SUBMITTED" && (
                                    <span className="hidden text-xs leading-4 text-ink-400 lg:inline">
                                        {
                                            VERIFICATION_LABELS[
                                                user.verificationStatus
                                            ]
                                        }
                                    </span>
                                )}

                                <span className="hidden text-xs leading-4 text-ink-400 md:inline">
                                    {formatDate(user.createdAt)}
                                </span>
                                <ChevronRightIcon className="size-4 shrink-0 text-ink-400" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/**
 * Admin dashboard: platform-wide user overview with a direct path into the
 * directory.
 *
 * All numbers come from `GET /admin/stats` (React Query); the role split and
 * the recent-signup list are rendered straight from that single payload, so
 * the cards can never disagree with each other.
 */
export default function AdminDashboard() {
    useDocumentTitle("Admin Dashboard");
    const navigate = useNavigate();
    const statsQuery = useAdminDashboardStatsQuery();

    if (statsQuery.isPending) {
        return (
            <main className="@container flex min-h-screen flex-col gap-7 bg-grey-25 pb-8 pl-4 pr-4 pt-6 font-inter sm:pl-10 sm:pr-[34px] sm:pt-8">
                <div className="h-12 w-72 max-w-full animate-pulse rounded-xl bg-grey-100" />
                <div className="flex flex-wrap gap-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-[140px] w-[250px] max-w-full animate-pulse rounded-3xl bg-grey-100"
                        />
                    ))}
                </div>
                <div className="grid gap-4 @min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                    <div className="h-72 animate-pulse rounded-2xl bg-grey-100" />
                    <div className="h-72 animate-pulse rounded-2xl bg-grey-100" />
                </div>
            </main>
        );
    }

    if (statsQuery.isError || !statsQuery.data) {
        const error = statsQuery.error as ApiClientError;
        return (
            <main className="@container flex min-h-screen flex-col items-center justify-center gap-4 bg-grey-25 px-5 font-inter">
                <EmptyState
                    title="Couldn't load the dashboard"
                    description={
                        error?.message ??
                        "Something went wrong while loading platform stats."
                    }
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void statsQuery.refetch()}
                        >
                            Try again
                        </Button>
                    }
                />
            </main>
        );
    }

    const stats = statsQuery.data;

    return (
        <main className="@container flex min-h-screen flex-col gap-7 bg-grey-25 pb-8 pl-4 pr-4 pt-6 font-inter sm:pl-10 sm:pr-[34px] sm:pt-8">
            <PageHeader
                title="Admin Dashboard"
                subtitle="Everything happening across the platform, at a glance."
                actions={
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => navigate("/admin/users")}
                    >
                        Manage users
                    </Button>
                }
            />

            <OverviewStats stats={buildOverview(stats)} />

            <div className="grid gap-4 @min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                <RoleBreakdown stats={stats} />
                <RecentUsers stats={stats} />
            </div>
        </main>
    );
}
