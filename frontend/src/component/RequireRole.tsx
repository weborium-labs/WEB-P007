import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../store/auth.store";
import type { UserRole } from "../lib/admin.schemas";

interface RequireRoleProps {
    /** Roles allowed through; everyone else is sent to their own dashboard. */
    roles: readonly UserRole[];
}

/**
 * Role gate for restricted route groups.
 *
 * Sits *inside* `ProtectedRoute`, so authentication is already proven here —
 * this only compares the session role (loaded from the store) against the
 * allowed set. Bootstrapping shows the same spinner as `ProtectedRoute` so a
 * hard refresh never flashes a redirect at an admin.
 *
 * Non-admins land on `/dashboard`, which resolves to their own role's page.
 */
export function RequireRole({ roles }: RequireRoleProps) {
    const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
    const role = useAuthStore((s) => s.user?.role);

    if (isBootstrapping) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-canvas">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-r-transparent" />
            </div>
        );
    }

    if (!role || !roles.includes(role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
