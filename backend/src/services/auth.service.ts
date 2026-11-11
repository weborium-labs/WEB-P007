
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { AuthType, type User } from "../generated/prisma/client.js";
import type { Profile } from "passport-google-oauth20";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";

const accessTokenSecret = env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = env.REFRESH_TOKEN_SECRET;

const generateAccessToken = (user: User): string => {
    return jwt.sign(
        {
            userId: user.id,
            role: user.role,
        },
        accessTokenSecret,
        {
            algorithm: "HS256",
            expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
        },
    );
};

const generateRefreshToken = (user: User): string => {
    return jwt.sign(
        {
            userId: user.id,
        },
        refreshTokenSecret,
        {
            algorithm: "HS256",
            expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
        },
    );
};

const generateUsername = async (
    displayName: string,
): Promise<string> => {
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

    throw new ApiError(
        500,
        "Unable to generate a unique username.",
    );
};

export const findOrCreateGoogleUser = async (
    profile: Profile,
): Promise<User> => {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    const displayName = profile.displayName?.trim();
    const photoUrl = profile.photos?.[0]?.value ?? null;

    const googleEmailVerified =
        profile._json?.email_verified === true;

    if (!googleId || !email || !displayName) {
        throw new ApiError(
            400,
            "Google profile is incomplete.",
        );
    }

    if (!googleEmailVerified) {
        throw new ApiError(
            403,
            "Google email address is not verified.",
        );
    }

    const existingGoogleUser = await prisma.user.findUnique({
        where: { googleId },
    });

    if (existingGoogleUser) {
        if (!existingGoogleUser.activeStatus) {
            throw new ApiError(
                403,
                "Your account is inactive.",
            );
        }

        return prisma.user.update({
            where: { id: existingGoogleUser.id },
            data: {
                lastLoginAt: new Date(),
                lastActivityAt: new Date(),
                photoUrl,
            },
        });
    }

    const existingEmailUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingEmailUser) {
        throw new ApiError(
            409,
            "An account with this email already exists. Sign in using your existing credentials before linking Google.",
        );
    }

    const username = await generateUsername(displayName);

    try {
        return await prisma.user.create({
            data: {
                googleId,
                email,
                username,
                photoUrl,
                authType: AuthType.GOOGLE,
                role: "INTERN",
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

        if (!racedUser) {
            throw error;
        }

        if (!racedUser.activeStatus) {
            throw new ApiError(
                403,
                "Your account is inactive.",
            );
        }

        return prisma.user.update({
            where: { id: racedUser.id },
            data: {
                lastLoginAt: new Date(),
                lastActivityAt: new Date(),
                photoUrl,
            },
        });
    }
};

export const createAuthTokens = async (user: User) => {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
        accessToken,
        refreshToken,
    };
};

export const verifyRefreshToken = async (
    token: string,
): Promise<User> => {
    try {
        const decoded = jwt.verify(
            token,
            refreshTokenSecret,
            {
                algorithms: ["HS256"],
            },
        );

        if (
            typeof decoded === "string" ||
            typeof decoded.userId !== "string"
        ) {
            throw new ApiError(
                401,
                "Invalid refresh token.",
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || !user.activeStatus) {
            throw new ApiError(
                401,
                "Invalid or inactive user session.",
            );
        }

        return user;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            401,
            "Invalid or expired refresh token.",
        );
    }
};
