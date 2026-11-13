
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { AuthType, type User } from "../generated/prisma/client.js";
import type { Profile } from "passport-google-oauth20";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { emailService } from "./email.service.js";
import { getPasswordResetOtpEmailTemplate,
    getSignupOtpEmailTemplate,
    getWelcomeEmailTemplate, } from "../utils/emailTemplates.js";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type {
    ForgotPasswordInput,
    LoginInput,
    ResendOtpInput,
    ResetPasswordInput,
    SignupInput,
    VerifyOtpInput,
    VerifyResetOtpInput,
} from "../validators/auth.validator.js";



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
        throw new ApiError(400, "Invalid or missing signup role.");
    }

    return GOOGLE_SIGNUP_ROLE_MAP[role as GoogleSignupRole];
}

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


/// for noraml auth ///

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;


const generateOtp = () => {
    const otp = crypto.randomInt(1000, 9999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    return { otp, otpHash, otpExpiresAt };
};

const hashOtp = (otp: string) =>
    crypto.createHash("sha256").update(otp).digest("hex");

export const signup = async (input: SignupInput) => {
    const { email, username, password, role } = input;

    const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
        if (existingUser.email === email && existingUser.isEmailVerified) {
            throw new ApiError(409, "An account with this email already exists.");
        }
        if (existingUser.username === username && existingUser.email !== email) {
            throw new ApiError(409, "This username is already taken.");
        }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { otp, otpHash, otpExpiresAt } = generateOtp();

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            username,
            password: hashedPassword,
            role,
            otpHash,
            otpExpiresAt,
            otpAttempts: 0,
        },
        create: {
            email,
            username,
            password: hashedPassword,
            role,
            authType: "UNP",
            isEmailVerified: false,
            otpHash,
            otpExpiresAt,
            otpAttempts: 0,
        },
        select: {
            id: true,
            email: true,
            username: true,
            role: true,
            isEmailVerified: true,
        },
    });

    await emailService.sendEmail(
    user.email,
    `${otp} is your Weborium Labs verification code`,
    getSignupOtpEmailTemplate({ username: user.username, otp }),
);

    if (env.NODE_ENV !== "production") {
        console.log(`[DEV OTP] Signup OTP for ${user.email}: ${otp}`);
    }

    return { user };
};

export const verifyOtp = async (input: VerifyOtpInput) => {
    const { email, otp } = input;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new ApiError(404, "No account found with this email.");
    }

    if (user.isEmailVerified) {
        throw new ApiError(400, "Email is already verified. Please log in.");
    }

    if (!user.otpHash || !user.otpExpiresAt) {
        throw new ApiError(400, "No active OTP found. Please request a new one.");
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        throw new ApiError(
            429,
            "Too many failed attempts. Please request a new OTP.",
        );
    }

    if (user.otpExpiresAt < new Date()) {
        throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    if (hashOtp(otp) !== user.otpHash) {
        await prisma.user.update({
            where: { id: user.id },
            data: { otpAttempts: { increment: 1 } },
        });
        throw new ApiError(400, "Invalid OTP code.");
    }

    const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            otpHash: null,
            otpExpiresAt: null,
            otpAttempts: 0,
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
        },
    });
    // Send welcome email asynchronously (don't block verification if welcome mail hiccups)
emailService
    .sendEmail(
        verifiedUser.email,
        "Welcome to Weborium Labs IMS!",
        getWelcomeEmailTemplate({
            username: verifiedUser.username,
            role: verifiedUser.role,
        }),
    )
    .catch((err) => console.error("[Welcome Email Error]:", err));

    const accessToken = generateAccessToken(verifiedUser);
    const refreshToken = generateRefreshToken(verifiedUser);

    const safeUser = {
        id: verifiedUser.id,
        email: verifiedUser.email,
        username: verifiedUser.username,
        role: verifiedUser.role,
        isEmailVerified: verifiedUser.isEmailVerified,
        verificationStatus: verifiedUser.verificationStatus,
    };

    return { user: safeUser, accessToken, refreshToken };
};

