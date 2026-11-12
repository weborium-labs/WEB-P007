
import type { RequestHandler, Response } from "express";
import type { Profile } from "passport-google-oauth20";
import ms from "ms";

import { env } from "../config/env.js";
import {
    createAuthTokens,
    findOrCreateGoogleUser,
    verifyRefreshToken,
} from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

const isProduction = env.NODE_ENV === "production";

const refreshTokenMaxAge = ms(
    env.REFRESH_TOKEN_EXPIRES_IN as ms.StringValue,
);

if (refreshTokenMaxAge === undefined || refreshTokenMaxAge <= 0) {
    throw new Error("Invalid REFRESH_TOKEN_EXPIRES_IN configuration.");
}

const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: REFRESH_COOKIE_PATH,
    maxAge: refreshTokenMaxAge,
};

const clearRefreshCookie = (res: Response): void => {
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: REFRESH_COOKIE_PATH,
    });
};

export const googleCallback: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        console.log("CALLBACK:", req.originalUrl);
        const profile = req.user as Profile | undefined;

        if (!profile) {
            throw new ApiError(
                401,
                "Google authentication failed.",
            );
        }

        // Read the role received by the callback
        const requestedRole = req.query.state;

        if (!requestedRole) {
            return res.status(400).json(new ApiResponse(400, [], 'User Role is required'));
        }

        const user = await findOrCreateGoogleUser(
            profile,
            requestedRole,
        );

        const { accessToken, refreshToken } =
            await createAuthTokens(user);

        res.cookie(
            REFRESH_COOKIE_NAME,
            refreshToken,
            refreshCookieOptions,
        );

        const frontendUrl = env.FRONTEND_URL.replace(/\/+$/, "");

        const redirectUrl = new URL(
            "/verify-token/",
            `${frontendUrl}/`,
        );

        redirectUrl.searchParams.set("token", accessToken);

        return res.redirect(redirectUrl.toString());
    } catch (error) {
        return next(error);
    }
};

export const refreshAccessToken: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

        if (
            !refreshToken ||
            typeof refreshToken !== "string"
        ) {
            throw new ApiError(
                401,
                "Refresh token is missing.",
            );
        }

        const user = await verifyRefreshToken(refreshToken);

        const {
            accessToken,
            refreshToken: newRefreshToken,
        } = await createAuthTokens(user);

        res.cookie(
            REFRESH_COOKIE_NAME,
            newRefreshToken,
            refreshCookieOptions,
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                { accessToken },
                "Access token refreshed successfully.",
            ),
        );
    } catch (error) {
        clearRefreshCookie(res);
        return next(error);
    }
};

export const logout: RequestHandler = (_req, res) => {
    clearRefreshCookie(res);

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Logged out successfully.",
        ),
    );
};
