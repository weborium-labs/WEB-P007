import type { RequestHandler } from "express";

import type { Role } from "../generated/prisma/client.js";
import { ApiError } from "../utils/ApiError.js";

/**
 *   router.post("/", authorize(Role.ADMIN, Role.HR), handler);
 */
export const authorize = (...allowedRoles: Role[]): RequestHandler => {
    if (allowedRoles.length === 0) {
        throw new Error("authorize() requires at least one role.");
    }

    const allowed = new Set<Role>(allowedRoles);

    return (req, _res, next) => {
        if (!req.auth) {
            return next(new ApiError(401, "Authentication required."));
        }

        if (!allowed.has(req.auth.role)) {
            return next(
                new ApiError(
                    403,
                    "You do not have permission to perform this action.",
                ),
            );
        }

        return next();
    };
};