
import jwt from "jsonwebtoken";
import type { User } from "../generated/prisma/client.js";

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

/**
 * The single canonical public user shape returned by every authenticated
 * response (login, OTP verification, refresh, OAuth exchange).
 *
 * Never includes password, OTP material, googleId or raw activity fields.
 */
export const toPublicUser = (user: User) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    photoUrl: user.photoUrl,
    batchId: user.batchId,
    isEmailVerified: user.isEmailVerified,
    verificationStatus: user.verificationStatus,
});

export type PublicUser = ReturnType<typeof toPublicUser>;

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

    return {
        user: toPublicUser(verifiedUser),
        accessToken,
        refreshToken,
    };
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

    return {
        user: toPublicUser(updatedUser),
        accessToken,
        refreshToken,
    };
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
