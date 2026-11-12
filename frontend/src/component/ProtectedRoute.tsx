import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export function ProtectedRoute() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

    if (isBootstrapping) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#2862F4] border-r-transparent" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}