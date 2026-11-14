import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Button from "../component/Button";
import GoogleIcon from "../assets/GoogleIcon.svg";
import type { ApiClientError } from "../api/apiClient";
import { normalizeUsername, validateUsername } from "../lib/username";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
    useChangePasswordMutation,
    useLinkGoogleMutation,
    useProfileQuery,
    useSyncAuthUser,
    useUpdateProfileMutation,
} from "../hooks/useProfile";

/**
 * Current-user profile (`/profile`).
 *
 * Follows the dashboard design language: #F7F8FA canvas, white cards with
 * #EEF0F3 borders, #101828 headings and the shared Button component.
 *
 * Rules honoured here:
 *  - email is read-only (server enforces it too);
 *  - username is edited through an explicit read → edit → save flow where the
 *    only availability check is the atomic PATCH (no keystroke round-trips);
 *  - provider status comes from the server (`providers.*`), not client state;
 *  - password change always re-verifies the current password server-side;
 *  - no secrets (hashes, OTPs) ever reach this component.
 */

/** Message shown when the backend reports the username is already taken. */
const USERNAME_TAKEN_MESSAGE =
    "This username is already taken. Please choose another one.";

const USERNAME_UPDATED_MESSAGE = "Username updated successfully.";

const USERNAME_FALLBACK_ERROR =
    "Could not save your username. Please try again.";

/** Safe link-flow status codes returned by the OAuth callback redirect. */
const LINK_ERROR_COPY: Readonly<Record<string, string>> = {
    link_email_mismatch:
        "That Google account uses a different email address. Link the Google account that matches your profile email.",
    link_google_taken:
        "That Google account is already linked to another user.",
    link_already_linked:
        "A Google account is already linked to this profile.",
    email_not_verified:
        "Google reported that email address as unverified. Verify it with Google and try again.",
    access_denied: "You cancelled the Google sign-in. Try again whenever you're ready.",
    invalid_state:
        "For your security, this linking attempt expired or could not be verified. Please try again.",
    profile_incomplete:
        "Your Google account did not provide the information we need. Try again or use your email and password.",
    account_inactive: "This account has been deactivated. Please contact your HR or administrator.",
    oauth_failed: "We couldn't link Google to your account. Please try again.",
};

const inputClass =
    "w-full rounded-lg border border-[#DCE1E8] bg-white px-3.5 py-2.5 text-sm text-[#141B2A] outline-none transition-colors placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-2 focus:ring-[#2862F4]/20 disabled:bg-[#F2F4F7] disabled:text-[#667085]";

const labelClass =
    "mb-1.5 block text-[13px] font-medium text-[#475467]";

const cardClass =
    "rounded-2xl border border-[#EEF0F3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

const ROLE_LABELS: Record<string, string> = {
    INTERN: "Intern",
    GPM: "Group Manager",
    HR: "HR",
    ADMIN: "Admin",
};

const VERIFICATION_LABELS: Record<string, string> = {
    NOT_SUBMITTED: "Not submitted",
    PENDING: "Pending review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
};

interface FieldState {
    phone: string;
    dob: string;
    universityName: string;
}

