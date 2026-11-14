import { describe, expect, it } from "vitest";

import { exchangeCodeSchema } from "../src/validators/auth.validator.js";

const parse = (body: unknown) => exchangeCodeSchema.body.safeParse(body);

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
