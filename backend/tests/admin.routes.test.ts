import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * Contract tests for the admin surface that do not require a database:
 * `authenticate` rejects the request before any user lookup, so these run
 * safely in the default suite. Validation rules live in
 * `admin-validators.test.ts`.
 *
 * Role enforcement (403 for non-admins) and happy paths need real sessions,
 * so they live in the RUN_DB_TESTS block below — the same convention as
 * `user.routes.test.ts`.
 */
describe("Admin routes", () => {
    it("requires authentication for GET /admin/stats", async () => {
        const res = await request(app).get("/api/v1/admin/stats").expect(401);

        expect(res.body).toMatchObject({
            success: false,
            statusCode: 401,
        });
        expect(res.body.message).toBe("Authentication required.");
    });

    it("requires authentication for GET /admin/users", async () => {
        const res = await request(app).get("/api/v1/admin/users").expect(401);

        expect(res.body).toMatchObject({ statusCode: 401 });
    });

    it("requires authentication for GET /admin/users/:userId", async () => {
        const res = await request(app)
            .get("/api/v1/admin/users/3f1a9f9e-8f8f-4a4a-9a9a-1b2c3d4e5f60")
            .expect(401);

        expect(res.body).toMatchObject({ statusCode: 401 });
        // Rejected before validation or any user lookup.
        expect(res.body.message).toBe("Authentication required.");
    });

    it("requires authentication for PATCH /admin/users/:userId", async () => {
        const res = await request(app)
            .patch("/api/v1/admin/users/3f1a9f9e-8f8f-4a4a-9a9a-1b2c3d4e5f60")
            .send({ role: "HR" })
            .expect(401);

        expect(res.body).toMatchObject({ statusCode: 401 });
    });

    it("rejects a garbage access token", async () => {
        const res = await request(app)
            .get("/api/v1/admin/users")
            .set("Authorization", "Bearer not.a.token")
            .expect(401);

        expect(res.body).toMatchObject({ statusCode: 401 });
        expect(res.body.message).toBe("Invalid access token.");
    });
});

