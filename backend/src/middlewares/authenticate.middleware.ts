import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import type { AuthContext } from "../types/express.js";
import { ApiError } from "../utils/ApiError.js";

const BEARER_PREFIX = "Bearer ";

export const authenticate: RequestHandler = async (req, _res, next) => {
    const header = req.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
        throw new ApiError(401, "Authentication required.");
    }

    const token = header.slice(BEARER_PREFIX.length).trim();

    let userId: string;

    try {
        const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
            algorithms: ["HS256"],
        });

        if (typeof payload === "string" || typeof payload.userId !== "string") {
            throw new Error("Malformed token payload.");
        }

        userId = payload.userId;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            // The `code` lets the frontend trigger POST /auth/refresh.
            throw new ApiError(401, "Access token expired.", [
                { code: "TOKEN_EXPIRED" },
            ]);
        }

        throw new ApiError(401, "Invalid access token.");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, activeStatus: true, batchId: true },
    });

    if (!user) {
        throw new ApiError(401, "Invalid session.");
    }

    if (!user.activeStatus) {
        throw new ApiError(
            403,
            "Your account has been deactivated. Please contact HR.",
        );
    }

    req.auth = {
        userId: user.id,
        role: user.role,
        batchId: user.batchId,
    };

    return next();
};

/** Returns the caller set by `authenticate`. Throws 401 if it did not run. */
export const getAuth = (req: Request): AuthContext => {
    if (!req.auth) {
        throw new ApiError(401, "Authentication required.");
    }

    return req.auth;
};