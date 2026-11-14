import { randomBytes } from "node:crypto";

import type { Profile } from "passport-google-oauth20";

import { AuthType, Prisma, type User } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Google identity resolution.
 *
 * Guarantees (unchanged from the original implementation):
 *  - never creates a duplicate user for the same Google identity;
 *  - never auto-links by email match alone — an existing unlinked account is
 *    rejected with ACCOUNT_EXISTS so the user can sign in and link explicitly;
 *  - rejects Google profiles whose email is not verified by Google.
 *
 * Failure codes (`errors[0].code`) let the OAuth callback translate errors
 * into safe frontend redirect reasons without string matching.
 */

const GOOGLE_SIGNUP_ROLE_MAP = {
    Intern: "INTERN",
    Group_manager: "GPM",
    HR: "HR",
} as const;

type GoogleSignupRole = keyof typeof GOOGLE_SIGNUP_ROLE_MAP;

function getGoogleSignupRole(
    role: unknown,
): (typeof GOOGLE_SIGNUP_ROLE_MAP)[GoogleSignupRole] {
    if (
        typeof role !== "string" ||
        !Object.prototype.hasOwnProperty.call(
            GOOGLE_SIGNUP_ROLE_MAP,
            role,
        )
    ) {
        throw new ApiError(400, "Invalid or missing signup role.", [
            { code: "INVALID_ROLE" },
        ]);
    }

    return GOOGLE_SIGNUP_ROLE_MAP[role as GoogleSignupRole];
}

const generateUsername = async (displayName: string): Promise<string> => {
    const base =
        displayName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, ".")
            .replace(/^\.+|\.+$/g, "")
            .slice(0, 24) || "intern";

    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = `${base}.${randomBytes(3).toString("hex")}`;

        const existing = await prisma.user.findUnique({
            where: { username: candidate },
            select: { id: true },
        });

        if (!existing) {
            return candidate;
        }
    }

    throw new ApiError(500, "Unable to generate a unique username.");
};

const touchLoginActivity = (
    user: User,
    photoUrl: string | null,
): Promise<User> =>
    prisma.user.update({
        where: { id: user.id },
        data: {
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
            photoUrl,
        },
    });

export const findOrCreateGoogleUser = async (
    profile: Profile,
    requestedRole: unknown,
): Promise<User> => {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    const displayName = profile.displayName?.trim();
    const photoUrl = profile.photos?.[0]?.value ?? null;

    const googleEmailVerified =
        profile._json?.email_verified === true;

    if (!googleId || !email || !displayName) {
        throw new ApiError(400, "Google profile is incomplete.", [
            { code: "PROFILE_INCOMPLETE" },
        ]);
    }

    if (!googleEmailVerified) {
        throw new ApiError(
            403,
            "Google email address is not verified.",
            [{ code: "GOOGLE_EMAIL_UNVERIFIED" }],
        );
    }

    const existingGoogleUser = await prisma.user.findUnique({
        where: { googleId },
    });

    if (existingGoogleUser) {
        if (!existingGoogleUser.activeStatus) {
            throw new ApiError(403, "Your account is inactive.", [
                { code: "ACCOUNT_INACTIVE" },
            ]);
        }

        return touchLoginActivity(existingGoogleUser, photoUrl);
    }

    const existingEmailUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingEmailUser) {
        throw new ApiError(
            409,
            "An account with this email already exists. Sign in using your existing credentials before linking Google.",
            [{ code: "ACCOUNT_EXISTS" }],
        );
    }

    const role = getGoogleSignupRole(requestedRole);

    const username = await generateUsername(displayName);

    try {
        return await prisma.user.create({
            data: {
                googleId,
                email,
                username,
                photoUrl,
                authType: AuthType.GOOGLE,
                role,
                activeStatus: true,
                lastLoginAt: new Date(),
                lastActivityAt: new Date(),
            },
        });
    } catch (error) {
        // Recover only when another callback created this Google user.
        const racedUser = await prisma.user.findUnique({
            where: { googleId },
        });

        if (racedUser) {
            if (!racedUser.activeStatus) {
                throw new ApiError(403, "Your account is inactive.", [
                    { code: "ACCOUNT_INACTIVE" },
                ]);
            }

            return touchLoginActivity(racedUser, photoUrl);
        }

        // Two different Google identities racing on one email: report the
        // conflict, but never mislabel unrelated failures (connectivity,
        // username race) as a 409.
        const isUniqueViolation =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002";

        if (isUniqueViolation) {
            throw new ApiError(
                409,
                "An account with this email already exists. Sign in using your existing credentials before linking Google.",
                [{ code: "ACCOUNT_EXISTS" }],
            );
        }

        throw error;
    }
};

