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
 *  - `login` — carries the signup role for a brand-new Google user.
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
    | { mode: "login"; role: string; nonce: string }
    | { mode: "link"; userId: string; nonce: string };

interface StateClaims {
    purpose: string;
    nonce: string;
    mode: "login" | "link";
    role?: string;
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
    role?: string;
    userId?: string;
    nonce: string;
}): string =>
    jwt.sign({ ...claims, purpose: STATE_PURPOSE }, env.ACCESS_TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: STATE_TTL_SECONDS as jwt.SignOptions["expiresIn"],
    });

export const signLoginState = (role: string, nonce: string): string =>
    signState({ mode: "login", role, nonce });

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
        if (typeof claims.role !== "string" || claims.role.length === 0) {
            throw new ApiError(400, "OAuth state is invalid or has expired.");
        }

        return { mode: "login", role: claims.role, nonce: claims.nonce };
    }

    if (claims.mode === "link") {
        if (typeof claims.userId !== "string" || claims.userId.length === 0) {
            throw new ApiError(400, "OAuth state is invalid or has expired.");
        }

        return { mode: "link", userId: claims.userId, nonce: claims.nonce };
    }

    throw new ApiError(400, "OAuth state is invalid or has expired.");
};
