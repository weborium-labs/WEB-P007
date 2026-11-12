import { useEffect, useRef, type ReactNode } from "react";
import { apiClient } from "../api/apiClient";
import { useAuthStore, type AuthUser } from "../store/auth.store";

export function AuthInitializer({ children }: { children: ReactNode }) {
    const initialized = useRef(false);
    const setAuth = useAuthStore((s) => s.setAuth);
    const setAccessToken = useAuthStore((s) => s.setAccessToken);
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const restoreSession = async () => {
            try {
                // Browser automatically sends the httpOnly refreshToken cookie
                const { data } = await apiClient.post<{
                    data: { accessToken: string; user?: AuthUser };
                }>("/auth/refresh");

                const { accessToken, user } = data.data;

                if (user) {
                    setAuth(user, accessToken);
                } else {
                    setAccessToken(accessToken);
                    // Optional: fetch current user profile if /refresh only returns accessToken
                    // const meRes = await apiClient.get<{ data: AuthUser }>("/users/me");
                    // setAuth(meRes.data.data, accessToken);
                }
            } catch {
                // No valid refresh cookie -> user is simply logged out
                clearAuth();
            } finally {
                setBootstrapping(false);
            }
        };

        void restoreSession();
    }, [setAuth, setAccessToken, clearAuth, setBootstrapping]);

    return <>{children}</>;
}