/* -------------------------------------------------------------------------- */
/*  Account linking (Feature 3)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Links a Google identity to an *existing, already authenticated* account.
 *
 * Security rules enforced here (never in the client):
 *  - the Google email must be verified by Google;
 *  - the Google email must equal the account email (explicit intent — this is
 *    NOT auto-linking: the user initiated the flow from their own profile and
 *    passed an authenticated session + signed state to reach this point);
 *  - the googleId must not already belong to a different account;
 *  - re-linking the same Google account is an idempotent no-op.
 *
 * Runs in a transaction so a concurrent link of the same googleId loses the
 * race cleanly (unique index on User.googleId).
 */
export const linkGoogleAccount = async (
    userId: string,
    profile: Profile,
): Promise<User> => {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    const photoUrl = profile.photos?.[0]?.value ?? null;
    const googleEmailVerified = profile._json?.email_verified === true;

    if (!googleId || !email) {
        throw new ApiError(400, "Google profile is incomplete.", [
            { code: "PROFILE_INCOMPLETE" },
        ]);
    }

    if (!googleEmailVerified) {
        throw new ApiError(403, "Google email address is not verified.", [
            { code: "GOOGLE_EMAIL_UNVERIFIED" },
        ]);
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });

            if (!user) {
                throw new ApiError(401, "Invalid session.");
            }

            if (!user.activeStatus) {
                throw new ApiError(403, "Your account is inactive.", [
                    { code: "ACCOUNT_INACTIVE" },
                ]);
            }

            // Idempotent: already linked to this very account.
            if (user.googleId === googleId) {
                return user;
            }

            if (user.googleId !== null) {
                throw new ApiError(
                    409,
                    "A different Google account is already linked to this profile.",
                    [{ code: "ALREADY_LINKED" }],
                );
            }

            if (user.email.toLowerCase() !== email) {
                throw new ApiError(
                    400,
                    "This Google account uses a different email address. Link the Google account that matches your profile email.",
                    [{ code: "EMAIL_MISMATCH" }],
                );
            }

            // Refuse to steal an identity that already belongs to someone else.
            const owner = await tx.user.findUnique({
                where: { googleId },
                select: { id: true },
            });

            if (owner && owner.id !== userId) {
                throw new ApiError(
                    409,
                    "This Google account is already linked to another user.",
                    [{ code: "GOOGLE_ALREADY_LINKED" }],
                );
            }

            return tx.user.update({
                where: { id: userId },
                data: {
                    googleId,
                    // Adopt the Google photo only when the account has none.
                    ...(user.photoUrl === null && photoUrl
                        ? { photoUrl }
                        : {}),
                },
            });
        });
    } catch (error) {
        // Two concurrent links of the same googleId: the loser hits the
        // unique index instead of the pre-check above.
        const isGoogleIdRace =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002";

        if (isGoogleIdRace) {
            throw new ApiError(
                409,
                "This Google account is already linked to another user.",
                [{ code: "GOOGLE_ALREADY_LINKED" }],
            );
        }

        throw error;
    }
};
