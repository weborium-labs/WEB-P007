import { z } from "zod";

export const signupSchema = z
    .object({
        email: z
            .string({ required_error: "Email is required." })
            .trim()
            .toLowerCase()
            .email("Enter a valid email address."),
        username: z
            .string({ required_error: "Username is required." })
            .trim()
            .min(3, "Username must be at least 3 characters.")
            .max(30, "Username cannot exceed 30 characters.")
            .regex(
                /^[a-zA-Z0-9._-]+$/,
                "Username can only contain letters, numbers, dots, underscores, or hyphens.",
            ),
        password: z
            .string({ required_error: "Password is required." })
            .min(8, "Use at least 8 characters for your password.")
            .max(72, "Password cannot exceed 72 characters.")
            .regex(/[A-Z]/, "Must include at least one uppercase letter.")
            .regex(/[a-z]/, "Must include at least one lowercase letter.")
            .regex(/[0-9]/, "Must include at least one number."),
        confirmPassword: z.string({
            required_error: "Please re-enter your password.",
        }),
        role: z.enum(["INTERN", "GPM"]).optional().default("INTERN"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

export const verifyOtpSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .toLowerCase()
        .email("Enter a valid email address."),
    otp: z
        .string({ required_error: "OTP is required." })
        .trim()
        .length(4, "OTP must be exactly 4 digits.")
        .regex(/^\d{4}$/, "OTP must contain only digits."),
});

export const resendOtpSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .toLowerCase()
        .email("Enter a valid email address."),
});

export const loginSchema = z.object({
    identifier: z
        .string({ required_error: "Email or username is required." })
        .trim()
        .min(3, "Enter a valid email or username."),
    password: z
        .string({ required_error: "Password is required." })
        .min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .toLowerCase()
        .email("Enter a valid email address."),
});

export const verifyResetOtpSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .toLowerCase()
        .email("Enter a valid email address."),
    otp: z
        .string({ required_error: "OTP is required." })
        .trim()
        .length(4, "OTP must be exactly 4 digits.")
        .regex(/^\d{4}$/, "OTP must contain only digits."),
});

export const resetPasswordSchema = z
    .object({
        email: z
            .string({ required_error: "Email is required." })
            .trim()
            .toLowerCase()
            .email("Enter a valid email address."),
        otp: z
            .string({ required_error: "OTP is required." })
            .trim()
            .length(4, "OTP must be exactly 4 digits.")
            .regex(/^\d{4}$/, "OTP must contain only digits."),
        newPassword: z
            .string({ required_error: "New password is required." })
            .min(8, "Use at least 8 characters for your password.")
            .max(72, "Password cannot exceed 72 characters."),
        confirmPassword: z.string({
            required_error: "Please confirm your password.",
        }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;