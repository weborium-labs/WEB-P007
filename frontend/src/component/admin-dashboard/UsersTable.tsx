import type { MouseEvent as ReactMouseEvent } from "react";

import Avatar from "../intern-dashboard/Avatar";
import Badge from "../ui/Badge";
import Button from "../Button";
import EmptyState from "../ui/EmptyState";
import RoleSelect from "./RoleSelect";
import {
    ROLE_LABELS,
    ROLE_TONES,
    VERIFICATION_LABELS,
    VERIFICATION_TONES,
} from "../../data/admin.data";
import { formatDate, initialsOf } from "../../lib/format";
import type { AdminUserListItem, UserRole } from "../../lib/admin.schemas";

interface UsersTableProps {
    users: readonly AdminUserListItem[];
    /** Signed-in admin — their own row is never editable here. */
    currentUserId: string;
    /** Id of the row with an in-flight role / activation mutation. */
    pendingUserId?: string | null;
    onRoleChange: (user: AdminUserListItem, role: UserRole) => void;
    onToggleActive: (user: AdminUserListItem) => void;
    onOpenUser: (user: AdminUserListItem) => void;
}

/** Stops the row-level click from also firing (controls inside the row). */
const stopRowClick = (event: ReactMouseEvent) => event.stopPropagation();

function UserIdentity({
    user,
    onClick,
}: {
    user: AdminUserListItem;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
            className="flex min-w-0 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        >
            <Avatar
                initials={initialsOf(user.username)}
                gradient={user.role === "INTERN" ? "blue" : "purple"}
            />
            <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold leading-5 text-ink">
                        {user.username}
                    </span>
                    {!user.isEmailVerified && (
                        <span
                            title="Email not verified"
                            aria-label="Email not verified"
                            className="size-1.5 shrink-0 rounded-full bg-warn"
                        />
                    )}
                </span>
                <span className="truncate text-xs leading-4 text-ink-500">
                    {user.email}
                </span>
            </span>
        </button>
    );
}

function StatusBadge({ user }: { user: AdminUserListItem }) {
    return user.activeStatus ? (
        <Badge tone="ok" dot>
            Active
        </Badge>
    ) : (
        <Badge tone="bad" dot>
            Inactive
        </Badge>
    );
}

function RoleBadge({ user }: { user: AdminUserListItem }) {
    return <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>;
}

function VerificationBadge({ user }: { user: AdminUserListItem }) {
    if (user.verificationStatus === "NOT_SUBMITTED") return null;
    return (
        <Badge tone={VERIFICATION_TONES[user.verificationStatus]}>
            {VERIFICATION_LABELS[user.verificationStatus]}
        </Badge>
    );
}

const TH_CLASS =
    "px-5 py-3.5 text-sm font-medium leading-5 text-ink-500 first:pl-6 last:pr-6";
const TD_CLASS = "px-5 py-3.5 align-middle first:pl-6 last:pr-6";

/**
 * Responsive user directory.
 *
 * Desktop (≥ md) renders a real table; below that each row becomes a card
 * with the same information — the two layouts share `UserIdentity`,
 * `StatusBadge` and `RoleSelect`, so they can never drift apart. Row clicks
 * navigate to the detail page; controls inside the row stop propagation.
 */
