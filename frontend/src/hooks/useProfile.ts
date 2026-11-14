import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../api/apiClient";
import { useAuthStore } from "../store/auth.store";

/**
 * Profile data for the signed-in user (`/users/me`).
 *
 * The server response is the source of truth for editable fields and for
 * provider status (`providers.password` / `providers.google` are derived
 * server-side from the stored credentials, never from the legacy authType).
 */

export interface UserProfile {
    id: string;
    email: string;
    username: string;
    role: "INTERN" | "HR" | "GPM" | "ADMIN";
    photoUrl: string | null;
    batchId: string | null;
    isEmailVerified: boolean;
    verificationStatus: string;
    phone: string | null;
    dob: string | null;
    universityName: string | null;
    createdAt: string;
    providers: {
        password: boolean;
        google: boolean;
    };
}

interface ProfileResponse {
    data: UserProfile;
    message: string;
}

export function useProfileQuery() {
    return useQuery({
        queryKey: ["profile"],
        queryFn: async () => {
            const { data } = await apiClient.get<ProfileResponse>("/users/me");
            return data.data;
        },
        // The session is restored before this renders (ProtectedRoute), so
        // the query is safe to run immediately.
        staleTime: 60 * 1000,
    });
}

export interface UpdateProfilePayload {
    username?: string;
    phone?: string;
    dob?: string;
    universityName?: string;
    photoUrl?: string | null;
}

export function useUpdateProfileMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UpdateProfilePayload) => {
            const { data } = await apiClient.patch<ProfileResponse>(
                "/users/me",
                payload,
            );
            return data.data;
        },
        onSuccess: (profile) => {
            // Write the server's response straight into the cache: no
            // invalidate + refetch round-trip for data we already have.
            queryClient.setQueryData(["profile"], profile);
        },
    });
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function useChangePasswordMutation() {
    return useMutation({
        mutationFn: async (payload: ChangePasswordPayload) => {
            const { data } = await apiClient.post("/users/me/password", payload);
            return data;
        },
    });
}

/**
 * Starts the Google account-linking flow (Feature 3).
 *
 * The backend returns a signed, nonce-bound `state`; we then hand the
 * browser to `GET /auth/google?state=...`, which runs the normal OAuth
 * consent redirect. The callback attaches the Google identity to *this*
 * account (email match enforced server-side) and returns to /profile with a
 * safe `link=` / `link_error=` flag — never with tokens in the URL.
 */
export function useLinkGoogleMutation() {
    return useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post<{
                data: { state: string };
            }>("/users/me/google/link/init");

            const base = (apiClient.defaults.baseURL ?? "").replace(
                /\/+$/,
                "",
            );

            if (!base) {
                throw new Error("API base URL is not configured.");
            }

            // Full browser navigation: the OAuth flow leaves the SPA.
            window.location.href = `${base}/auth/google?state=${encodeURIComponent(data.data.state)}`;

            return data.data;
        },
    });
}

/**
 * Keeps the cached auth-store user in step after a profile edit (e.g. a new
 * photo URL shown in the top bar) without a second network round-trip.
 */
export function useSyncAuthUser() {
    const setAuth = useAuthStore((s) => s.setAuth);
    const accessToken = useAuthStore((s) => s.accessToken);

    return (profile: UserProfile) => {
        if (!accessToken) return;

        setAuth(
            {
                id: profile.id,
                email: profile.email,
                username: profile.username,
                role: profile.role,
                photoUrl: profile.photoUrl,
                batchId: profile.batchId,
                isEmailVerified: profile.isEmailVerified,
                verificationStatus: profile.verificationStatus,
            },
            accessToken,
        );
    };
}
