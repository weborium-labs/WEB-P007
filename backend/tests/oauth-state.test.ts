import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import { env } from "../src/config/env.js";
import { ApiError } from "../src/utils/ApiError.js";
import {
    generateOAuthNonce,
    signLinkState,
    signLoginState,
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
    it("round-trips a login state with its nonce", () => {
        const nonce = generateOAuthNonce();
        const state = signLoginState("Intern", nonce);

        expect(verifyOAuthState(state, nonce)).toEqual({
            mode: "login",
            role: "Intern",
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
        const state = signLoginState("Intern", generateOAuthNonce());

        expectApiError(
            () => verifyOAuthState(state, generateOAuthNonce()),
            400,
        );
    });

    it("rejects a missing nonce cookie", () => {
        const state = signLoginState("Intern", generateOAuthNonce());

        expectApiError(() => verifyOAuthState(state, undefined), 400);
        expectApiError(() => verifyOAuthState(state, ""), 400);
    });

    it("rejects tampered or garbage state", () => {
        const nonce = generateOAuthNonce();
        const state = signLoginState("Intern", nonce);
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
                role: "Intern",
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
            { purpose: "something_else", mode: "login", role: "Intern", nonce },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyOAuthState(wrongPurpose, nonce), 400);
    });

    it("rejects a state signed with a different secret", () => {
        const nonce = generateOAuthNonce();
        const foreignSecret = "a-completely-different-secret-value-32chars!!";
        const forged = jwt.sign(
            { purpose: STATE_PURPOSE, mode: "login", role: "Intern", nonce },
            foreignSecret,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyOAuthState(forged, nonce), 400);
    });

    it("rejects a well-signed state with missing mode payload", () => {
        const nonce = generateOAuthNonce();
        const missingRole = jwt.sign(
            { purpose: STATE_PURPOSE, mode: "login", nonce },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );
        const unknownMode = jwt.sign(
            { purpose: STATE_PURPOSE, mode: "unknown", nonce },
            env.ACCESS_TOKEN_SECRET,
            { algorithm: "HS256", expiresIn: 600 },
        );

        expectApiError(() => verifyOAuthState(missingRole, nonce), 400);
        expectApiError(() => verifyOAuthState(unknownMode, nonce), 400);
    });
});