export const resendOtp = async (input: ResendOtpInput) => {
    const { email } = input;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new ApiError(404, "No account found with this email.");
    }

    if (user.isEmailVerified) {
        throw new ApiError(400, "Email is already verified. Please log in.");
    }

    const { otp, otpHash, otpExpiresAt } = generateOtp();

    await prisma.user.update({
        where: { id: user.id },
        data: {
            otpHash,
            otpExpiresAt,
            otpAttempts: 0,
        },
    });

    await emailService.sendEmail(
    user.email,
    `${otp} is your new Weborium Labs verification code`,
    getSignupOtpEmailTemplate({ username: user.username, otp }),
);

    if (env.NODE_ENV !== "production") {
        console.log(`[DEV OTP] Resent OTP for ${user.email}: ${otp}`);
    }

    return { email: user.email };
};

export const login = async (input: LoginInput) => {
    const { identifier, password } = input;
    const normalized = identifier.toLowerCase();

    const user = await prisma.user.findFirst({
        where: {
            OR: [{ email: normalized }, { username: identifier }],
        },
    });

    if (!user || !user.password) {
        throw new ApiError(401, "Invalid credentials.");
    }

    if (!user.activeStatus) {
        throw new ApiError(
            403,
            "Your account is deactivated. Please contact HR or Admin.",
        );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials.");
    }

    if (!user.isEmailVerified) {
        const { otp, otpHash, otpExpiresAt } = generateOtp();
        await prisma.user.update({
            where: { id: user.id },
            data: { otpHash, otpExpiresAt, otpAttempts: 0 },
        });

        

        if (env.NODE_ENV !== "production") {
            console.log(`[DEV OTP] Login verification OTP for ${user.email}: ${otp}`);
        }

        await emailService.sendEmail(
    user.email,
    `${otp} is your Weborium Labs verification code`,
    getSignupOtpEmailTemplate({ username: user.username, otp }),
);

        throw new ApiError(
            403,
            "Email not verified. A new verification OTP has been sent to your email.",
        );
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
        },
    });

    const accessToken = generateAccessToken(updatedUser);
    const refreshToken = generateRefreshToken(updatedUser);

    const safeUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        photoUrl: updatedUser.photoUrl,
        batchId: updatedUser.batchId,
        isEmailVerified: updatedUser.isEmailVerified,
        verificationStatus: updatedUser.verificationStatus,
    };

    return { user: safeUser, accessToken, refreshToken };
};

export const forgotPassword = async (input: ForgotPasswordInput) => {
    const email = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.activeStatus) {
        return { email };
    }

    const { otp, otpHash, otpExpiresAt } = generateOtp();

    await prisma.user.update({
        where: { id: user.id },
        data: {
            otpHash,
            otpExpiresAt,
            otpAttempts: 0,
        },
    });

    await emailService.sendEmail(
        user.email,
        `${otp} is your Weborium Labs password reset code`,
        getPasswordResetOtpEmailTemplate({ username: user.username, otp }),
    );

    return { email: user.email };
};

export const verifyResetOtp = async (input: VerifyResetOtpInput) => {
    const { email, otp } = input;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.otpHash || !user.otpExpiresAt) {
        throw new ApiError(400, "Invalid or expired OTP.");
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        throw new ApiError(429, "Too many failed attempts. Please request a new OTP.");
    }

    if (user.otpExpiresAt < new Date()) {
        throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    if (hashOtp(otp) !== user.otpHash) {
        await prisma.user.update({
            where: { id: user.id },
            data: { otpAttempts: { increment: 1 } },
        });
        throw new ApiError(400, "Invalid OTP code.");
    }

    return { verified: true };
};

export const resetPassword = async (input: ResetPasswordInput) => {
    const { email, otp, newPassword } = input;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.otpHash || !user.otpExpiresAt) {
        throw new ApiError(400, "Invalid or expired reset request.");
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        throw new ApiError(429, "Too many failed attempts. Please request a new OTP.");
    }

    if (user.otpExpiresAt < new Date()) {
        throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    if (hashOtp(otp) !== user.otpHash) {
        await prisma.user.update({
            where: { id: user.id },
            data: { otpAttempts: { increment: 1 } },
        });
        throw new ApiError(400, "Invalid OTP code.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            isEmailVerified: true,
            otpHash: null,
            otpExpiresAt: null,
            otpAttempts: 0,
        },
    });

    return { email: user.email };
};