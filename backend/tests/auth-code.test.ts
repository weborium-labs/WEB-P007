import { createHash, randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/lib/prisma.js";
import {
    consumeAuthCode,
    issueAuthCode,
} from "../src/services/auth-code.service.js";

/**
 * Database-backed tests for single-use authorization codes.
 *
 * OPT-IN: set RUN_DB_TESTS=1 to run these against `DATABASE_URL`.
 * They only ever write to the self-contained `AuthCode` table (no user rows
 * are created, modified or deleted) and clean up after themselves.
 */
const dbTestsEnabled = process.env.RUN_DB_TESTS === "1";

const sha256 = (value: string): string =>
    createHash("sha256").update(value).digest("hex");

describe.skipIf(!dbTestsEnabled)("AuthCode service (database)", () => {
    const suiteStartedAt = new Date();
    const createdCodeHashes: string[] = [];
    let userId: string;

    beforeAll(async () => {
        // Reuses an existing user id — AuthCode has no foreign key and
        // consuming a code never mutates the user row.
        const user = await prisma.user.findFirst({ select: { id: true } });

        if (!user) {
            throw new Error(
                "RUN_DB_TESTS=1 requires at least one user in the database.",
            );
        }

        userId = user.id;
    });

    afterAll(async () => {
        await prisma.authCode.deleteMany({
            where: { codeHash: { in: createdCodeHashes } },
        });

        // Defensive sweep in case a helper created rows before tracking them.
        await prisma.authCode.deleteMany({
            where: { createdAt: { gte: suiteStartedAt }, userId },
        });
    });

    it("issues a code that can be consumed exactly once", async () => {
        const code = await issueAuthCode(userId);
        createdCodeHashes.push(sha256(code));

        const user = await consumeAuthCode(code);
        expect(user.id).toBe(userId);

        // Replay of the same code must fail with the generic 401.
        await expect(consumeAuthCode(code)).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it("rejects a well-formed code that was never issued", async () => {
        const ghostCode = randomBytes(32).toString("base64url");

        await expect(consumeAuthCode(ghostCode)).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it("rejects an expired code", async () => {
        const expiredPlain = `expired.${randomBytes(16).toString("base64url")}`;
        const codeHash = sha256(expiredPlain);
        createdCodeHashes.push(codeHash);

        await prisma.authCode.create({
            data: {
                codeHash,
                userId,
                expiresAt: new Date(Date.now() - 1000),
            },
        });

        await expect(consumeAuthCode(expiredPlain)).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it("concurrent redemption converges on a single success", async () => {
        const code = await issueAuthCode(userId);
        createdCodeHashes.push(sha256(code));

        const results = await Promise.allSettled([
            consumeAuthCode(code),
            consumeAuthCode(code),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
    });
});

describe.skipIf(dbTestsEnabled)("AuthCode service (skipped)", () => {
    it("documents that database tests require RUN_DB_TESTS=1", () => {
        expect(dbTestsEnabled).toBe(false);
    });
});
