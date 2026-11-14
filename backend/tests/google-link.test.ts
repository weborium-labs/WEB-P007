import { randomBytes } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";
import type { Profile } from "passport-google-oauth20";

import { prisma } from "../src/lib/prisma.js";
import { linkGoogleAccount } from "../src/services/google-auth.service.js";

/**
 * Database-backed tests for account linking.
 *
 * OPT-IN: set RUN_DB_TESTS=1 to run these against `DATABASE_URL`.
 * They create their own throwaway user rows (random unique emails/usernames)
 * and delete them in `afterAll` — existing accounts are never touched.
 */
const dbTestsEnabled = process.env.RUN_DB_TESTS === "1";

const makeProfile = (
    googleId: string,
    email: string,
    verified = true,
): Profile =>
    ({
        id: googleId,
        displayName: "Link Test",
        emails: [{ value: email }],
        photos: [{ value: "https://example.com/p.png" }],
        _json: { email_verified: verified },
    }) as Profile;

const suffix = () => randomBytes(6).toString("hex");

describe.skipIf(!dbTestsEnabled)("linkGoogleAccount (database)", () => {
    const createdUserIds: string[] = [];

    const createUser = async (email: string, googleId: string | null) => {
        const user = await prisma.user.create({
            data: {
                email,
                username: `link.${suffix()}`,
                googleId,
                isEmailVerified: true,
                activeStatus: true,
                role: "INTERN",
            },
        });
        createdUserIds.push(user.id);
        return user;
    };

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    });

    it("links a matching verified Google account", async () => {
        const email = `link.ok.${suffix()}@example.com`;
        const user = await createUser(email, null);
        const googleId = `g-${suffix()}`;

        const linked = await linkGoogleAccount(
            user.id,
            makeProfile(googleId, email),
        );

        expect(linked.googleId).toBe(googleId);
        // Password/role/email must never change during linking.
        expect(linked.email).toBe(email);
        expect(linked.role).toBe("INTERN");
    });

    it("is idempotent when the same Google account is already linked", async () => {
        const email = `link.same.${suffix()}@example.com`;
        const googleId = `g-${suffix()}`;
        const user = await createUser(email, googleId);

        const again = await linkGoogleAccount(
            user.id,
            makeProfile(googleId, email),
        );

        expect(again.googleId).toBe(googleId);
    });

    it("rejects a Google account whose email differs from the account email", async () => {
        const email = `link.mismatch.${suffix()}@example.com`;
        const user = await createUser(email, null);

        await expect(
            linkGoogleAccount(
                user.id,
                makeProfile(`g-${suffix()}`, `other.${suffix()}@example.com`),
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            errors: [{ code: "EMAIL_MISMATCH" }],
        });

        // Nothing was written.
        const fresh = await prisma.user.findUnique({
            where: { id: user.id },
        });
        expect(fresh?.googleId).toBeNull();
    });

    it("rejects an unverified Google email", async () => {
        const email = `link.unverified.${suffix()}@example.com`;
        const user = await createUser(email, null);

        await expect(
            linkGoogleAccount(
                user.id,
                makeProfile(`g-${suffix()}`, email, false),
            ),
        ).rejects.toMatchObject({
            statusCode: 403,
            errors: [{ code: "GOOGLE_EMAIL_UNVERIFIED" }],
        });
    });

    it("refuses to take a googleId owned by another account", async () => {
        const email = `link.owner.${suffix()}@example.com`;
        const googleId = `g-${suffix()}`;

        // Owner exists first (simulates the Google identity already in use).
        await createUser(`link.victim.${suffix()}@example.com`, googleId);
        const attacker = await createUser(email, null);

        await expect(
            linkGoogleAccount(attacker.id, makeProfile(googleId, email)),
        ).rejects.toMatchObject({
            statusCode: 409,
            errors: [{ code: "GOOGLE_ALREADY_LINKED" }],
        });

        const fresh = await prisma.user.findUnique({
            where: { id: attacker.id },
        });
        expect(fresh?.googleId).toBeNull();
    });

    it("rejects linking when a different Google account is already attached", async () => {
        const email = `link.attached.${suffix()}@example.com`;
        const user = await createUser(email, `g-existing-${suffix()}`);

        await expect(
            linkGoogleAccount(user.id, makeProfile(`g-${suffix()}`, email)),
        ).rejects.toMatchObject({
            statusCode: 409,
            errors: [{ code: "ALREADY_LINKED" }],
        });
    });

    it("rejects a nonexistent user", async () => {
        await expect(
            linkGoogleAccount(
                "00000000-0000-4000-8000-000000000000",
                makeProfile(`g-${suffix()}`, `x.${suffix()}@example.com`),
            ),
        ).rejects.toMatchObject({ statusCode: 401 });
    });
});

describe.skipIf(dbTestsEnabled)("linkGoogleAccount (skipped)", () => {
    it("documents that database tests require RUN_DB_TESTS=1", () => {
        expect(dbTestsEnabled).toBe(false);
    });
});
