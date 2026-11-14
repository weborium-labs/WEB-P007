import { createHash, randomBytes } from "node:crypto";

import type { User } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Single-use authorization codes for the OAuth redirect -> session exchange.
 *
 * The Google callback redirects with a random code — never a reusable access
 * token. Only the SHA-256 hash of the code is stored, so a database leak
 * cannot be replayed. Consumption is a guarded UPDATE inside a transaction,
 * which makes duplicate callbacks, double renders and concurrent redemption
 * attempts converge on exactly one success.
 */

/** Short-lived by design: the code only needs to survive one redirect. */
const AUTH_CODE_TTL_MS = 60 * 1000;

/** Keep consumed/expired rows briefly for debugging, then sweep them. */
const CODE_RETENTION_MS = 60 * 60 * 1000;

const INVALID_CODE_MESSAGE =
    "This sign-in link is invalid, expired, or has already been used.";

const hashCode = (code: string): string =>
    createHash("sha256").update(code).digest("hex");

/** Issues a one-time code for `userId` and returns the plaintext code. */
export const issueAuthCode = async (userId: string): Promise<string> => {
    const code = randomBytes(32).toString("base64url");

    // Opportunistic cleanup keeps the table bounded without a cron job.
    await prisma.authCode.deleteMany({
        where: { expiresAt: { lt: new Date(Date.now() - CODE_RETENTION_MS) } },
    });

    await prisma.authCode.create({
        data: {
            codeHash: hashCode(code),
            userId,
            expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
        },
    });

    return code;
};

/**
 * Atomically redeems a code and returns the authenticated user.
 *
 * Throws `401` for missing, expired or already-redeemed codes — the same
 * message in every case so callers cannot probe which condition failed.
 */
export const consumeAuthCode = async (rawCode: string): Promise<User> => {
    const codeHash = hashCode(rawCode);

    return prisma.$transaction(async (tx) => {
        const record = await tx.authCode.findUnique({
            where: { codeHash },
            select: {
                id: true,
                userId: true,
                expiresAt: true,
                consumedAt: true,
            },
        });

        if (
            !record ||
            record.consumedAt !== null ||
            record.expiresAt.getTime() <= Date.now()
        ) {
            throw new ApiError(401, INVALID_CODE_MESSAGE);
        }

        // Guarded claim: a concurrent redeem sees `consumedAt != null` and
        // loses the race (row lock re-evaluates the predicate).
        const claimed = await tx.authCode.updateMany({
            where: { id: record.id, consumedAt: null },
            data: { consumedAt: new Date() },
        });

        if (claimed.count !== 1) {
            throw new ApiError(401, INVALID_CODE_MESSAGE);
        }

        const user = await tx.user.findUnique({
            where: { id: record.userId },
        });

        if (!user) {
            throw new ApiError(401, INVALID_CODE_MESSAGE);
        }

        if (!user.activeStatus) {
            throw new ApiError(
                403,
                "Your account is inactive. Please contact HR or Admin.",
                [{ code: "ACCOUNT_INACTIVE" }],
            );
        }

        return user;
    });
};
