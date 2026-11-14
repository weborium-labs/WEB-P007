import { z } from "zod";

/**
 * Username rules shared by signup and profile editing.
 *
 * Single source of truth so the two flows can never drift: 3–30 characters,
 * letters / digits / dot / underscore / hyphen only, outer whitespace trimmed.
 * Case is preserved exactly as typed (login and display rely on it); *uniqueness*
 * is case-insensitive and enforced by the `User_username_lower_key` index in
 * PostgreSQL — never by a client-side availability lookup.
 */
export const usernameSchema = z
    .string("Username is required.")
    .trim()
    // `.min(1)` after `.trim()` gives a precise message for empty / whitespace
    // input; `.min(3)` still owns the real lower bound.
    .min(1, "Username is required.")
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username cannot exceed 30 characters.")
    .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username can only contain letters, numbers, dots, underscores, or hyphens.",
    );