/**
 * OPT-in: `authenticate` resolves the session user from the database, so the
 * ADMIN-role enforcement path needs `RUN_DB_TESTS=1` (same convention as
 * `auth-code.test.ts`).
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")(
    "Admin routes (database)",
    () => {
        const createdUserIds: string[] = [];
        const suffix = () =>
            Math.random().toString(36).slice(2, 8) +
            Date.now().toString(36);

        const createUser = async (role: "INTERN" | "ADMIN") => {
            const user = await prisma.user.create({
                data: {
                    email: `admin.${role.toLowerCase()}.${suffix()}@example.com`,
                    username: `adm-${role.toLowerCase()}-${suffix()}`,
                    isEmailVerified: true,
                    activeStatus: true,
                    role,
                },
            });
            createdUserIds.push(user.id);
            return user;
        };

        const tokenFor = async (userId: string) => {
            const jwt = await import("jsonwebtoken");
            const { env } = await import("../src/config/env.js");

            return jwt.default.sign(
                { userId },
                env.ACCESS_TOKEN_SECRET,
                { algorithm: "HS256", expiresIn: "5m" },
            );
        };

        afterAll(async () => {
            // Audit rows carry plain-string ids (no FK), so they must be
            // cleaned up explicitly along with the users they reference.
            await prisma.auditLog.deleteMany({
                where: {
                    OR: [
                        { actorId: { in: createdUserIds } },
                        { entityId: { in: createdUserIds } },
                    ],
                },
            });
            await prisma.user.deleteMany({
                where: { id: { in: createdUserIds } },
            });
        });

        it("rejects a non-admin session with 403", async () => {
            const intern = await createUser("INTERN");
            const token = await tokenFor(intern.id);

            const res = await request(app)
                .get("/api/v1/admin/users")
                .set("Authorization", `Bearer ${token}`)
                .expect(403);

            expect(res.body).toMatchObject({ success: false, statusCode: 403 });
            expect(res.body.message).toBe(
                "You do not have permission to perform this action.",
            );
        });

        it("lets an admin read the dashboard stats", async () => {
            const admin = await createUser("ADMIN");
            const token = await tokenFor(admin.id);

            const res = await request(app)
                .get("/api/v1/admin/stats")
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                totals: {
                    users: expect.any(Number),
                    active: expect.any(Number),
                    inactive: expect.any(Number),
                    pendingVerification: expect.any(Number),
                    recentSignups: expect.any(Number),
                },
                byRole: {
                    INTERN: expect.any(Number),
                    HR: expect.any(Number),
                    GPM: expect.any(Number),
                    ADMIN: expect.any(Number),
                },
            });
            expect(Array.isArray(res.body.data.recentUsers)).toBe(true);
            // The allow-list projection must never expose credentials.
            for (const user of res.body.data.recentUsers) {
                expect(user).not.toHaveProperty("password");
                expect(user).not.toHaveProperty("googleId");
            }
        });

        it("rejects a non-admin stats request with 403", async () => {
            const intern = await createUser("INTERN");
            const token = await tokenFor(intern.id);

            const res = await request(app)
                .get("/api/v1/admin/stats")
                .set("Authorization", `Bearer ${token}`)
                .expect(403);

            expect(res.body.statusCode).toBe(403);
        });

        it("lets an admin list users with pagination meta", async () => {
            const admin = await createUser("ADMIN");
            const token = await tokenFor(admin.id);

            const res = await request(app)
                .get("/api/v1/admin/users?page=1&limit=5")
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                meta: { page: 1, limit: 5 },
            });
            expect(Array.isArray(res.body.data.items)).toBe(true);
            // The allow-list projection must never expose credentials.
            for (const item of res.body.data.items) {
                expect(item).not.toHaveProperty("password");
                expect(item).not.toHaveProperty("otpHash");
                expect(item).not.toHaveProperty("googleId");
            }
        });

        it("rejects a non-admin role update with 403", async () => {
            const intern = await createUser("INTERN");
            const token = await tokenFor(intern.id);

            const res = await request(app)
                .patch(`/api/v1/admin/users/${intern.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ role: "ADMIN" })
                .expect(403);

            expect(res.body.statusCode).toBe(403);
        });

        it("rejects a malformed role update with 400 for an admin", async () => {
            const admin = await createUser("ADMIN");
            const target = await createUser("INTERN");
            const token = await tokenFor(admin.id);

            const res = await request(app)
                .patch(`/api/v1/admin/users/${target.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ role: "SUPERADMIN" })
                .expect(400);

            expect(res.body).toMatchObject({ success: false, statusCode: 400 });
        });

        it("blocks an admin from changing their own record", async () => {
            const admin = await createUser("ADMIN");
            const token = await tokenFor(admin.id);

            const res = await request(app)
                .patch(`/api/v1/admin/users/${admin.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ activeStatus: false })
                .expect(403);

            expect(res.body.message).toBe(
                "You cannot change your own role or activation status.",
            );
        });

        it("returns 404 stats for a user that does not exist", async () => {
            const admin = await createUser("ADMIN");
            const token = await tokenFor(admin.id);

            const res = await request(app)
                .get(
                    "/api/v1/admin/users/00000000-0000-4000-8000-000000000000",
                )
                .set("Authorization", `Bearer ${token}`)
                .expect(404);

            expect(res.body).toMatchObject({ statusCode: 404 });
        });

        it("updates another user's role and writes an audit entry", async () => {
            const admin = await createUser("ADMIN");
            const target = await createUser("INTERN");
            const token = await tokenFor(admin.id);

            const res = await request(app)
                .patch(`/api/v1/admin/users/${target.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ role: "HR" })
                .expect(200);

            expect(res.body.data).toMatchObject({
                id: target.id,
                role: "HR",
            });

            // The write and its audit trail share one transaction.
            const audit = await prisma.auditLog.findFirst({
                where: {
                    actorId: admin.id,
                    entityId: target.id,
                    action: "ADMIN_UPDATE_USER",
                },
            });
            expect(audit).not.toBeNull();
            expect(audit?.oldValue).toMatchObject({ role: "INTERN" });
            expect(audit?.newValue).toMatchObject({ role: "HR" });
        });

        it("treats a same-value role PATCH as a no-op without auditing", async () => {
            const admin = await createUser("ADMIN");
            const target = await createUser("INTERN");
            const token = await tokenFor(admin.id);

            await request(app)
                .patch(`/api/v1/admin/users/${target.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ role: "INTERN" })
                .expect(200);

            const auditCount = await prisma.auditLog.count({
                where: { actorId: admin.id, entityId: target.id },
            });
            expect(auditCount).toBe(0);
        });

        it("deactivates and reactivates an account with timestamps", async () => {
            const admin = await createUser("ADMIN");
            const target = await createUser("INTERN");
            const token = await tokenFor(admin.id);

            const deactivated = await request(app)
                .patch(`/api/v1/admin/users/${target.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ activeStatus: false })
                .expect(200);

            expect(deactivated.body.data).toMatchObject({
                activeStatus: false,
            });
            expect(deactivated.body.data.deactivatedAt).not.toBeNull();

            const reactivated = await request(app)
                .patch(`/api/v1/admin/users/${target.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ activeStatus: true })
                .expect(200);

            expect(reactivated.body.data).toMatchObject({
                activeStatus: true,
                deactivatedAt: null,
            });
        });
    },
);
