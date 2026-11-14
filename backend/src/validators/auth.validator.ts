import { z } from "zod";

export const signupSchema = {
    body: z
        .object({
            email: z
                .string("Email is required.")
                .trim()
                .toLowerCase()
                .email("Enter a valid email address."),
            username: z
                .string("Username is required.")
                .trim()
                .min(3, "Username must be at least 3 characters.")
                .max(30, "Username cannot exceed 30 characters.")
                .regex(
                    /^[a-zA-Z0-9._-]+$/,
                    "Username can only contain letters, numbers, dots, underscores, or hyphens.",
                ),
            password: z
                .string("Password is required.")
                .min(8, "Use at least 8 characters for your password.")
                .max(72, "Password cannot exceed 72 characters.")
                .regex(/[A-Z]/, "Must include at least one uppercase letter.")
                .regex(/[a-z]/, "Must include at least one lowercase letter.")
                .regex(/[0-9]/, "Must include at least one number."),
            confirmPassword: z.string("Please re-enter your password."),
            role: z.enum(["INTERN", "GPM"]).optional().default("INTERN"),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: "Passwords do not match.",
            path: ["confirmPassword"],
        }),
};

export const verifyOtpSchema = {
    body: z.object({
        email: z
            .string("Email is required.")
            .trim()
            .toLowerCase()
            .email("Enter a valid email address."),
        otp: z
            .string("OTP is required.")
            .trim()
            .length(4, "OTP must be exactly 4 digits.")
            .regex(/^\d{4}$/, "OTP must contain only digits."),
    }),
};

export const resendOtpSchema = {
    body: z.object({
        email: z
            .string("Email is required.")
            .trim()
            .toLowerCase()
            .email("Enter a valid email address."),
    }),
};

export const loginSchema = {
    body: z.object({
        identifier: z
            .string("Email or username is required.")
            .trim()
            .min(3, "Enter a valid email or username."),
        password: z
            .string("Password is required.")
            .min(1, "Password is required."),
    }),
};

export const forgotPasswordSchema = {
    body: z.object({
        email: z
            .string("Email is required.")
            .trim()
            .toLowerCase()
            .email("Enter a valid email address."),
    }),
};

export const verifyResetOtpSchema = {
    body: z.object({
        email: z
            .string("Email is required.")
            .trim()
            .toLowerCase()
            .email("Enter a valid email address."),
        otp: z
            .string("OTP is required.")
            .trim()
            .length(4, "OTP must be exactly 4 digits.")
            .regex(/^\d{4}$/, "OTP must contain only digits."),
    }),
};

export const resetPasswordSchema = {
    body: z
        .object({
            email: z
                .string("Email is required.")
                .trim()
                .toLowerCase()
                .email("Enter a valid email address."),
            otp: z
                .string("OTP is required.")
                .trim()
                .length(4, "OTP must be exactly 4 digits.")
                .regex(/^\d{4}$/, "OTP must contain only digits."),
            newPassword: z
                .string("New password is required.")
                .min(8, "Use at least 8 characters for your password.")
                .max(72, "Password cannot exceed 72 characters."),
            confirmPassword: z.string("Please confirm your password."),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: "Passwords do not match.",
            path: ["confirmPassword"],
        }),
};

export const exchangeCodeSchema = {
    body: z.object({
        code: z
            .string("Authorization code is required.")
            .trim()
            .min(16, "Authorization code is invalid.")
            .max(128, "Authorization code is invalid."),
    }),
};

export type SignupInput = z.infer<typeof signupSchema.body>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema.body>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema.body>;
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema.body>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema.body>;
export type ExchangeCodeInput = z.infer<typeof exchangeCodeSchema.body>;