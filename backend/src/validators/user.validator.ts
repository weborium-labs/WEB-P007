import { z } from "zod";

/**
 * Profile endpoints for the signed-in user (`/users/me`).
 *
 * Email is intentionally NOT editable here (release scope excludes email
 * change); password changes require the current password and live in their
 * own endpoint so a single compromised field cannot take over the account.
 */

const phoneRegex = /^\+?[0-9][0-9\s-]{6,16}$/;

export const updateProfileSchema = {
    body: z
        .object({
            phone: z
                .string("Phone number is required.")
                .trim()
                .max(20, "Phone number cannot exceed 20 characters.")
                .regex(
                    phoneRegex,
                    "Enter a valid phone number (digits, spaces, dashes).",
                )
                .optional(),
            dob: z
                .string("Date of birth is required.")
                .trim()
                .regex(
                    /^\d{4}-\d{2}-\d{2}$/,
                    "Date of birth must be in YYYY-MM-DD format.",
                )
                .refine((value) => !Number.isNaN(Date.parse(value)), {
                    message: "Enter a valid date of birth.",
                })
                .optional(),
            universityName: z
                .string("University name is required.")
                .trim()
                .min(2, "University name must be at least 2 characters.")
                .max(120, "University name cannot exceed 120 characters.")
                .optional(),
            photoUrl: z
                .string("Photo URL is required.")
                .trim()
                .url("Photo must be a valid URL.")
                .max(500, "Photo URL cannot exceed 500 characters.")
                .nullish(),
        })
        .refine(
            (data) =>
                Object.values(data).some((value) => value !== undefined),
            { message: "Provide at least one field to update." },
        ),
};

export const changePasswordSchema = {
    body: z
        .object({
            currentPassword: z
                .string("Current password is required.")
                .min(1, "Enter your current password."),
            newPassword: z
                .string("New password is required.")
                .min(8, "Use at least 8 characters for your password.")
                .max(72, "Password cannot exceed 72 characters.")
                .regex(/[A-Z]/, "Must include at least one uppercase letter.")
                .regex(/[a-z]/, "Must include at least one lowercase letter.")
                .regex(/[0-9]/, "Must include at least one number.")
                .refine((value) => value.length > 0, {
                    message: "New password is required.",
                }),
            confirmPassword: z
                .string("Please confirm your new password.")
                .min(1, "Please confirm your new password."),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: "Passwords do not match.",
            path: ["confirmPassword"],
        })
        .refine((data) => data.newPassword !== data.currentPassword, {
            message: "New password must be different from your current password.",
            path: ["newPassword"],
        }),
};

export type UpdateProfileInput = z.infer<typeof updateProfileSchema.body>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema.body>;
