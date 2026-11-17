import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "../api/apiClient";
import {
    adminUserListItemSchema,
    adminUserStatsSchema,
    listUsersParamsSchema,
    listUsersResponseSchema,
    updateUserPayloadSchema,
    type AdminUserListItem,
    type AdminUserStats,
    type ListUsersParams,
    type ListUsersResponse,
    type UpdateUserPayload,
} from "../lib/admin.schemas";

/**
 * React Query hooks for `/admin/users`.
 *
 * Every response is parsed with its Zod schema inside `queryFn`, so a
 * contract drift fails the query (and surfaces in the error state) instead of
 * rendering `undefined`. Mutations invalidate the whole `admin` key branch —
 * the list, the dashboard's recent users and the per-user stats all depend on
 * the same writes.
 */

/** Envelope produced by the backend's `ApiResponse`. */
interface ApiEnvelope<T> {
    data: T;
    message: string;
}

export const adminKeys = {
    dashboard: ["admin", "dashboard"] as const,
    users: (params: ListUsersParams) => ["admin", "users", params] as const,
    userStats: (userId: string) => ["admin", "user-stats", userId] as const,
};

/**
 * Paginated, searchable user directory.
 *
 * `placeholderData: keepPreviousData` keeps the current page on screen while
 * the next page loads, so pagination and search never flash an empty state.
 */
export function useAdminUsersQuery(params: ListUsersParams) {
    const validated = listUsersParamsSchema.parse(params);

    return useQuery<ListUsersResponse>({
        queryKey: adminKeys.users(validated),
        queryFn: async () => {
            const { data } = await apiClient.get<ApiEnvelope<ListUsersResponse>>(
                "/admin/users",
                { params: validated },
            );
            return listUsersResponseSchema.parse(data.data);
        },
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
    });
}

/** Full stats bundle for one user (detail page). */
export function useAdminUserStatsQuery(userId: string) {
    return useQuery<AdminUserStats>({
        queryKey: adminKeys.userStats(userId),
        queryFn: async () => {
            const { data } = await apiClient.get<ApiEnvelope<unknown>>(
                `/admin/users/${encodeURIComponent(userId)}`,
            );
            return adminUserStatsSchema.parse(data.data);
        },
        enabled: userId.length > 0,
        staleTime: 60 * 1000,
    });
}

export interface UpdateUserVariables {
    userId: string;
    payload: UpdateUserPayload;
}

/** Role / activation change. Returns the refreshed list-row representation. */
export function useUpdateUserMutation() {
    const queryClient = useQueryClient();

    return useMutation<AdminUserListItem, unknown, UpdateUserVariables>({
        mutationFn: async ({ userId, payload }) => {
            // Client-side validation mirrors the backend schema so an empty
            // or malformed payload never leaves the browser.
            const body = updateUserPayloadSchema.parse(payload);
            const { data } = await apiClient.patch<ApiEnvelope<unknown>>(
                `/admin/users/${encodeURIComponent(userId)}`,
                body,
            );
            return adminUserListItemSchema.parse(data.data);
        },
        onSuccess: () => {
            // The list rows, the dashboard's recent users and the detail
            // stats all change together — one invalidation covers them.
            void queryClient.invalidateQueries({ queryKey: ["admin"] });
        },
    });
}
