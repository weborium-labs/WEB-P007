import type { AuthUser } from "../store/auth.store";

/**
 * Single source of truth for "which dashboard does this role get".
 *
 * Used by the login flow, the OAuth code exchange and the `/dashboard`
 * redirect so every entry point lands on the same place for a given role.
 * Keep this in sync with the dashboard routes registered in `App.tsx`.
 */
export const dashboardPathForRole = (role: AuthUser["role"]): string => {
    switch (role) {
        case "HR":
            return "/hr/dashboard";
        case "GPM":
            return "/gpm/dashboard";
        case "ADMIN":
            return "/admin/dashboard";
        case "INTERN":
        default:
            return "/intern/dashboard";
    }
};
