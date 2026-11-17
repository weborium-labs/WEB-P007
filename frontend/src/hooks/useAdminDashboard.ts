import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../api/apiClient";
import {
    adminDashboardStatsSchema,
    type AdminDashboardStats,
} from "../lib/admin.schemas";
import { adminKeys } from "./useAdminUsers";

/** Envelope produced by the backend's `ApiResponse`. */
interface ApiEnvelope<T> {
    data: T;
    message: string;
}

/** Aggregated counts behind the admin dashboard overview. */
export function useAdminDashboardStatsQuery() {
    return useQuery<AdminDashboardStats>({
        queryKey: adminKeys.dashboard,
        queryFn: async () => {
            const { data } = await apiClient.get<ApiEnvelope<unknown>>(
                "/admin/stats",
            );
            return adminDashboardStatsSchema.parse(data.data);
        },
        staleTime: 60 * 1000,
    });
}
