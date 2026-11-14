/**
 * Client-side username rules — the single source of truth for the browser.
 *
 * Mirrors `backend/src/validators/common.validator.ts` exactly (3–30 chars,
 * letters / digits / dot / underscore / hyphen, outer whitespace trimmed) so
 * signup and profile editing can never disagree with the server.
 *
 * This module only answers *"is this well-formed?"*. Availability is NEVER
 * checked here: the database's unique index decides that atomically on Save.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

/** Trimmed form that is sent to (and stored by) the server. */
export const normalizeUsername = (value: string): string => value.trim();

/**
 * Validates a raw username.
 *
 * @returns the first failing rule's message, or `null` when the value is valid.
 */
export const validateUsername = (value: string): string | null => {
    const username = normalizeUsername(value);

    if (username.length === 0) {
        return "Username is required.";
    }

    if (username.length < USERNAME_MIN_LENGTH) {
        return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
    }

    if (username.length > USERNAME_MAX_LENGTH) {
        return `Username cannot exceed ${USERNAME_MAX_LENGTH} characters.`;
    }

    if (!USERNAME_PATTERN.test(username)) {
        return "Username can only contain letters, numbers, dots, underscores, or hyphens.";
    }

    return null;
};
