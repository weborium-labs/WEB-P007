import { describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../src/app.js";

/**
 * Contract tests for the profile endpoints that do not require a database:
 * authentication is rejected before any user lookup, so these run safely
 * in the default suite. Validation rules are covered in
 * `user-validators.test.ts`.
 */
describe("User profile routes", () => {
    it("requires authentication for GET /users/me", async () => {
        const res = await request(app).get("/api/v1/users/me").expect(401);

        expect(res.body).toMatchObject({
            success: false,
            statusCode: 401,
        });
    });

    it("requires authentication for PATCH /users/me", async () => {
        const res = await request(app)
            .patch("/api/v1/users/me")
            .send({ phone: "1234567890" })
            .expect(401);

        expect(res.body).toMatchObject({ statusCode: 401 });
    });

    it("requires authentication for POST /users/me/password", async () => {
        await request(app)
            .post("/api/v1/users/me/password")
            .send({
                currentPassword: "old",
                newPassword: "NewPass123",
                confirmPassword: "NewPass123",
            })
            .expect(401);
    });

    it("requires authentication for POST /users/me/google/link/init", async () => {
        const res = await request(app)
            .post("/api/v1/users/me/google/link/init")
            .expect(401);

        expect(res.body).toMatchObject({ statusCode: 401 });
    });

    it("rejects a garbage access token", async () => {
        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", "Bearer not.a.token")
            .expect(401);

        expect(res.body).toMatchObject({ statusCode: 401 });
        // Never leaks whether the token was malformed vs. expired.
        expect(res.body.message).toBe("Invalid access token.");
    });
});

/**
 * OPT-in: `authenticate` resolves the session user from the database, so
 * this path is exercised only when RUN_DB_TESTS=1 (see auth-code.test.ts
 * for the same convention).
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")(
    "User profile routes (database)",
    () => {
        it("rejects a well-formed token for a nonexistent session user", async () => {
            const jwt = await import("jsonwebtoken");
            const { env } = await import("../src/config/env.js");

            const token = jwt.default.sign(
                {
                    userId: "00000000-0000-4000-8000-000000000000",
                    role: "INTERN",
                },
                env.ACCESS_TOKEN_SECRET,
                { algorithm: "HS256", expiresIn: "5m" },
            );

            const res = await request(app)
                .get("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .expect(401);

            expect(res.body.message).toBe("Invalid session.");
        });
    },
);
