import { describe, expect, it } from "vitest";

import {
    exchangeCodeSchema,
    googleSignupSchema,
} from "../src/validators/auth.validator.js";

const parse = (body: unknown) => exchangeCodeSchema.body.safeParse(body);
const parseSignup = (body: unknown) => googleSignupSchema.body.safeParse(body);

describe("exchangeCodeSchema", () => {
    it("accepts a well-formed base64url code and trims it", () => {
        const code = "a".repeat(43);
        const result = parse({ code: `  ${code}\n` });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.code).toBe(code);
        }
    });

    it("rejects an empty or missing code", () => {
        expect(parse({}).success).toBe(false);
        expect(parse({ code: "" }).success).toBe(false);
        expect(parse({ code: "   " }).success).toBe(false);
    });

    it("rejects codes that are too short to be random", () => {
        expect(parse({ code: "short-code" }).success).toBe(false);
    });

    it("rejects oversized codes", () => {
        expect(parse({ code: "a".repeat(129) }).success).toBe(false);
    });

    it("rejects non-string values", () => {
        expect(parse({ code: 12345 }).success).toBe(false);
        expect(parse({ code: null }).success).toBe(false);
        expect(parse({ code: ["a"] }).success).toBe(false);
    });
});

describe("googleSignupSchema", () => {
    const pending = "a".repeat(200);

    it("accepts a pending token with any selectable role", () => {
        for (const role of ["Intern", "Group_manager", "HR"]) {
            expect(parseSignup({ pending, role }).success).toBe(true);
        }
    });

    it("trims surrounding whitespace from the pending token", () => {
        const result = parseSignup({ pending: `  ${pending}\n`, role: "HR" });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.pending).toBe(pending);
        }
    });

    it("rejects a missing or empty pending token", () => {
        expect(parseSignup({ role: "Intern" }).success).toBe(false);
        expect(parseSignup({ pending: "", role: "Intern" }).success).toBe(false);
        expect(parseSignup({ pending: "   ", role: "Intern" }).success).toBe(
            false,
        );
    });

    it("rejects an unknown role (no self-assigned privileges)", () => {
        expect(parseSignup({ pending, role: "Superadmin" }).success).toBe(false);
        expect(parseSignup({ pending, role: "ADMIN" }).success).toBe(false);
        expect(parseSignup({ pending, role: "intern" }).success).toBe(false);
    });

    it("rejects a missing role — an account is never created by default", () => {
        expect(parseSignup({ pending }).success).toBe(false);
    });

    it("rejects unknown extra fields", () => {
        expect(
            parseSignup({ pending, role: "Intern", email: "x@example.com" })
                .success,
        ).toBe(false);
    });
});
