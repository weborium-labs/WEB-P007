import { describe, expect, it } from "vitest";

import {
    listUsersQuerySchema,
    updateUserSchema,
    userIdParamSchema,
} from "../src/validators/admin.validator.js";

const parseQuery = (query: unknown) => listUsersQuerySchema.safeParse(query);
const parseParams = (params: unknown) => userIdParamSchema.safeParse(params);
const parseBody = (body: unknown) => updateUserSchema.body.safeParse(body);

describe("listUsersQuerySchema", () => {
    it("applies defaults for an empty query", () => {
        const result = parseQuery({});

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toMatchObject({
                page: 1,
                limit: 20,
                status: "all",
                sortBy: "createdAt",
                order: "desc",
            });
            expect(result.data.search).toBeUndefined();
            expect(result.data.role).toBeUndefined();
        }
    });

    it("coerces numeric query params from strings", () => {
        const result = parseQuery({ page: "3", limit: "50" });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.page).toBe(3);
            expect(result.data.limit).toBe(50);
        }
    });

    it("trims the search term", () => {
        const result = parseQuery({ search: "  jane  " });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.search).toBe("jane");
        }
    });

    it("accepts every supported role and sort key", () => {
        for (const role of ["INTERN", "HR", "GPM", "ADMIN"] as const) {
            expect(parseQuery({ role }).success).toBe(true);
        }
        for (const sortBy of [
            "createdAt",
            "username",
            "lastLoginAt",
            "role",
        ] as const) {
            expect(parseQuery({ sortBy }).success).toBe(true);
        }
    });

    it("rejects an out-of-range page or limit", () => {
        expect(parseQuery({ page: "0" }).success).toBe(false);
        expect(parseQuery({ page: "-1" }).success).toBe(false);
        expect(parseQuery({ page: "1.5" }).success).toBe(false);
        expect(parseQuery({ limit: "101" }).success).toBe(false);
    });

    it("rejects an unknown role, status or sort key", () => {
        expect(parseQuery({ role: "SUPERADMIN" }).success).toBe(false);
        expect(parseQuery({ status: "archived" }).success).toBe(false);
        expect(parseQuery({ sortBy: "password" }).success).toBe(false);
        expect(parseQuery({ order: "sideways" }).success).toBe(false);
    });

    it("rejects an empty search term and an over-long one", () => {
        expect(parseQuery({ search: "   " }).success).toBe(false);
        expect(parseQuery({ search: "x".repeat(101) }).success).toBe(false);
    });
});

describe("userIdParamSchema", () => {
    it("accepts a UUID", () => {
        expect(parseParams({ userId: "3f1a9f9e-8f8f-4a4a-9a9a-1b2c3d4e5f60" }).success).toBe(
            true,
        );
    });

    it("rejects a non-UUID path segment", () => {
        expect(parseParams({ userId: "not-a-uuid" }).success).toBe(false);
        expect(parseParams({ userId: "3f1a9f9e-8f8f-4a4a-9a9a" }).success).toBe(false);
    });
});

describe("updateUserSchema (body)", () => {
    it("accepts a role-only update", () => {
        const result = parseBody({ role: "HR" });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe("HR");
            expect(result.data.activeStatus).toBeUndefined();
        }
    });

    it("accepts an activation-only update", () => {
        const result = parseBody({ activeStatus: false });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.activeStatus).toBe(false);
        }
    });

    it("accepts both fields together", () => {
        expect(parseBody({ role: "GPM", activeStatus: true }).success).toBe(true);
    });

    it("rejects an empty update", () => {
        expect(parseBody({}).success).toBe(false);
    });

    it("rejects unsupported fields (mass-assignment guard)", () => {
        expect(parseBody({ email: "attacker@example.com" }).success).toBe(false);
        expect(parseBody({ score: 100 }).success).toBe(false);
        expect(parseBody({ batchId: "3f1a9f9e-8f8f-4a4a-9a9a-1b2c3d4e5f60" }).success).toBe(
            false,
        );
    });

    it("rejects an unknown role or a non-boolean activeStatus", () => {
        expect(parseBody({ role: "SUPERADMIN" }).success).toBe(false);
        expect(parseBody({ activeStatus: "yes" }).success).toBe(false);
    });
});