export default function UsersTable({
    users,
    currentUserId,
    pendingUserId = null,
    onRoleChange,
    onToggleActive,
    onOpenUser,
}: UsersTableProps) {
    if (users.length === 0) {
        return (
            <EmptyState
                title="No users found"
                description="Try a different search term or clear the active filters."
            />
        );
    }

    const controls = (user: AdminUserListItem) => {
        const isSelf = user.id === currentUserId;
        const isPending = pendingUserId === user.id;

        return { isSelf, isPending };
    };

    return (
        <>
            {/* ---------------------------------------------------------------- */}
            {/* Desktop: table (≥ md)                                            */}
            {/* ---------------------------------------------------------------- */}
            <div className="hidden md:block">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="border-b border-grey-50">
                            <th scope="col" className={TH_CLASS}>
                                User
                            </th>
                            <th scope="col" className={TH_CLASS}>
                                Role
                            </th>
                            <th scope="col" className={TH_CLASS}>
                                Status
                            </th>
                            <th scope="col" className={`${TH_CLASS} hidden lg:table-cell`}>
                                Batch
                            </th>
                            <th scope="col" className={`${TH_CLASS} hidden xl:table-cell`}>
                                Joined
                            </th>
                            <th scope="col" className={`${TH_CLASS} text-right`}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => {
                            const { isSelf, isPending } = controls(user);
                            return (
                                <tr
                                    key={user.id}
                                    onClick={() => onOpenUser(user)}
                                    className="cursor-pointer border-b border-grey-50 transition-colors last:border-0 hover:bg-grey-25"
                                >
                                    <td className={TD_CLASS}>
                                        <UserIdentity
                                            user={user}
                                            onClick={() => onOpenUser(user)}
                                        />
                                    </td>
                                    <td className={TD_CLASS} onClick={stopRowClick}>
                                        <RoleSelect
                                            value={user.role}
                                            label={`Change role for ${user.username}`}
                                            disabled={isSelf || isPending}
                                            onChange={(role) =>
                                                onRoleChange(user, role)
                                            }
                                            triggerClassName="min-w-[148px]"
                                        />
                                    </td>
                                    <td className={TD_CLASS}>
                                        <StatusBadge user={user} />
                                    </td>
                                    <td className={`${TD_CLASS} hidden lg:table-cell`}>
                                        <span className="text-sm leading-5 text-ink-600">
                                            {user.batch?.name ?? "—"}
                                        </span>
                                    </td>
                                    <td className={`${TD_CLASS} hidden xl:table-cell`}>
                                        <span className="text-sm leading-5 text-ink-600">
                                            {formatDate(user.createdAt)}
                                        </span>
                                    </td>
                                    <td
                                        className={`${TD_CLASS} text-right`}
                                        onClick={stopRowClick}
                                    >
                                        <Button
                                            size="sm"
                                            variant={
                                                user.activeStatus
                                                    ? "outline"
                                                    : "secondary"
                                            }
                                            disabled={isSelf}
                                            loading={isPending}
                                            loadingLabel="Saving…"
                                            onClick={() => onToggleActive(user)}
                                        >
                                            {user.activeStatus
                                                ? "Deactivate"
                                                : "Activate"}
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Mobile / tablet: cards (< md)                                     */}
            {/* ---------------------------------------------------------------- */}
            <ul className="flex flex-col gap-3 p-4 md:hidden">
                {users.map((user) => {
                    const { isSelf, isPending } = controls(user);
                    return (
                        <li
                            key={user.id}
                            className="flex flex-col gap-3 rounded-2xl border border-grey-50 bg-surface p-4 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <UserIdentity
                                    user={user}
                                    onClick={() => onOpenUser(user)}
                                />
                                <StatusBadge user={user} />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <RoleBadge user={user} />
                                <VerificationBadge user={user} />
                                <span className="text-xs leading-4 text-ink-500">
                                    {user.batch?.name ?? "No batch"} · Joined{" "}
                                    {formatDate(user.createdAt)}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 border-t border-grey-50 pt-3">
                                <RoleSelect
                                    value={user.role}
                                    label={`Change role for ${user.username}`}
                                    disabled={isSelf || isPending}
                                    onChange={(role) => onRoleChange(user, role)}
                                    triggerClassName="min-w-[148px] flex-1 sm:flex-none"
                                />
                                <Button
                                    size="sm"
                                    variant={
                                        user.activeStatus ? "outline" : "secondary"
                                    }
                                    disabled={isSelf}
                                    loading={isPending}
                                    loadingLabel="Saving…"
                                    onClick={() => onToggleActive(user)}
                                >
                                    {user.activeStatus
                                        ? "Deactivate"
                                        : "Activate"}
                                </Button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
