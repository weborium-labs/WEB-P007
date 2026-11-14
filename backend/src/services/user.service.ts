import bcrypt from "bcryptjs";

import type { User } from "../generated/prisma/client.js";
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
 * Updates editable profile fields. Unknown/extra fields never reach Prisma:
 * the validator whitelists the shape and we spread only those keys.
 */
export const updateProfile = async (
    userId: string,
    input: UpdateProfileInput,
): Promise<UserProfile> => {
    const data: {
        phone?: string;
        dob?: string;
        universityName?: string;
        photoUrl?: string | null;
    } = {};

    if (input.phone !== undefined) data.phone = input.phone;
    if (input.dob !== undefined) data.dob = input.dob;
    if (input.universityName !== undefined) {
        data.universityName = input.universityName;
    }
    if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl;

    const user = await prisma.user.update({
        where: { id: userId },
        data,
    });

    return buildUserProfile(user);
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
