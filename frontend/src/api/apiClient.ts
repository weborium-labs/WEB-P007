import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth.store";

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<{ message?: string; errors?: { message: string }[] }>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes("/auth/login") &&
            !originalRequest.url?.includes("/auth/refresh")
        ) {
            originalRequest._retry = true;
            try {
                const { data } = await apiClient.post<{
                    data: { accessToken: string };
                }>("/auth/refresh");
                const newToken = data.data.accessToken;
                useAuthStore.getState().setAccessToken(newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
            } catch {
                useAuthStore.getState().clearAuth();
            }
        }

        // Extract field-level validation message if present, else main message
        const firstFieldError = error.response?.data?.errors?.[0]?.message;
        const backendMessage =
            firstFieldError ||
            error.response?.data?.message ||
            error.message ||
            "Something went wrong. Please try again.";

        return Promise.reject({
            code: error.response?.status === 400 ? "OTP_INVALID" : undefined,
            message: backendMessage,
            status: error.response?.status,
        });
    },
);