export default function ProfilePage() {
    useDocumentTitle("Your Profile");

    const { data: profile, isLoading, isError, error, refetch } = useProfileQuery();
    const updateMutation = useUpdateProfileMutation();
    const passwordMutation = useChangePasswordMutation();
    const linkMutation = useLinkGoogleMutation();
    const syncAuthUser = useSyncAuthUser();

    // Link-flow result returned by the OAuth callback (?link=success or
    // ?link_error=<safe code>). Consumed once, then scrubbed from the URL.
    const [searchParams, setSearchParams] = useSearchParams();
    const linkStatus = searchParams.get("link");
    const linkErrorCode = searchParams.get("link_error");

    const dismissLinkStatus = () => {
        const next = new URLSearchParams(searchParams);
        next.delete("link");
        next.delete("link_error");
        setSearchParams(next, { replace: true });
    };

    // Local edits only; `null` means "show the server values". Deriving from
    // this instead of syncing via an effect avoids a render cascade.
    const [fields, setFields] = useState<FieldState | null>(null);
    const [saveMessage, setSaveMessage] = useState("");
    const [saveError, setSaveError] = useState("");

    // Username editor: an explicit read → edit → save flow. The draft lives in
    // local state only — no request (and no availability check) while typing.
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameDraft, setUsernameDraft] = useState("");
    const [usernameError, setUsernameError] = useState("");
    // Inline confirmation shown under the field after a successful save.
    const [usernameNotice, setUsernameNotice] = useState("");
    const usernameInputRef = useRef<HTMLInputElement>(null);
    // Synchronous double-submit guard for the username Save action.
    const usernameSaveRef = useRef(false);

    // Moving focus into the field when edit mode opens is a genuine DOM sync,
    // so it belongs in an effect (autoFocus only applies on first mount).
    useEffect(() => {
        if (isEditingUsername) {
            usernameInputRef.current?.focus();
        }
    }, [isEditingUsername]);

    // A second instance of the shared update mutation, so the username Save
    // button reports its own pending state instead of toggling the details
    // form's button. Same mutationFn, same cache write — no duplicated logic.
    const usernameMutation = useUpdateProfileMutation();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwMessage, setPwMessage] = useState("");
    const [pwError, setPwError] = useState("");

    // Effective form values: local edits win, otherwise the server profile.
    const effectiveFields: FieldState = fields ?? {
        phone: profile?.phone ?? "",
        dob: profile?.dob ?? "",
        universityName: profile?.universityName ?? "",
    };

    const patchFields = (patch: Partial<FieldState>) =>
        setFields((f) => ({ ...effectiveFields, ...f, ...patch }));

    const handleSaveDetails = async (e: FormEvent) => {
        e.preventDefault();
        setSaveMessage("");
        setSaveError("");

        try {
            const updated = await updateMutation.mutateAsync({
                phone: effectiveFields.phone.trim(),
                dob: effectiveFields.dob.trim(),
                universityName: effectiveFields.universityName.trim(),
            });
            syncAuthUser(updated);
            // Reset local edits so the fresh server values become visible.
            setFields(null);
            setSaveMessage("Profile updated successfully.");
        } catch (err) {
            setSaveError(
                (err as { message?: string })?.message ||
                    "Could not save your changes. Please try again.",
            );
        }
    };

    const handleChangePassword = async (e: FormEvent) => {
        e.preventDefault();
        setPwMessage("");
        setPwError("");

        try {
            await passwordMutation.mutateAsync({
                currentPassword,
                newPassword,
                confirmPassword,
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPwMessage("Password changed successfully.");
        } catch (err) {
            setPwError(
                (err as { message?: string })?.message ||
                    "Could not change your password. Please try again.",
            );
        }
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
                <span
                    aria-hidden="true"
                    className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2862F4] border-r-transparent"
                />
                <span role="status" className="sr-only">
                    Loading your profile
                </span>
            </main>
        );
    }

    if (isError || !profile) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F8FA] px-5 text-center">
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#141B2A]">
                    We couldn&apos;t load your profile
                </h1>
                <p role="alert" className="mt-2 text-sm text-[#647087]">
                    {(error as { message?: string })?.message ||
                        "Something went wrong. Please try again."}
                </p>
                <div className="mt-6 flex gap-3">
                    <Button onClick={() => refetch()}>Try again</Button>
                    <Link
                        to="/dashboard"
                        className="rounded-lg border border-[#DCE1E8] bg-white px-4 py-2.5 text-sm font-medium text-[#141B2A] transition-colors hover:bg-[#F8F9FB]"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </main>
        );
    }

    const initials = (profile.username || profile.email)
        .slice(0, 2)
        .toUpperCase();

    /* ------------------------------ Username ------------------------------ */

    // Format feedback is computed locally and never hits the network. It is
    // only surfaced while editing, so the saved value never looks invalid.
    const usernameValidation = isEditingUsername
        ? validateUsername(usernameDraft)
        : null;
    const usernameFieldError = usernameError || usernameValidation;

    const startUsernameEdit = () => {
        setUsernameDraft(profile.username);
        setUsernameError("");
        setUsernameNotice("");
        setIsEditingUsername(true);
    };

    const cancelUsernameEdit = () => {
        // Discard the draft and fall back to the last server-confirmed value.
        setUsernameDraft(profile.username);
        setUsernameError("");
        setUsernameNotice("");
        setIsEditingUsername(false);
    };

    const handleUsernameChange = (value: string) => {
        setUsernameDraft(value);
        // A stale conflict no longer applies once the user types a new value.
        setUsernameError("");
        setUsernameNotice("");
    };

    const saveUsername = async () => {
        // Synchronous in-flight guard: `usernameMutation.isPending` only flips
        // after a re-render, so a fast double-click in the same tick could pass
        // an `isPending` check. This ref does not, so exactly one PATCH can
        // ever be issued per save.
        if (usernameSaveRef.current) return;

        // Malformed values are already rendered under the field — stop here so
        // an invalid draft can never reach the API.
        if (validateUsername(usernameDraft)) return;

        const normalized = normalizeUsername(usernameDraft);

        // Unchanged: close the editor without a pointless write or feedback
        // that would imply something was saved.
        if (normalized === profile.username) {
            setUsernameDraft(normalized);
            setUsernameError("");
            setUsernameNotice("");
            setIsEditingUsername(false);
            return;
        }

        usernameSaveRef.current = true;
        setUsernameNotice("");
        try {
            // The response is the updated profile — cache it and mirror it into
            // the auth store, so nothing needs a follow-up GET or a refresh.
            const updated = await usernameMutation.mutateAsync({
                username: normalized,
            });
            syncAuthUser(updated);
            setUsernameDraft(updated.username);
            setUsernameError("");
            setIsEditingUsername(false);
            setUsernameNotice(USERNAME_UPDATED_MESSAGE);
        } catch (err) {
            const apiError = err as Partial<ApiClientError>;

            if (apiError.status === 409 && apiError.code === "USERNAME_TAKEN") {
                // Stay in edit mode with the typed value intact so the user can
                // pick another name — the cache and auth store are untouched.
                setUsernameError(USERNAME_TAKEN_MESSAGE);
                return;
            }

            const message = apiError.message || USERNAME_FALLBACK_ERROR;
            setUsernameError(message);
        } finally {
            usernameSaveRef.current = false;
        }
    };

    const handleUsernameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            // The field sits inside the details <form>; never let Enter fall
            // through to its submit handler.
            event.preventDefault();
            void saveUsername();
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            cancelUsernameEdit();
        }
    };

    return (
        <main className="min-h-screen bg-[#F7F8FA] px-5 py-8 font-inter sm:px-8">
            <div className="mx-auto w-full max-w-4xl">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[28px] font-semibold leading-9 text-[#101828]">
                            Your Profile
                        </h1>
                        <p className="mt-1 text-base font-semibold leading-6 text-[#475467]">
                            Manage your personal details and sign-in options.
                        </p>
                    </div>
                    <Link
                        to="/dashboard"
                        className="rounded-lg border border-[#DCE1E8] bg-white px-4 py-2.5 text-sm font-medium text-[#141B2A] transition-colors hover:bg-[#F8F9FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2862F4]/35"
                    >
                        Back to Dashboard
                    </Link>
                </header>

                {/* Link-flow result (from the OAuth callback redirect) */}
                {linkStatus === "success" ? (
                    <div
                        role="status"
                        className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3"
                    >
                        <p className="text-sm font-medium text-[#027A48]">
                            Google account linked successfully. You can now
                            sign in with Google.
                        </p>
                        <button
                            type="button"
                            onClick={dismissLinkStatus}
                            aria-label="Dismiss"
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#027A48] hover:bg-[#D1FADF]"
                        >
                            Dismiss
                        </button>
                    </div>
                ) : linkErrorCode ? (
                    <div
                        role="alert"
                        className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#FECDC9] bg-[#FEF3F2] px-4 py-3"
                    >
                        <p className="text-sm font-medium text-[#B42318]">
                            {LINK_ERROR_COPY[linkErrorCode] ??
                                LINK_ERROR_COPY.oauth_failed}
                        </p>
                        <button
                            type="button"
                            onClick={dismissLinkStatus}
                            aria-label="Dismiss"
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#B42318] hover:bg-[#FEE4E2]"
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null}

                {/* Identity summary */}
                <section className={`${cardClass} mt-7`}>
                    <div className="flex flex-wrap items-center gap-4">
                        <span
                            aria-hidden="true"
                            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#B2DDFF_0%,#6B8599_100%)] text-lg font-semibold text-white"
                        >
                            {initials}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-[#101828]">
                                {profile.username}
                            </p>
                            <p className="truncate text-sm text-[#647087]">
                                {profile.email}
                            </p>
                        </div>
                        <div className="ml-auto flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-semibold text-[#1457E8]">
                                {ROLE_LABELS[profile.role] ?? profile.role}
                            </span>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    profile.isEmailVerified
                                        ? "bg-[#ECFDF3] text-[#027A48]"
                                        : "bg-[#FFFAEB] text-[#B54708]"
                                }`}
                            >
                                {profile.isEmailVerified
                                    ? "Email verified"
                                    : "Email unverified"}
                            </span>
                            <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-semibold text-[#475467]">
                                KYC:{" "}
                                {VERIFICATION_LABELS[profile.verificationStatus] ??
                                    profile.verificationStatus}
                            </span>
                        </div>
                    </div>
                </section>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Editable details */}
                    <section className={cardClass}>
                        <h2 className="text-lg font-semibold text-[#101828]">
                            Personal details
                        </h2>
                        <p className="mt-1 text-sm text-[#647087]">
                            Your email address is your sign-in identity and
                            can&apos;t be changed here.
                        </p>

                        <form
                            onSubmit={handleSaveDetails}
                            className="mt-5 space-y-4"
                        >
                            <div>
                                <label htmlFor="profile-email" className={labelClass}>
                                    Email
                                </label>
                                <input
                                    id="profile-email"
                                    type="email"
                                    value={profile.email}
                                    disabled
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="profile-username" className={labelClass}>
                                    Username
                                </label>

                                {/* Same 42px row height in both states, so
                                    switching read → edit never shifts the
                                    surrounding layout. */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        ref={usernameInputRef}
                                        id="profile-username"
                                        type="text"
                                        name="username"
                                        autoComplete="username"
                                        spellCheck={false}
                                        value={
                                            isEditingUsername
                                                ? usernameDraft
                                                : profile.username
                                        }
                                        onChange={(e) =>
                                            handleUsernameChange(e.target.value)
                                        }
                                        onKeyDown={handleUsernameKeyDown}
                                        disabled={!isEditingUsername}
                                        aria-invalid={
                                            usernameFieldError ? true : undefined
                                        }
                                        aria-describedby={
                                            usernameFieldError
                                                ? "profile-username-error"
                                                : undefined
                                        }
                                        className={`${inputClass} min-w-[170px] flex-1`}
                                    />

                                    {isEditingUsername ? (
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-[42px]"
                                                onClick={cancelUsernameEdit}
                                                disabled={
                                                    usernameMutation.isPending
                                                }
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-[42px]"
                                                onClick={() => void saveUsername()}
                                                loading={
                                                    usernameMutation.isPending
                                                }
                                                loadingLabel="Saving…"
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-[42px]"
                                            onClick={startUsernameEdit}
                                            aria-label="Edit username"
                                        >
                                            Edit
                                        </Button>
                                    )}
                                </div>

                                {usernameFieldError ? (
                                    <p
                                        id="profile-username-error"
                                        role="alert"
                                        className="mt-1.5 text-sm text-[#C33F45]"
                                    >
                                        {usernameFieldError}
                                    </p>
                                ) : usernameNotice ? (
                                    <p role="status" className="mt-1.5 text-sm text-[#027A48]">
                                        {usernameNotice}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label htmlFor="profile-phone" className={labelClass}>
                                    Phone
                                </label>
                                <input
                                    id="profile-phone"
                                    type="tel"
                                    value={effectiveFields.phone}
                                    onChange={(e) =>
                                        patchFields({ phone: e.target.value })
                                    }
                                    placeholder="+91 98765 43210"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="profile-dob" className={labelClass}>
                                    Date of birth
                                </label>
                                <input
                                    id="profile-dob"
                                    type="date"
                                    value={effectiveFields.dob}
                                    onChange={(e) =>
                                        patchFields({ dob: e.target.value })
                                    }
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="profile-university"
                                    className={labelClass}
                                >
                                    University
                                </label>
                                <input
                                    id="profile-university"
                                    type="text"
                                    value={effectiveFields.universityName}
                                    onChange={(e) =>
                                        patchFields({
                                            universityName: e.target.value,
                                        })
                                    }
                                    placeholder="Your college or university"
                                    className={inputClass}
                                />
                            </div>

                            {saveError ? (
                                <p role="alert" className="text-sm text-[#C33F45]">
                                    {saveError}
                                </p>
                            ) : null}
                            {saveMessage ? (
                                <p role="status" className="text-sm text-[#027A48]">
                                    {saveMessage}
                                </p>
                            ) : null}

                            <Button
                                type="submit"
                                loading={updateMutation.isPending}
                                loadingLabel="Saving…"
                            >
                                Save changes
                            </Button>
                        </form>
                    </section>

                    <div className="flex flex-col gap-6">
                        {/* Connected sign-in methods */}
                        <section className={cardClass}>
                            <h2 className="text-lg font-semibold text-[#101828]">
                                Sign-in methods
                            </h2>
                            <p className="mt-1 text-sm text-[#647087]">
                                Status is verified by the server based on the
                                credentials stored for your account.
                            </p>

                            <ul className="mt-4 space-y-3">
                                <li className="flex items-center justify-between rounded-lg border border-[#EEF0F3] px-4 py-3">
                                    <span className="text-sm font-medium text-[#101828]">
                                        Email &amp; password
                                    </span>
                                    <span
                                        className={`text-xs font-semibold ${
                                            profile.providers.password
                                                ? "text-[#027A48]"
                                                : "text-[#667085]"
                                        }`}
                                    >
                                        {profile.providers.password
                                            ? "Enabled"
                                            : "Not set"}
                                    </span>
                                </li>
                                <li className="rounded-lg border border-[#EEF0F3] px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-[#101828]">
                                            Google
                                        </span>
                                        <span
                                            className={`text-xs font-semibold ${
                                                profile.providers.google
                                                    ? "text-[#027A48]"
                                                    : "text-[#667085]"
                                            }`}
                                        >
                                            {profile.providers.google
                                                ? "Connected"
                                                : "Not connected"}
                                        </span>
                                    </div>

                                    {!profile.providers.google ? (
                                        <div className="mt-3">
                                            <p className="mb-2.5 text-xs leading-5 text-[#667085]">
                                                Link the Google account that
                                                uses{" "}
                                                <span className="font-medium text-[#475467]">
                                                    {profile.email}
                                                </span>{" "}
                                                — the emails must match.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                loading={
                                                    linkMutation.isPending
                                                }
                                                loadingLabel="Redirecting…"
                                                onClick={() =>
                                                    linkMutation.mutate()
                                                }
                                                endIcon={
                                                    <img
                                                        src={GoogleIcon}
                                                        alt=""
                                                        className="h-4 w-4 object-contain"
                                                    />
                                                }
                                            >
                                                Link Google account
                                            </Button>
                                            {linkMutation.isError ? (
                                                <p
                                                    role="alert"
                                                    className="mt-2 text-xs text-[#C33F45]"
                                                >
                                                    {(linkMutation.error as {
                                                        message?: string;
                                                    })?.message ||
                                                        "Could not start linking. Please try again."}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </li>
                            </ul>
                        </section>

                        {/* Change password */}
                        {profile.providers.password ? (
                            <section className={cardClass}>
                                <h2 className="text-lg font-semibold text-[#101828]">
                                    Change password
                                </h2>
                                <p className="mt-1 text-sm text-[#647087]">
                                    Enter your current password to confirm it&apos;s
                                    you.
                                </p>

                                <form
                                    onSubmit={handleChangePassword}
                                    className="mt-5 space-y-4"
                                >
                                    <div>
                                        <label
                                            htmlFor="pw-current"
                                            className={labelClass}
                                        >
                                            Current password
                                        </label>
                                        <input
                                            id="pw-current"
                                            type="password"
                                            autoComplete="current-password"
                                            value={currentPassword}
                                            onChange={(e) =>
                                                setCurrentPassword(e.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="pw-new" className={labelClass}>
                                            New password
                                        </label>
                                        <input
                                            id="pw-new"
                                            type="password"
                                            autoComplete="new-password"
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                            placeholder="At least 8 characters, upper, lower, number"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="pw-confirm"
                                            className={labelClass}
                                        >
                                            Confirm new password
                                        </label>
                                        <input
                                            id="pw-confirm"
                                            type="password"
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={(e) =>
                                                setConfirmPassword(e.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    {pwError ? (
                                        <p role="alert" className="text-sm text-[#C33F45]">
                                            {pwError}
                                        </p>
                                    ) : null}
                                    {pwMessage ? (
                                        <p
                                            role="status"
                                            className="text-sm text-[#027A48]"
                                        >
                                            {pwMessage}
                                        </p>
                                    ) : null}

                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        loading={passwordMutation.isPending}
                                        loadingLabel="Updating…"
                                    >
                                        Change password
                                    </Button>
                                </form>
                            </section>
                        ) : (
                            <section className={cardClass}>
                                <h2 className="text-lg font-semibold text-[#101828]">
                                    Change password
                                </h2>
                                <p className="mt-2 text-sm text-[#647087]">
                                    This account signs in with Google, so there
                                    is no local password to change.
                                </p>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
