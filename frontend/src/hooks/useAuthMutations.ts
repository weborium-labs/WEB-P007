import { useMutation } from "@tanstack/react-query";
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