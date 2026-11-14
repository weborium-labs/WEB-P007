import type { RequestHandler, Response } from "express";
import type { Profile } from "passport-google-oauth20";
import ms from "ms";

import { env } from "../config/env.js";
import passport from "../config/passport.js";
import { getValidated } from "../middlewares/validate.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    createAuthTokens,
    forgotPassword as forgotPasswordService,
    login as loginService,
    resendOtp as resendOtpService,
    resetPassword as resetPasswordService,
    signup as signupService,
    toPublicUser,
    verifyOtp as verifyOtpService,
    verifyRefreshToken,
    verifyResetOtp as verifyResetOtpService,
} from "../services/auth.service.js";
import {
    consumeAuthCode,
    issueAuthCode,
} from "../services/auth-code.service.js";
import { findOrCreateGoogleUser, linkGoogleAccount } from "../services/google-auth.service.js";
import {
    clearNonceCookie,
    generateOAuthNonce,
    OAUTH_NONCE_COOKIE,
    setNonceCookie,
    signLinkState,
    signLoginState,
    verifyOAuthState,
    type OAuthState,
} from "../services/oauth-state.service.js";
import type {
    ExchangeCodeInput,
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

/* -------------------------------------------------------------------------- */
/*  Google OAuth                                                              */
/* -------------------------------------------------------------------------- */

const GOOGLE_SCOPES = ["openid", "profile", "email"] as const;
const VALID_GOOGLE_ROLES: readonly string[] = [
    "Intern",
    "Group_manager",
    "HR",
];

/** Safe, non-leaking frontend failure reasons for the OAuth redirect flow. */
const FAILURE_REASON_BY_CODE: Readonly<Record<string, string>> = {
    ACCOUNT_EXISTS: "account_exists",
    GOOGLE_EMAIL_UNVERIFIED: "email_not_verified",
    ACCOUNT_INACTIVE: "account_inactive",
    PROFILE_INCOMPLETE: "profile_incomplete",
    INVALID_ROLE: "role_required",
    // Account-linking failures (all reported on /profile, never raw).
    EMAIL_MISMATCH: "link_email_mismatch",
    GOOGLE_ALREADY_LINKED: "link_google_taken",
    ALREADY_LINKED: "link_already_linked",
};

/** Safe redirect back to the SPA (never carries tokens — only codes/reasons). */
const redirectToFrontend = (
    res: Response,
    path: string,
    params?: Readonly<Record<string, string>>,
): void => {
    const frontendUrl = env.FRONTEND_URL.replace(/\/+$/, "");
    const url = new URL(path, `${frontendUrl}/`);

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
    }

    res.redirect(url.toString());
};

/**
 * Step 1 of the Google flow.
 *
 * `GET /api/v1/auth/google?role=X` starts a login (role travels inside a
 * signed, nonce-bound state), while `GET /api/v1/auth/google?state=<signed>`
 * resumes an authenticated account-linking flow started by the user profile.
 * A raw/unsigned state never reaches Google.
 */
export const startGoogleAuth: RequestHandler = (req, res, next) => {
    try {
        const rawState = req.query.state;
        let state: string;

        if (typeof rawState === "string" && rawState.length > 0) {
            verifyOAuthState(rawState, req.cookies?.[OAUTH_NONCE_COOKIE]);
            state = rawState;
        } else {
            const role = req.query.role;

            if (
                typeof role !== "string" ||
                !VALID_GOOGLE_ROLES.includes(role)
            ) {
                return res
                    .status(400)
                    .json(new ApiResponse(400, [], "User Role is required"));
            }

            const nonce = generateOAuthNonce();
            setNonceCookie(res, nonce);
            state = signLoginState(role, nonce);
        }

        return passport.authenticate("google", {
            scope: [...GOOGLE_SCOPES],
            session: false,
            state,
        })(req, res, next);
    } catch (error) {
        // An invalid pre-signed state during a browser navigation gets a
        // friendly redirect instead of a raw JSON body. The login flow never
        // sends a `state` param (it sends `role`), so a presented-but-invalid
        // state is always a linking attempt -> back to /profile.
        if (error instanceof ApiError) {
            clearNonceCookie(res);

            if (typeof req.query.state === "string" && req.query.state) {
                return redirectToFrontend(res, "/profile", {
                    link_error: "invalid_state",
                });
            }

            return redirectToFrontend(res, "/auth/failure", {
                reason: "invalid_state",
            });
        }

        return next(error);
    }
};

