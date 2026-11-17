import SearchInput from "../ui/SearchInput";
import Dropdown from "../ui/Dropdown";
import {
    ROLE_FILTER_OPTIONS,
    SORT_OPTIONS,
    STATUS_OPTIONS,
} from "../../data/admin.data";
import type {
    SortKey,
    UserRole,
    UserStatusFilter,
} from "../../lib/admin.schemas";

interface UsersToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    role: UserRole | "all";
    onRoleChange: (value: UserRole | "all") => void;
    status: UserStatusFilter;
    onStatusChange: (value: UserStatusFilter) => void;
    sort: SortKey;
    onSortChange: (value: SortKey) => void;
    /** Result summary shown right of the controls (e.g. "128 users"). */
    resultLabel?: string;
    isSearching?: boolean;
}

/**
 * Search + filters strip above the users table.
 *
 * All controls are controlled by the page (which keeps them in the URL), so
 * a refresh or a back-navigation restores the exact view.
 */
export default function UsersToolbar({
    search,
    onSearchChange,
    role,
    onRoleChange,
    status,
    onStatusChange,
    sort,
    onSortChange,
    resultLabel,
    isSearching = false,
}: UsersToolbarProps) {
    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-1">
                <SearchInput
                    value={search}
                    onChange={onSearchChange}
                    label="Search users by username or email"
                    placeholder="Search username or email…"
                    className="w-full sm:max-w-[360px] lg:flex-1"
                />

                <Dropdown
                    value={role}
                    options={ROLE_FILTER_OPTIONS}
                    onChange={onRoleChange}
                    label="Filter by role"
                    size="md"
                    triggerClassName="w-full sm:w-auto lg:min-w-[168px]"
                />

                <Dropdown
                    value={status}
                    options={STATUS_OPTIONS}
                    onChange={onStatusChange}
                    label="Filter by account status"
                    size="md"
                    triggerClassName="w-full sm:w-auto lg:min-w-[168px]"
                />

                <Dropdown
                    value={sort}
                    options={[...SORT_OPTIONS]}
                    onChange={onSortChange}
                    label="Sort users"
                    size="md"
                    triggerClassName="w-full sm:w-auto lg:min-w-[168px]"
                />
            </div>

            {resultLabel && (
                <p
                    aria-live="polite"
                    className={`shrink-0 text-sm leading-5 text-ink-500 transition-opacity ${
                        isSearching ? "opacity-60" : "opacity-100"
                    }`}
                >
                    {resultLabel}
                </p>
            )}
        </div>
    );
}
