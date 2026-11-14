import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * Contract tests for the profile endpoints that do not require a database:
 * authentication is rejected before any user lookup, so these run safely
 * in the default suite. Validation rules are covered in
 * `user-validators.test.ts`.
 *
 * Username-conflict and protected-field coverage lives in the RUN_DB_TESTS
 * block below, because `authenticate` resolves the caller from the database.
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

    it("requires authentication to change a username", async () => {
        const res = await request(app)
            .patch("/api/v1/users/me")
            .send({ username: "brand.new.username" })
            .expect(401);

        expect(res.body).toMatchObject({ success: false, statusCode: 401 });
        // No write happened, and no conflict information leaks either.
        expect(res.body.message).toBe("Authentication required.");
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
        const createdUserIds: string[] = [];
        const suffix = () =>
            Math.random().toString(36).slice(2, 8) +
            Date.now().toString(36);

        const createUser = async (username: string) => {
            const user = await prisma.user.create({
                data: {
                    email: `uname.${suffix()}@example.com`,
                    username,
                    isEmailVerified: true,
                    activeStatus: true,
                    role: "INTERN",
                },
            });
            createdUserIds.push(user.id);
            return user;
        };

        const tokenFor = async (userId: string) => {
            const jwt = await import("jsonwebtoken");
            const { env } = await import("../src/config/env.js");

            return jwt.default.sign(
                { userId, role: "INTERN" },
                env.ACCESS_TOKEN_SECRET,
                { algorithm: "HS256", expiresIn: "5m" },
            );
        };

        afterAll(async () => {
            await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
        });

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

        it("updates the caller's own username", async () => {
            const user = await createUser(`old.${suffix()}`);
            const token = await tokenFor(user.id);
            const next = `new.${suffix()}`;

            const res = await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({ username: next })
                .expect(200);

            expect(res.body.data.username).toBe(next);
            expect(res.body.data.id).toBe(user.id);
            // Email/role are untouched by a username change.
            expect(res.body.data.email).toBe(user.email);
            expect(res.body.data.role).toBe("INTERN");

            const fresh = await prisma.user.findUnique({
                where: { id: user.id },
            });
            expect(fresh?.username).toBe(next);
        });

        it("trims whitespace before persisting a username", async () => {
            const user = await createUser(`trim.${suffix()}`);
            const token = await tokenFor(user.id);
            const next = `  padded.${suffix()}  `;

            const res = await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({ username: next })
                .expect(200);

            expect(res.body.data.username).toBe(next.trim());
        });

        it("returns 409 USERNAME_TAKEN when the username already exists", async () => {
            const taken = `taken.${suffix()}`;
            await createUser(taken);

            const user = await createUser(`claimer.${suffix()}`);
            const token = await tokenFor(user.id);

            const res = await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({ username: taken })
                .expect(409);

            expect(res.body.message).toBe("This username is already taken.");
            expect(res.body.errors).toContainEqual({
                code: "USERNAME_TAKEN",
                field: "username",
            });
            // The loser's identity must not change.
            const fresh = await prisma.user.findUnique({
                where: { id: user.id },
            });
            expect(fresh?.username).toBe(user.username);
        });

        it("enforces uniqueness case-insensitively", async () => {
            const taken = `CaseTaken.${suffix()}`;
            await createUser(taken);

            const user = await createUser(`caseloser.${suffix()}`);
            const token = await tokenFor(user.id);

            const res = await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({ username: taken.toUpperCase() })
                .expect(409);

            expect(res.body.errors).toContainEqual({
                code: "USERNAME_TAKEN",
                field: "username",
            });
        });

        it("lets a user change only the case of their own username", async () => {
            const username = `SelfCase.${suffix()}`;
            const user = await createUser(username);
            const token = await tokenFor(user.id);

            const res = await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({ username: username.toLowerCase() })
                .expect(200);

            expect(res.body.data.username).toBe(username.toLowerCase());
        });

        it("never allows protected fields to be modified", async () => {
            const user = await createUser(`protect.${suffix()}`);
            const token = await tokenFor(user.id);

            // Unknown/protected keys are rejected by the strict schema.
            await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: `protect.me.${suffix()}`,
                    role: "ADMIN",
                    email: "attacker@example.com",
                    activeStatus: false,
                    isEmailVerified: true,
                    verificationStatus: "APPROVED",
                    password: "Hacked123",
                    googleId: "attacker-google-id",
                })
                .expect(400);

            const fresh = await prisma.user.findUnique({
                where: { id: user.id },
            });
            expect(fresh?.role).toBe("INTERN");
            expect(fresh?.email).toBe(user.email);
            expect(fresh?.activeStatus).toBe(true);
            expect(fresh?.isEmailVerified).toBe(true);
            expect(fresh?.verificationStatus).toBe("NOT_SUBMITTED");
            expect(fresh?.password).toBeNull();
            expect(fresh?.googleId).toBeNull();
            expect(fresh?.username).toBe(user.username);
        });

        it("keeps other users' usernames stable after a conflict", async () => {
            const winner = `winner.${suffix()}`;
            await createUser(winner);

            const user = await createUser(`stable.${suffix()}`);
            const token = await tokenFor(user.id);

            await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({ username: winner })
                .expect(409);

            const owner = await prisma.user.findFirst({
                where: { username: winner },
            });
            expect(owner).not.toBeNull();
        });

        it("still accepts a non-username profile update", async () => {
            const user = await createUser(`details.${suffix()}`);
            const token = await tokenFor(user.id);

            const res = await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    phone: "+91 98765 43210",
                    universityName: "Gujarat Technological University",
                    dob: "2001-05-14",
                })
                .expect(200);

            expect(res.body.data.phone).toBe("+91 98765 43210");
            expect(res.body.data.universityName).toBe(
                "Gujarat Technological University",
            );
            expect(res.body.data.dob).toBe("2001-05-14");
            expect(res.body.data.username).toBe(user.username);
        });

        it("rejects an empty update body", async () => {
            const user = await createUser(`empty.${suffix()}`);
            const token = await tokenFor(user.id);

            await request(app)
                .patch("/api/v1/users/me")
                .set("Authorization", `Bearer ${token}`)
                .send({})
                .expect(400);
        });
    },
);