/**
 * Passport-level OAuth failures (user denied consent, provider error) land
 * here and are translated to a safe frontend reason.
 *
 * Google echoes the signed `state` back on error redirects, so a verifiable
 * link-mode state sends the user (still signed in) back to /profile instead
 * of the login-failure page.
 */
export const oauthFailure: RequestHandler = (req, res) => {
    const error = typeof req.query.error === "string" ? req.query.error : "";
    const reason = error === "access_denied" ? "access_denied" : "oauth_failed";

    let isLinkFlow = false;

    try {
        const state = verifyOAuthState(
            req.query.state,
            req.cookies?.[OAUTH_NONCE_COOKIE],
        );
        isLinkFlow = state.mode === "link";
    } catch {
        // No verifiable state -> treat as a login-flow failure.
    }

    clearNonceCookie(res);

    if (isLinkFlow) {
        return redirectToFrontend(res, "/profile", { link_error: reason });
    }

    return redirectToFrontend(res, "/auth/failure", { reason });
};

/**
 * Handles provider-reported errors (`?error=...`) *before* Passport so the
 * signed `state` is not lost in a failureRedirect hop — without it, a denied
 * consent during linking could not find its way back to /profile.
 */
export const forwardProviderError: RequestHandler = (req, res, next) => {
    const error = req.query.error;

    if (typeof error === "string" && error.length > 0) {
        return oauthFailure(req, res, next);
    }

    return next();
};

/**
 * Step 2 of the Google flow.
 *
 * Verifies the signed state + nonce binding, resolves or creates the user,
 * then redirects to the SPA with a **single-use code** — never with a
 * reusable access token.
 */
export const googleCallback: RequestHandler = async (req, res, next) => {
    // Link failures return to /profile (the user stays signed in); login
    // failures land on the dedicated failure page.
    let flowMode: "login" | "link" = "login";

    const fail = (reason: string): void => {
        clearNonceCookie(res);

        if (flowMode === "link") {
            return redirectToFrontend(res, "/profile", {
                link_error: reason,
            });
        }

        return redirectToFrontend(res, "/auth/failure", { reason });
    };

    try {
        const profile = req.user as Profile | undefined;

        if (!profile) {
            return fail("oauth_failed");
        }

        let state: OAuthState;

        try {
            state = verifyOAuthState(
                req.query.state,
                req.cookies?.[OAUTH_NONCE_COOKIE],
            );
        } catch {
            return fail("invalid_state");
        }

        // The nonce is single-use: consumed as soon as the state verifies.
        clearNonceCookie(res);
        flowMode = state.mode;

        if (state.mode === "link") {
            // Explicit account linking: attach this Google identity to the
            // account that initiated the flow (email match enforced inside
            // the service), then return to the profile page with a safe
            // status flag — never a token.
            await linkGoogleAccount(state.userId, profile);

            return redirectToFrontend(res, "/profile", { link: "success" });
        }

        const user = await findOrCreateGoogleUser(profile, state.role);
        const code = await issueAuthCode(user.id);

        return redirectToFrontend(res, "/verify-token", { code });
    } catch (error) {
        if (error instanceof ApiError) {
            const failureCode =
                typeof error.errors[0] === "object" &&
                error.errors[0] !== null &&
                "code" in error.errors[0]
                    ? String(
                          (error.errors[0] as { code?: unknown }).code ?? "",
                      )
                    : "";

            return fail(FAILURE_REASON_BY_CODE[failureCode] ?? "oauth_failed");
        }

        return next(error);
    }
};

/**
 * Step 3 of the Google flow.
 *
 * `POST /auth/google/exchange { code }` redeems the single-use code and
 * establishes the session (refresh cookie + access token + safe user).
 */
export const exchangeGoogleCode: RequestHandler = asyncHandler(
    async (req, res) => {
        const { code } = getValidated<ExchangeCodeInput>(req, "body");

        const user = await consumeAuthCode(code);

        const { accessToken, refreshToken } = await createAuthTokens(user);

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

        return res.status(200).json(
            new ApiResponse(
                200,
                { accessToken, user: toPublicUser(user) },
                "Signed in successfully.",
            ),
        );
    },
);

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
                { accessToken, user: toPublicUser(user) },
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
    const { user, accessToken, refreshToken } = await verifyOtpService(input);

    // Establish the session in the same step the frontend verifies its email,
    // so the store never ends up "authenticated" without a token.
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user, accessToken },
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


