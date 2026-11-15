import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * OAuth `state` hardening.
 *
 * The state that travels through Google is a signed, short-lived JWT bound to
 * a single-use nonce that is also stored in an HttpOnly cookie on the API
 * host. The callback refuses any request where the state signature, the TTL,
 * the purpose claim, or the cookie/param nonce binding does not match — which
 * defeats OAuth login CSRF and state replay.
 *
 * Two modes exist:
 *  - `login` — a plain Google sign-in. The role no longer travels here: a
 *    brand-new identity is *never* given an implicit role. The callback hands
 *    the SPA a `pending` token (see below) and the user picks their role.
 *  - `link`  — carries the *already authenticated* user who asked to connect
 *              Google to their existing account (account linking, Feature 3).
 */

/** HttpOnly, double-submit CSRF cookie for the in-flight OAuth flow. */
export const OAUTH_NONCE_COOKIE = "oauthNonce";
export const OAUTH_NONCE_TTL_MS = 10 * 60 * 1000;
export const OAUTH_NONCE_COOKIE_PATH = "/";

const STATE_PURPOSE = "google_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

export type OAuthState =
    | { mode: "login"; nonce: string }
    | { mode: "link"; userId: string; nonce: string };

interface StateClaims {
    purpose: string;
    nonce: string;
    mode: "login" | "link";
    userId?: string;
}

export const generateOAuthNonce = (): string =>
    randomBytes(16).toString("base64url");

/** Shared cookie options for the single-use OAuth nonce (login *and* link). */
const nonceCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: OAUTH_NONCE_COOKIE_PATH,
    maxAge: OAUTH_NONCE_TTL_MS,
};

export const setNonceCookie = (res: Response, nonce: string): void => {
    res.cookie(OAUTH_NONCE_COOKIE, nonce, nonceCookieOptions);
};

export const clearNonceCookie = (res: Response): void => {
    res.clearCookie(OAUTH_NONCE_COOKIE, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: OAUTH_NONCE_COOKIE_PATH,
    });
};

/** Constant-time comparison so nonce checks do not leak timing information. */
const safeEquals = (a: string, b: string): boolean => {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");

    if (left.length !== right.length) return false;

    return timingSafeEqual(left, right);
};

const signState = (claims: {
    mode: "login" | "link";
    userId?: string;
    nonce: string;
}): string =>
    jwt.sign({ ...claims, purpose: STATE_PURPOSE }, env.ACCESS_TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: STATE_TTL_SECONDS as jwt.SignOptions["expiresIn"],
    });

export const signLoginState = (nonce: string): string =>
    signState({ mode: "login", nonce });

export const signLinkState = (userId: string, nonce: string): string =>
    signState({ mode: "link", userId, nonce });

/**
 * Verifies signature, TTL, purpose and the nonce cookie binding in one step.
 * Throws `ApiError(400)` for anything that does not verify — callers decide
 * whether that surfaces as JSON or a frontend failure redirect.
 */
export const verifyOAuthState = (
    rawState: unknown,
    rawNonce: unknown,
): OAuthState => {
    if (
        typeof rawState !== "string" ||
        rawState.length === 0 ||
        typeof rawNonce !== "string" ||
        rawNonce.length === 0
    ) {
        throw new ApiError(400, "OAuth state is missing or invalid.");
    }

    let claims: StateClaims;

    try {
        const decoded = jwt.verify(rawState, env.ACCESS_TOKEN_SECRET, {
            algorithms: ["HS256"],
        });

        if (typeof decoded === "string") throw new Error("Malformed state.");

        claims = decoded as StateClaims;
    } catch {
        throw new ApiError(400, "OAuth state is invalid or has expired.");
    }

    if (
        claims.purpose !== STATE_PURPOSE ||
        !safeEquals(claims.nonce, rawNonce)
    ) {
        throw new ApiError(400, "OAuth state is invalid or has expired.");
    }

    if (claims.mode === "login") {
        return { mode: "login", nonce: claims.nonce };
    }

    if (claims.mode === "link") {
        if (typeof claims.userId !== "string" || claims.userId.length === 0) {
            throw new ApiError(400, "OAuth state is invalid or has expired.");
        }

        return { mode: "link", userId: claims.userId, nonce: claims.nonce };
    }

    throw new ApiError(400, "OAuth state is invalid or has expired.");
};

/* -------------------------------------------------------------------------- */
/*  Pending Google signup                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Carries a Google-verified identity from the OAuth callback to the role
 * chooser in the SPA, and back to `POST /auth/google/signup`.
 *
 * The account is deliberately **not created** at callback time: the user must
 * pick a role first. This token is what holds the identity in the meantime —
 * signed (HS256), purpose-bound and short-lived, so it can be neither forged
 * nor replayed as anything else. It contains no secrets (only the profile data
 * Google already exposed) and never grants a session by itself: a verified
 * token still only leads to account creation, then the normal single-use code
 * exchange.
 */
const PENDING_SIGNUP_PURPOSE = "google_signup_pending";
const PENDING_SIGNUP_TTL_SECONDS = 10 * 60;

export interface PendingSignupProfile {
    googleId: string;
    email: string;
    displayName: string;
    photoUrl: string | null;
}

interface PendingSignupClaims extends PendingSignupProfile {
    purpose: string;
}

const invalidPendingToken = (): ApiError =>
    new ApiError(400, "This sign-up link is invalid or has expired.", [
        { code: "SIGNUP_PENDING_INVALID" },
    ]);

export const signGoogleSignupPending = (
    profile: PendingSignupProfile,
): string =>
    jwt.sign(
        { ...profile, purpose: PENDING_SIGNUP_PURPOSE },
        env.ACCESS_TOKEN_SECRET,
        {
            algorithm: "HS256",
            expiresIn: PENDING_SIGNUP_TTL_SECONDS as jwt.SignOptions["expiresIn"],
        },
    );

export const verifyGoogleSignupPending = (
    raw: unknown,
): PendingSignupProfile => {
    if (typeof raw !== "string" || raw.length === 0) {
        throw invalidPendingToken();
    }

    let claims: PendingSignupClaims;

    try {
        const decoded = jwt.verify(raw, env.ACCESS_TOKEN_SECRET, {
            algorithms: ["HS256"],
        });

        if (typeof decoded === "string") throw new Error("Malformed token.");

        claims = decoded as PendingSignupClaims;
    } catch {
        throw invalidPendingToken();
    }

    if (
        claims.purpose !== PENDING_SIGNUP_PURPOSE ||
        typeof claims.googleId !== "string" ||
        claims.googleId.length === 0 ||
        typeof claims.email !== "string" ||
        claims.email.length === 0 ||
        typeof claims.displayName !== "string" ||
        claims.displayName.length === 0
    ) {
        throw invalidPendingToken();
    }

    return {
        googleId: claims.googleId,
        email: claims.email,
        displayName: claims.displayName,
        photoUrl:
            typeof claims.photoUrl === "string" ? claims.photoUrl : null,
    };
};
