import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/apiClient";
import { useAuthStore, type AuthUser } from "../store/auth.store";

const ROLE_MAP: Record<string, "INTERN" | "GPM"> = {
    Intern: "INTERN",
    Group_manager: "GPM",
};

interface AuthResponse {
    data: {
        user: AuthUser;
        accessToken: string;
    };
    message: string;
}

export function useSignupMutation() {
    return useMutation({
        mutationFn: async (payload: {
            email: string;
            fullName: string;
            password: string;
            confirmPassword: string;
            role: string;
        }) => {
            const { data } = await apiClient.post("/auth/signup", {
                email: payload.email,
                username: payload.fullName,
                password: payload.password,
                confirmPassword: payload.confirmPassword,
                role: ROLE_MAP[payload.role] || "INTERN",
            });
            return data;
        },
    });
}

export function useVerifyOtpMutation() {
    const setAuth = useAuthStore((s) => s.setAuth);

    return useMutation({
        mutationFn: async (payload: { email: string; otp: string }) => {
            const { data } = await apiClient.post<AuthResponse>(
                "/auth/verify-otp",
                payload,
            );
            return data.data;
        },
        onSuccess: ({ user, accessToken }) => {
            setAuth(user, accessToken);
        },
    });
}

export function useResendOtpMutation() {
    return useMutation({
        mutationFn: async (email: string) => {
            const { data } = await apiClient.post("/auth/resend-otp", { email });
            return data;
        },
    });
}

export function useLoginMutation() {
    const setAuth = useAuthStore((s) => s.setAuth);

    return useMutation({
        mutationFn: async (payload: { identifier: string; password: string }) => {
            const { data } = await apiClient.post<AuthResponse>(
                "/auth/login",
                payload,
            );
            return data.data;
        },
        onSuccess: ({ user, accessToken }) => {
            setAuth(user, accessToken);
        },
    });
}

/**
 * Redeems the single-use OAuth authorization code from `/verify-token`.
 *
 * The backend never puts a reusable access token in the URL — this mutation
 * exchanges the code for `{ accessToken, user }` and sets the HTTP-only
 * refresh cookie in the same response.
 */
export function useExchangeGoogleCodeMutation() {
    const setAuth = useAuthStore((s) => s.setAuth);

    return useMutation({
        mutationFn: async (code: string) => {
            const { data } = await apiClient.post<AuthResponse>(
                "/auth/google/exchange",
                { code },
            );
            return data.data;
        },
        onSuccess: ({ user, accessToken }) => {
            setAuth(user, accessToken);
        },
    });
}

/**
 * Logs the user out.
 *
 * Backend clears the HTTP-only refresh cookie (the access token is memory-only
 * and simply disappears with the store). Local cleanup runs `onSettled` so the
 * session is torn down even when the network call fails — a failed logout must
 * never leave a half-authenticated UI behind.
 */
export function useLogoutMutation() {
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post("/auth/logout");
            return data;
        },
        onSettled: () => {
            clearAuth();
            // Drop every cached query so no user data survives the session.
            queryClient.clear();
        },
    });
}

export function useForgotPasswordMutation() {
    return useMutation({
        mutationFn: async (email: string) => {
            const { data } = await apiClient.post("/auth/forgot-password", {
                email,
            });
            return data;
        },
    });
}

export function useVerifyResetOtpMutation() {
    return useMutation({
        mutationFn: async (payload: { email: string; otp: string }) => {
            const { data } = await apiClient.post("/auth/verify-reset-otp", payload);
            return data;
        },
    });
}

export function useResetPasswordMutation() {
    return useMutation({
        mutationFn: async (payload: {
            email: string;
            otp: string;
            newPassword: string;
            confirmPassword: string;
        }) => {
            const { data } = await apiClient.post("/auth/reset-password", payload);
            return data;
        },
    });
}