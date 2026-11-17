import Avatar from "../intern-dashboard/Avatar";
import Badge from "../ui/Badge";
import Button from "../Button";
import RoleSelect from "./RoleSelect";
import {
    ROLE_LABELS,
    ROLE_TONES,
    VERIFICATION_LABELS,
    VERIFICATION_TONES,
} from "../../data/admin.data";
import { formatDate, formatDateTime, formatNumber, initialsOf } from "../../lib/format";
import type { AdminUserStats, UserRole } from "../../lib/admin.schemas";

interface UserProfileCardProps {
    stats: AdminUserStats;
    /** The signed-in admin viewing their own row — controls are locked. */
    isSelf: boolean;
    /** A role / activation mutation is in flight for this user. */
    isPending?: boolean;
    onRoleChange: (role: UserRole) => void;
    onToggleActive: () => void;
}

interface MetaItemProps {
    label: string;
    value: string;
}

function MetaItem({ label, value }: MetaItemProps) {
    return (
        <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-medium leading-4 text-ink-400">
                {label}
            </span>
            <span className="truncate text-sm leading-5 text-ink" title={value}>
                {value}
            </span>
        </div>
    );
}

const providersLabel = (providers: {
    password: boolean;
    google: boolean;
}) => {
    if (providers.password && providers.google) return "Password + Google";
    if (providers.password) return "Password";
    if (providers.google) return "Google";
    return "None";
};

/**
 * Identity, management controls and account meta for one user.
 *
 * Role and activation live here as well as in the list, so an admin can
 * manage an account from either place with identical guards: the caller's
 * own record is always locked, and the hint explains why.
 */
export default function UserProfileCard({
    stats,
    isSelf,
    isPending = false,
    onRoleChange,
    onToggleActive,
}: UserProfileCardProps) {
    const { profile } = stats;

    return (
        <section className="flex flex-col gap-5 rounded-2xl border border-grey-50 bg-surface p-5 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)] sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Avatar
                            initials={initialsOf(profile.username)}
                            gradient={profile.role === "INTERN" ? "blue" : "purple"}
                            size="lg"
                        />
                        <Badge tone={ROLE_TONES[profile.role]}>
                            {ROLE_LABELS[profile.role]}
                        </Badge>
                        {profile.activeStatus ? (
                            <Badge tone="ok" dot>
                                Active
                            </Badge>
                        ) : (
                            <Badge tone="bad" dot>
                                Inactive
                            </Badge>
                        )}
                        <Badge tone={VERIFICATION_TONES[profile.verificationStatus]}>
                            {VERIFICATION_LABELS[profile.verificationStatus]}
                        </Badge>
                        {!profile.isEmailVerified && (
                            <Badge tone="warn">Email unverified</Badge>
                        )}
                    </div>

                    <p className="text-sm leading-5 text-ink-500">
                        {profile.email}
                        {!profile.activeStatus && profile.deactivatedAt && (
                            <>
                                {" · deactivated "}
                                {formatDate(profile.deactivatedAt)}
                            </>
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <RoleSelect
                        value={profile.role}
                        label="Change role"
                        size="md"
                        disabled={isSelf || isPending}
                        onChange={onRoleChange}
                        triggerClassName="min-w-[176px]"
                    />
                    <Button
                        size="md"
                        variant={profile.activeStatus ? "outline" : "secondary"}
                        disabled={isSelf}
                        loading={isPending}
                        loadingLabel="Saving…"
                        onClick={onToggleActive}
                    >
                        {profile.activeStatus ? "Deactivate account" : "Activate account"}
                    </Button>
                </div>
            </div>

            {isSelf && (
                <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm leading-5 text-warn-strong">
                    This is your own account — role and activation changes are
                    locked here to prevent locking yourself out.
                </p>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-grey-50 pt-4 md:grid-cols-3 xl:grid-cols-4">
                <MetaItem
                    label="Batch"
                    value={profile.batch?.name ?? "No batch"}
                />
                <MetaItem
                    label="Joined"
                    value={formatDate(profile.createdAt)}
                />
                <MetaItem
                    label="Last login"
                    value={formatDateTime(profile.lastLoginAt)}
                />
                <MetaItem
                    label="Last activity"
                    value={formatDateTime(profile.lastActivityAt)}
                />
                <MetaItem
                    label="Overall score"
                    value={formatNumber(profile.score)}
                />
                <MetaItem
                    label="Sign-in methods"
                    value={providersLabel(profile.providers)}
                />
                <MetaItem
                    label="University"
                    value={profile.universityName ?? "—"}
                />
                <MetaItem label="Phone" value={profile.phone ?? "—"} />
            </dl>
        </section>
    );
}
