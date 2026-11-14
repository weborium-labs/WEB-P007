import { describe, expect, it } from "vitest";

import {
    changePasswordSchema,
    updateProfileSchema,
} from "../src/validators/user.validator.js";

const parseProfile = (body: unknown) =>
    updateProfileSchema.body.safeParse(body);
const parsePassword = (body: unknown) =>
    changePasswordSchema.body.safeParse(body);

describe("updateProfileSchema", () => {
    it("accepts a phone-only update", () => {
        const result = parseProfile({ phone: "+91 98765 43210" });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.phone).toBe("+91 98765 43210");
        }
    });

    it("accepts a full profile update", () => {
        const result = parseProfile({
            phone: "9876543210",
            dob: "2001-05-14",
            universityName: "Gujarat Technological University",
            photoUrl: "https://example.com/avatar.png",
        });

        expect(result.success).toBe(true);
    });

    it("accepts clearing the photo with null", () => {
        expect(parseProfile({ photoUrl: null }).success).toBe(true);
    });

    it("rejects an empty update", () => {
        expect(parseProfile({}).success).toBe(false);
    });

    it("rejects a malformed phone", () => {
        expect(parseProfile({ phone: "call-me-maybe" }).success).toBe(false);
    });

    it("rejects a malformed date of birth", () => {
        expect(parseProfile({ dob: "14/05/2001" }).success).toBe(false);
        expect(parseProfile({ dob: "2001-13-45" }).success).toBe(false);
    });

    it("rejects an invalid photo URL", () => {
        expect(parseProfile({ photoUrl: "not-a-url" }).success).toBe(false);
    });

    it("rejects an over-long university name", () => {
        expect(
            parseProfile({ universityName: "x".repeat(121) }).success,
        ).toBe(false);
    });

    it("rejects unsupported fields", () => {
        // Email / role changes are out of scope and must not sneak through.
        expect(
            parseProfile({ email: "attacker@example.com" }).success,
        ).toBe(false);
        expect(parseProfile({ role: "ADMIN" }).success).toBe(false);
    });
});

describe("changePasswordSchema", () => {
    const valid = {
        currentPassword: "OldPass123",
        newPassword: "NewPass123",
        confirmPassword: "NewPass123",
    };

    it("accepts a valid password change", () => {
        expect(parsePassword(valid).success).toBe(true);
    });

    it("rejects a weak new password", () => {
        expect(
            parsePassword({ ...valid, newPassword: "short" }).success,
        ).toBe(false);
    });

    it("rejects a new password missing an uppercase letter", () => {
        expect(
            parsePassword({
                ...valid,
                newPassword: "newpass123",
                confirmPassword: "newpass123",
            }).success,
        ).toBe(false);
    });

    it("rejects mismatched confirmation", () => {
        expect(
            parsePassword({ ...valid, confirmPassword: "OtherPass123" })
                .success,
        ).toBe(false);
    });

    it("rejects reusing the current password", () => {
        expect(
            parsePassword({
                currentPassword: "SamePass123",
                newPassword: "SamePass123",
                confirmPassword: "SamePass123",
            }).success,
        ).toBe(false);
    });

    it("rejects a missing current password", () => {
        expect(parsePassword({ ...valid, currentPassword: "" }).success).toBe(
            false,
        );
    });
});
