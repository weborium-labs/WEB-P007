import bcrypt from "bcryptjs";

import { Prisma, type User } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { toPublicUser } from "./auth.service.js";
import type {
    ChangePasswordInput,
    UpdateProfileInput,
} from "../validators/user.validator.js";

/**
 * Profile services for the signed-in user.
 *
 * Response shape rules:
 *  - never returns password hashes, OTP material, googleId or raw tokens;
 *  - provider status is *derived* (`password != null` / `googleId != null`)
 *    instead of trusting the legacy `authType` column;
 *  - email is read-only in this release.
 */

export interface UserProfile extends ReturnType<typeof toPublicUser> {
    phone: string | null;
    dob: string | null;
    universityName: string | null;
    createdAt: Date;
    providers: {
        password: boolean;
        google: boolean;
    };
}

export const buildUserProfile = (user: User): UserProfile => ({
    ...toPublicUser(user),
    phone: user.phone,
    dob: user.dob,
    universityName: user.universityName,
    createdAt: user.createdAt,
    providers: {
        password: user.password !== null,
        google: user.googleId !== null,
    },
});

/** Loads the caller's full profile row (404 only if the session user vanished). */
export const getProfile = async (userId: string): Promise<UserProfile> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new ApiError(404, "Account not found.");
    }

    return buildUserProfile(user);
};

/**
 * Extracts the violated index name from a Prisma P2002 error.
 *
 * The project runs Prisma against the `@prisma/adapter-pg` driver adapter, which
 * reports the constraint under `meta.driverAdapterError.cause.constraint.index`
 * instead of the classic `meta.target`. Both shapes are handled so the caller can
 * distinguish the username indexes from any other unique violation.
 */
const uniqueIndexFromError = (error: {
    meta?: unknown;
}): string | undefined => {
    const meta = error.meta as
        | {
              target?: unknown;
              driverAdapterError?: {
                  cause?: { constraint?: { index?: unknown } };
              };
          }
        | undefined;

    const adapterIndex =
        meta?.driverAdapterError?.cause?.constraint?.index;
    if (typeof adapterIndex === "string") return adapterIndex;

    const target = meta?.target;
    if (typeof target === "string") return target;
    if (Array.isArray(target)) {
        return target.filter((entry): entry is string => typeof entry === "string").join(",");
    }

    return undefined;
};

/** True only for a unique violation caused by a username index. */
const isUsernameConflict = (error: unknown): boolean => {
    if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
    ) {
        return false;
    }

    const index = uniqueIndexFromError(error);

    // Both `User_username_key` (exact) and `User_username_lower_key`
    // (case-insensitive) are username indexes. Anything else — an unrelated
    // constraint — must keep flowing to the generic error handler.
    return index !== undefined && /username/i.test(index);
};

/**
 * Updates editable profile fields. Unknown/extra fields never reach Prisma:
 * the validator whitelists the shape and we spread only those keys.
 *
 * Username availability is decided by the database itself: this performs a
 * single UPDATE and lets the unique indexes arbitrate. There is deliberately no
 * preceding SELECT — that would be a time-of-check/time-of-use race under
 * concurrent claims of the same name.
 */
export const updateProfile = async (
    userId: string,
    input: UpdateProfileInput,
): Promise<UserProfile> => {
    const data: {
        username?: string;
        phone?: string;
        dob?: string;
        universityName?: string;
        photoUrl?: string | null;
    } = {};

    if (input.username !== undefined) data.username = input.username;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.dob !== undefined) data.dob = input.dob;
    if (input.universityName !== undefined) {
        data.universityName = input.universityName;
    }
    if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl;

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data,
        });

        return buildUserProfile(user);
    } catch (error) {
        // A conflict is only mapped to USERNAME_TAKEN when a username was part
        // of this write *and* the failing index is a username index.
        if (input.username !== undefined && isUsernameConflict(error)) {
            throw new ApiError(409, "This username is already taken.", [
                { code: "USERNAME_TAKEN", field: "username" },
            ]);
        }

        throw error;
    }
};

/**
 * Confirms the caller may start a Google link flow.
 *
 * Fails early (before any Google redirect) when a Google account is already
 * attached, so the UI can show a clear message instead of a wasted OAuth
 * round-trip. The callback re-checks everything server-side anyway.
 */
export const assertGoogleLinkable = async (userId: string): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, googleId: true, activeStatus: true },
    });

    if (!user) {
        throw new ApiError(401, "Invalid session.");
    }

    if (!user.activeStatus) {
        throw new ApiError(403, "Your account is inactive.", [
            { code: "ACCOUNT_INACTIVE" },
        ]);
    }

    if (user.googleId !== null) {
        throw new ApiError(409, "A Google account is already linked.", [
            { code: "ALREADY_LINKED" },
        ]);
    }
};

/**
 * Changes the password after re-verifying the current one.
 *
 * Google-only accounts (no local password) are rejected: they must set up
 * credentials through the password-reset flow, not by guessing a "current"
 * password they never had.
 */
export const changePassword = async (
    userId: string,
    input: ChangePasswordInput,
): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new ApiError(404, "Account not found.");
    }

    if (!user.password) {
        throw new ApiError(
            400,
            "This account signs in with Google. Use Google to manage your credentials.",
            [{ code: "PASSWORD_NOT_SET" }],
        );
    }

    const isCurrentValid = await bcrypt.compare(
        input.currentPassword,
        user.password,
    );

    if (!isCurrentValid) {
        // Deliberately generic: never reveals whether the account exists or
        // which field was wrong.
        throw new ApiError(400, "Current password is incorrect.", [
            { code: "CURRENT_PASSWORD_INVALID" },
        ]);
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
};
