import { create } from "zustand";

export interface AuthUser {
    id: string;
    email: string;
    username: string;
    role: "INTERN" | "HR" | "GPM" | "ADMIN";
    photoUrl?: string | null;
    batchId?: string | null;
    isEmailVerified: boolean;
    verificationStatus: string;
}

interface AuthState {
    user: AuthUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    setAuth: (user: AuthUser, accessToken: string) => void;
    setAccessToken: (accessToken: string) => void;
    setBootstrapping: (value: boolean) => void;
    clearAuth: () => void;
}

// One-time cleanup of the old persisted localStorage key
if (typeof window !== "undefined") {
    window.localStorage.removeItem("ims-auth-storage");
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isBootstrapping: true,

    setAuth: (user, accessToken) =>
        set({
            user,
            accessToken,
            isAuthenticated: true,
            isBootstrapping: false,
        }),

    setAccessToken: (accessToken) =>
        set({
            accessToken,
            isAuthenticated: Boolean(accessToken),
        }),

    setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),

    clearAuth: () =>
        set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isBootstrapping: false,
        }),
}));