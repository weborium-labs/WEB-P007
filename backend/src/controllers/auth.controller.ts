import type { RequestHandler, Response } from "express";
import type { Profile } from "passport-google-oauth20";
import ms from "ms";

import { env } from "../config/env.js";
import { getValidated } from "../middlewares/validate.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    createAuthTokens,
    findOrCreateGoogleUser,
    forgotPassword as forgotPasswordService,
    login as loginService,
    resendOtp as resendOtpService,
    resetPassword as resetPasswordService,
    signup as signupService,
    verifyOtp as verifyOtpService,
    verifyRefreshToken,
    verifyResetOtp as verifyResetOtpService,
} from "../services/auth.service.js";
import type {
    ForgotPasswordInput,
    LoginInput,
    ResendOtpInput,
    ResetPasswordInput,
    SignupInput,
    VerifyOtpInput,
    VerifyResetOtpInput,
} from "../validators/auth.validator.js";

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
            return res.status(400).json(new ApiResponse(400, [], "User Role is required"));
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

// email login ///
export const signup: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<SignupInput>(req, "body");
    const data = await signupService(input);

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                data,
                "Registration successful. Please verify the OTP sent to your email.",
            ),
        );
});

export const verifyOtp: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<VerifyOtpInput>(req, "body");
    const { user } = await verifyOtpService(input);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "Email verified successfully. Please log in to continue.",
            ),
        );
});

export const resendOtp: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<ResendOtpInput>(req, "body");
    const data = await resendOtpService(input);

    return res
        .status(200)
        .json(
            new ApiResponse(200, data, "A new OTP has been sent to your email."),
        );
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<LoginInput>(req, "body");
    const { user, accessToken, refreshToken } = await loginService(input);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user, accessToken },
                "Logged in successfully.",
            ),
        );
});

// In auth.controller.ts
export const forgotPassword: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<ForgotPasswordInput>(req, "body");
    const data = await forgotPasswordService(input);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                data,
                "If an account exists, a password reset OTP has been sent.",
            ),
        );
});

export const verifyResetOtp: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<VerifyResetOtpInput>(req, "body");
    const data = await verifyResetOtpService(input);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "OTP verified successfully."));
});

export const resetPassword: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<ResetPasswordInput>(req, "body");
    const data = await resetPasswordService(input);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Password reset successfully. Please log in."));
});


