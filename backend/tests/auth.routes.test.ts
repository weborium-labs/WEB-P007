import { describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

import { app } from "../src/app.js";
import {
    generateOAuthNonce,
    signLinkState,
} from "../src/services/oauth-state.service.js";

/**
 * Contract tests for the Google OAuth start/callback/exchange endpoints.
 * None of these require a database or contact Google:
 *  - the authorization step only issues a redirect;
 *  - failures are asserted via redirect Location headers.
 */
describe("Google OAuth routes", () => {
    it("starts Google auth with no role in the state (role is chosen later)", async () => {
        const res = await request(app).get("/api/v1/auth/google").expect(302);

        expect(res.headers.location).toContain("accounts.google.com");

        const state = new URL(res.headers.location).searchParams.get("state");
        expect(state).toBeTruthy();
        if (!state) throw new Error("Expected a signed state parameter.");

        const claims = jwt.decode(state) as Record<string, unknown> | null;
        expect(claims).toMatchObject({
            purpose: "google_oauth_state",
            mode: "login",
        });
        // No implicit default: a role must never ride along into the callback.
        expect(claims?.role).toBeUndefined();
        expect(typeof claims?.nonce).toBe("string");
    });

    it("ignores a role query param instead of letting it pick a role early", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google?role=Superadmin")
            .expect(302);

        const state = new URL(res.headers.location).searchParams.get("state");
        if (!state) throw new Error("Expected a signed state parameter.");

        const claims = jwt.decode(state) as Record<string, unknown> | null;
        expect(claims?.role).toBeUndefined();
    });

    it("redirects to Google with a signed state and sets the nonce cookie", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google")
            .expect(302);

        expect(res.headers.location).toContain("accounts.google.com");

        const setCookie = String(res.headers["set-cookie"]);
        expect(setCookie).toContain("oauthNonce=");
        expect(setCookie).toContain("HttpOnly");

        const state = new URL(res.headers.location).searchParams.get("state");
        expect(state).toBeTruthy();
        if (!state) throw new Error("Expected a signed state parameter.");

        const claims = jwt.decode(state) as Record<string, unknown> | null;
        expect(claims).toMatchObject({
            purpose: "google_oauth_state",
            mode: "login",
        });
        expect(typeof claims?.nonce).toBe("string");
    });

    it("refuses an unsigned/tampered state before reaching Google", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google?state=tampered.state.value")
            .expect(302);

        // Only link flows present a `state` param, so a tampered one returns
        // to the profile page (user stays signed in) — never to the provider.
        expect(res.headers.location).toContain("/profile");
        expect(res.headers.location).toContain("link_error=invalid_state");
        expect(res.headers.location).not.toContain("accounts.google.com");
    });

    it("translates a provider denial into a safe failure reason", async () => {
        const res = await request(app)
            .get("/api/v1/auth/google/callback?error=access_denied")
            .expect(302);

        // Handled before Passport so the signed state survives: without a
        // verifiable link state this is a login-flow denial.
        expect(res.headers.location).toContain("/auth/failure");
        expect(res.headers.location).toContain("reason=access_denied");
        expect(res.headers.location).not.toContain("accounts.google.com");
    });

    it("returns a denied link flow to the profile page", async () => {
        const nonce = generateOAuthNonce();
        const state = signLinkState("user-123", nonce);

        const res = await request(app)
            .get(`/api/v1/auth/google/callback?error=access_denied&state=${encodeURIComponent(state)}`)
            .set("Cookie", `oauthNonce=${nonce}`)
            .expect(302);

        expect(res.headers.location).toContain("/profile");
        expect(res.headers.location).toContain("link_error=access_denied");
        expect(res.headers.location).not.toContain("/auth/failure");
    });

    it("maps the failure endpoint to a safe frontend reason", async () => {
        const res = await request(app)
            .get("/api/v1/auth/failure?error=access_denied")
            .expect(302);

        expect(res.headers.location).toContain("/auth/failure");
        expect(res.headers.location).toContain("reason=access_denied");
    });

    it("uses a generic reason for unknown provider errors", async () => {
        const res = await request(app)
            .get("/api/v1/auth/failure")
            .expect(302);

        expect(res.headers.location).toContain("reason=oauth_failed");
    });

    it("rejects role selection without a pending token", async () => {
        const res = await request(app)
            .post("/api/v1/auth/google/signup")
            .send({ role: "Intern" })
            .expect(400);

        expect(res.body).toMatchObject({
            success: false,
            statusCode: 400,
        });
    });

    it("rejects an unknown role during role selection", async () => {
        const res = await request(app)
            .post("/api/v1/auth/google/signup")
            .send({ pending: "a".repeat(64), role: "Superadmin" })
            .expect(400);

        expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it("rejects a forged pending token before any account write", async () => {
        const res = await request(app)
            .post("/api/v1/auth/google/signup")
            .send({ pending: "not-a-jwt", role: "Intern" })
            .expect(400);

        expect(res.body).toMatchObject({
            success: false,
            statusCode: 400,
            message: "This sign-up link is invalid or has expired.",
        });
        expect(res.body.errors?.[0]?.code).toBe("SIGNUP_PENDING_INVALID");
    });
});

describe("Auth session routes", () => {
    it("rejects an exchange request with an invalid code shape", async () => {
        const res = await request(app)
            .post("/api/v1/auth/google/exchange")
            .send({ code: "too-short" })
            .expect(400);

        expect(res.body).toMatchObject({
            success: false,
            statusCode: 400,
            message: "Validation failed.",
        });
    });

    it("requires an authorization code in the exchange body", async () => {
        const res = await request(app)
            .post("/api/v1/auth/google/exchange")
            .send({})
            .expect(400);

        expect(res.body.errors?.[0]).toMatchObject({ path: "code" });
    });

    it("rejects refresh without a refresh cookie", async () => {
        const res = await request(app)
            .post("/api/v1/auth/refresh")
            .expect(401);

        expect(res.body).toMatchObject({
            success: false,
            statusCode: 401,
            message: "Refresh token is missing.",
        });
    });

    it("logout succeeds idempotently and clears the cookie", async () => {
        const res = await request(app)
            .post("/api/v1/auth/logout")
            .expect(200);

        expect(res.body).toMatchObject({
            success: true,
            statusCode: 200,
            message: "Logged out successfully.",
        });

        const setCookie = String(res.headers["set-cookie"]);
        expect(setCookie).toContain("refreshToken=");
        expect(setCookie).toContain("Expires=");
    });
});
