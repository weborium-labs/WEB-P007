import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "../../component/Button";
import UsersTable from "../../component/admin-dashboard/UsersTable";
import UsersToolbar from "../../component/admin-dashboard/UsersToolbar";
import PageHeader from "../../component/ui/PageHeader";
import Pagination from "../../component/ui/Pagination";
import { SORT_QUERY } from "../../data/admin.data";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminUsersQuery, useUpdateUserMutation } from "../../hooks/useAdminUsers";
import {
    usersSearchStateSchema,
    type ListUsersParams,
    type SortKey,
    type UserStatusFilter,
    type UserRole,
} from "../../lib/admin.schemas";
import { useAuthStore } from "../../store/auth.store";
import type { ApiClientError } from "../../api/apiClient";
import type { AdminUserListItem } from "../../lib/admin.schemas";

/** Rows per page — mirrors the backend default (`DEFAULT_PAGE_SIZE`). */
const PAGE_SIZE = 10;
/** How long the search box waits after the last keystroke before querying. */
const SEARCH_DEBOUNCE_MS = 400;

interface SearchState {
    page: number;
    q: string;
    role?: UserRole;
    status: UserStatusFilter;
    sort: SortKey;
}

const toSearchState = (params: URLSearchParams): SearchState => {
    const parsed = usersSearchStateSchema.safeParse({
        page: Number(params.get("page") ?? 1),
        q: params.get("q") ?? "",
        role: params.get("role") ?? undefined,
        status: params.get("status") ?? "all",
        sort: params.get("sort") ?? "newest",
    });

    return parsed.success
        ? parsed.data
        : { page: 1, q: "", status: "all", sort: "newest" };
};

/**
 * Admin user directory: search, role / status filters, sorting, pagination
 * and inline role + activation management.
 *
 * All view state lives in the URL (`?q=&role=&status=&sort=&page=`), so a
 * refresh, a shared link or the back button restores the exact view, and the
 * React Query cache is keyed by the same params.
 */
export default function UsersPage() {
    useDocumentTitle("Users");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentUserId = useAuthStore((s) => s.user?.id);

    const state = useMemo(() => toSearchState(searchParams), [searchParams]);

    /** Controlled input; the URL only updates after the debounce settles. */
    const [searchInput, setSearchInput] = useState(state.q);
    const debouncedSearch = useDebouncedValue(
        searchInput,
        SEARCH_DEBOUNCE_MS,
    );

    const updateParams = useCallback(
        (
            patch: Partial<SearchState>,
            options: { replace?: boolean } = {},
        ) => {
            const next = new URLSearchParams(searchParams);

            for (const [key, value] of Object.entries(patch)) {
                if (value === undefined || value === "") {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            }

            // Any filter change invalidates the current page index.
            if (!("page" in patch)) next.delete("page");

            setSearchParams(next, { replace: options.replace ?? true });
        },
        [searchParams, setSearchParams],
    );

    // Keep the input in step when the URL changes under us (back / forward).
    // Skipped when the URL change came from this input's own debounce, so an
    // in-flight keystroke is never overwritten. Adjusted during render
    // (React's "adjusting state when props change" pattern) rather than in an
    // effect, which would cascade an extra render on every URL change.
    const [lastSyncedQ, setLastSyncedQ] = useState(state.q);
    if (state.q !== lastSyncedQ && state.q !== debouncedSearch.trim()) {
        setLastSyncedQ(state.q);
        setSearchInput(state.q);
    }

    // Push the debounced term into the URL.
    useEffect(() => {
        const trimmed = debouncedSearch.trim();
        if (trimmed === state.q) return;
        updateParams({ q: trimmed || undefined });
    }, [debouncedSearch, state.q, updateParams]);

    const params = useMemo<ListUsersParams>(
        () => ({
            page: state.page,
            limit: PAGE_SIZE,
            search: state.q || undefined,
            role: state.role,
            status: state.status,
            ...SORT_QUERY[state.sort],
        }),
        [state],
    );

    const usersQuery = useAdminUsersQuery(params);
    const updateUser = useUpdateUserMutation();

    const handleRoleChange = (user: AdminUserListItem, role: UserRole) => {
        if (role === user.role) return;
        updateUser.mutate({ userId: user.id, payload: { role } });
    };

    const handleToggleActive = (user: AdminUserListItem) => {
        updateUser.mutate({
            userId: user.id,
            payload: { activeStatus: !user.activeStatus },
        });
    };

    const data = usersQuery.data;
    const resultLabel = data
        ? data.meta.total === 0
            ? "No results"
            : `${data.meta.total} ${data.meta.total === 1 ? "user" : "users"}`
        : undefined;

    const mutationError = updateUser.error as ApiClientError | null;

    return (
        <main className="@container flex min-h-screen flex-col gap-6 bg-grey-25 pb-8 pl-4 pr-4 pt-6 font-inter sm:pl-10 sm:pr-[34px] sm:pt-8">
            <PageHeader
                title="Users"
                subtitle="Manage roles and access for every account."
                actions={
                    <Button
                        variant="outline"
                        size="md"
                        onClick={() => navigate("/admin/dashboard")}
                    >
                        Dashboard
                    </Button>
                }
            />

            <UsersToolbar
                search={searchInput}
                onSearchChange={setSearchInput}
                role={state.role ?? "all"}
                onRoleChange={(role) =>
                    updateParams({ role: role === "all" ? undefined : role })
                }
                status={state.status}
                onStatusChange={(status) =>
                    updateParams({
                        status: status === "all" ? undefined : status,
                    })
                }
                sort={state.sort}
                onSortChange={(sort) =>
                    updateParams({ sort: sort === "newest" ? undefined : sort })
                }
                resultLabel={resultLabel}
                isSearching={usersQuery.isFetching}
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

            <section className="overflow-hidden rounded-2xl border border-grey-50 bg-surface shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]">
                {usersQuery.isPending ? (
                    <div
                        aria-hidden="true"
                        className="flex flex-col gap-3 p-5"
                    >
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-12 animate-pulse rounded-lg bg-grey-50"
                            />
                        ))}
                    </div>
                ) : usersQuery.isError ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                        <p className="text-base font-semibold leading-6 text-ink">
                            Couldn&rsquo;t load users
                        </p>
                        <p className="max-w-sm text-sm leading-5 text-ink-500">
                            {(usersQuery.error as ApiClientError)?.message ??
                                "Something went wrong while loading the directory."}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void usersQuery.refetch()}
                        >
                            Try again
                        </Button>
                    </div>
                ) : (
                    <UsersTable
                        users={data?.items ?? []}
                        currentUserId={currentUserId ?? ""}
                        pendingUserId={
                            updateUser.isPending ? updateUser.variables?.userId : null
                        }
                        onRoleChange={handleRoleChange}
                        onToggleActive={handleToggleActive}
                        onOpenUser={(user) => navigate(`/admin/users/${user.id}`)}
                    />
                )}
            </section>

            {data && (
                <Pagination
                    page={data.meta.page}
                    totalPages={data.meta.totalPages}
                    total={data.meta.total}
                    limit={data.meta.limit}
                    itemLabel="users"
                    onPageChange={(page) =>
                        updateParams({ page }, { replace: false })
                    }
                />
            )}
        </main>
    );
}
