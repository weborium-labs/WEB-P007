import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth.store";

/**
 * Normalized error shape every caller receives from `apiClient`.
 *
 * `code` and `field` come straight from the backend's structured `errors`
 * array (e.g. `{ code: "USERNAME_TAKEN", field: "username" }`) so components
 * can branch on meaning instead of matching message strings.
 */
export interface ApiClientError {
    status?: number;
    message: string;
    code?: string;
    field?: string;
}

interface BackendErrorEntry {
    code?: unknown;
    field?: unknown;
    path?: unknown;
    message?: unknown;
}

/** Application codes are SCREAMING_SNAKE_CASE; Zod issue codes are lower_snake. */
const APP_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const pickStructuredError = (
    errors: unknown,
): BackendErrorEntry | undefined => {
    if (!Array.isArray(errors)) return undefined;

    return errors.find(
        (entry): entry is BackendErrorEntry =>
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as BackendErrorEntry).code === "string" &&
            APP_CODE_PATTERN.test((entry as BackendErrorEntry).code as string),
    );
};

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
    async (
        error: AxiosError<{
            message?: string;
            errors?: unknown;
        }>,
    ) => {
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

        const errors = error.response?.data?.errors;
        const structured = pickStructuredError(errors);

        // Field-level validation message if present, else the top-level one.
        const fieldMessage = Array.isArray(errors)
            ? (errors[0] as BackendErrorEntry | undefined)?.message
            : undefined;
        const backendMessage =
            (typeof fieldMessage === "string" ? fieldMessage : undefined) ||
            error.response?.data?.message ||
            error.message ||
            "Something went wrong. Please try again.";

        const status = error.response?.status;
        const structuredCode =
            typeof structured?.code === "string" ? structured.code : undefined;
        const field =
            typeof structured?.field === "string"
                ? structured.field
                : typeof structured?.path === "string"
                  ? structured.path
                  : undefined;

        // Back-compat shim: the OTP screens branch on `code === "OTP_INVALID"`,
        // but the backend reports OTP failures as plain 400s. Scope that legacy
        // signal to the two OTP endpoints only — every other 400 keeps its real
        // code (or none) instead of being mislabelled as an OTP failure.
        const url = originalRequest?.url ?? error.config?.url ?? "";
        const isOtpEndpoint = /\/auth\/(verify-otp|verify-reset-otp)$/.test(url);
        const code =
            structuredCode ??
            (status === 400 && isOtpEndpoint ? "OTP_INVALID" : undefined);

        return Promise.reject({
            message: backendMessage,
            status,
            code,
            field,
        } satisfies ApiClientError);
    },
);