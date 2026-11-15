import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import { env } from "../src/config/env.js";
import { ApiError } from "../src/utils/ApiError.js";
import {
    generateOAuthNonce,
    signGoogleSignupPending,
    signLinkState,
    signLoginState,
    verifyGoogleSignupPending,
    verifyOAuthState,
} from "../src/services/oauth-state.service.js";

const STATE_PURPOSE = "google_oauth_state";

const expectApiError = (fn: () => unknown, statusCode: number): void => {
    try {
        fn();
    } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(statusCode);
        return;
    }

    throw new Error(`Expected ApiError(${statusCode}) but nothing was thrown.`);
};

describe("OAuth state service", () => {
    it("round-trips a login state with its nonce (no role travels)", () => {
        const nonce = generateOAuthNonce();
        const state = signLoginState(nonce);

        expect(verifyOAuthState(state, nonce)).toEqual({
            mode: "login",
            nonce,
        });
    });

    it("round-trips a link state bound to a user", () => {
        const nonce = generateOAuthNonce();
        const state = signLinkState("user-123", nonce);

        expect(verifyOAuthState(state, nonce)).toEqual({
            mode: "link",
            userId: "user-123",
            nonce,
        });
    });

    it("generates unique nonces", () => {
        expect(generateOAuthNonce()).not.toBe(generateOAuthNonce());
    });

    it("rejects a state bound to a different nonce (login CSRF)", () => {
        const state = signLoginState(generateOAuthNonce());

        expectApiError(
            () => verifyOAuthState(state, generateOAuthNonce()),
            400,
        );
    });

    it("rejects a missing nonce cookie", () => {
        const state = signLoginState(generateOAuthNonce());

        expectApiError(() => verifyOAuthState(state, undefined), 400);
        expectApiError(() => verifyOAuthState(state, ""), 400);
    });

    it("rejects tampered or garbage state", () => {
        const nonce = generateOAuthNonce();
        const state = signLoginState(nonce);
        const tampered = `${state.slice(0, -4)}AAAA`;

        expectApiError(() => verifyOAuthState(tampered, nonce), 400);
        expectApiError(() => verifyOAuthState("not-a-jwt", nonce), 400);
        expectApiError(() => verifyOAuthState(undefined, nonce), 400);
    });

    it("rejects an expired state (replay after TTL)", () => {
        const nonce = generateOAuthNonce();
        const expired = jwt.sign(
            {
                purpose: STATE_PURPOSE,
                mode: "login",
                nonce,
            },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: -60 },
        );

        expectApiError(() => verifyOAuthState(expired, nonce), 400);
    });

    it("rejects a state signed with the wrong purpose", () => {
        const nonce = generateOAuthNonce();
        const wrongPurpose = jwt.sign(
            { purpose: "something_else", mode: "login", nonce },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyOAuthState(wrongPurpose, nonce), 400);
    });

    it("rejects a state signed with a different secret", () => {
        const nonce = generateOAuthNonce();
        const foreignSecret = "a-completely-different-secret-value-32chars!!";
        const forged = jwt.sign(
            { purpose: STATE_PURPOSE, mode: "login", nonce },
            foreignSecret,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyOAuthState(forged, nonce), 400);
    });

    it("accepts a role-less login state (role is chosen in the SPA) and rejects unknown modes", () => {
        const nonce = generateOAuthNonce();
        const rolelessLogin = jwt.sign(
            { purpose: STATE_PURPOSE, mode: "login", nonce },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );
        const unknownMode = jwt.sign(
            { purpose: STATE_PURPOSE, mode: "unknown", nonce },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expect(verifyOAuthState(rolelessLogin, nonce)).toEqual({
            mode: "login",
            nonce,
        });
        expectApiError(() => verifyOAuthState(unknownMode, nonce), 400);
    });
});

describe("Pending Google signup token", () => {
    const profile = {
        googleId: "g-123",
        email: "new.user@example.com",
        displayName: "New User",
        photoUrl: "https://example.com/avatar.png",
    };

    it("round-trips the profile the callback handed over", () => {
        const token = signGoogleSignupPending(profile);

        expect(verifyGoogleSignupPending(token)).toEqual(profile);
    });

    it("rejects a missing or garbage token", () => {
        expectApiError(() => verifyGoogleSignupPending(undefined), 400);
        expectApiError(() => verifyGoogleSignupPending(""), 400);
        expectApiError(() => verifyGoogleSignupPending("not-a-jwt"), 400);
    });

    it("rejects a token signed with a different secret", () => {
        const forged = jwt.sign(
            { ...profile, purpose: "google_signup_pending" },
            "a-completely-different-secret-value-32chars!!",
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyGoogleSignupPending(forged), 400);
    });

    it("rejects a token with the wrong purpose (cannot be a state or replayed as one)", () => {
        const wrongPurpose = jwt.sign(
            { ...profile, purpose: STATE_PURPOSE },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyGoogleSignupPending(wrongPurpose), 400);
    });

    it("rejects an expired token (replay after TTL)", () => {
        const expired = jwt.sign(
            { ...profile, purpose: "google_signup_pending" },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: -60 },
        );

        expectApiError(() => verifyGoogleSignupPending(expired), 400);
    });

    it("rejects a token whose identity payload was stripped", () => {
        const noIdentity = jwt.sign(
            { purpose: "google_signup_pending", nonce: "only-a-nonce" },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyGoogleSignupPending(noIdentity), 400);
    });
});
