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
    useSetupPasswordMutation,
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
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-grey-50 disabled:text-ink-500";

const labelClass =
    "mb-1.5 block text-[13px] font-medium text-ink-700";

const cardClass =
    "rounded-2xl border border-line-soft bg-surface p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

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
    const setupMutation = useSetupPasswordMutation();
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

    // Set email & password modal (Google-linked accounts without a local
    // password). Fields are local-only; nothing leaves the browser until submit.
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [setupEmail, setSetupEmail] = useState("");
    const [setupPassword, setSetupPassword] = useState("");
    const [setupConfirm, setSetupConfirm] = useState("");
    const [setupError, setSetupError] = useState("");
    // Confirmation shown in the card after the modal closes successfully.
    const [setupNotice, setSetupNotice] = useState("");
    const setupEmailRef = useRef<HTMLInputElement>(null);

    // Move focus into the first field when the modal opens — the same DOM sync
    // rule (and effect) as the OTP dialog's first-digit focus.
    useEffect(() => {
        if (isSetupOpen) {
            setupEmailRef.current?.focus();
        }
    }, [isSetupOpen]);

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

    /* --------------------- Set email & password (Google) --------------------- */

    const openSetup = () => {
        // Prefill the confirmation field with the account email; the server
        // still compares it case-insensitively before writing anything.
        setSetupEmail(profile?.email ?? "");
        setSetupPassword("");
        setSetupConfirm("");
        setSetupError("");
        setSetupNotice("");
        setIsSetupOpen(true);
    };

    const closeSetup = () => {
        setIsSetupOpen(false);
        setSetupError("");
    };

    const handleSetupPassword = async (e: FormEvent) => {
        e.preventDefault();
        setSetupError("");

        // Mirrors the server-side refine so the user sees it instantly, without
        // spending a request on a mismatch the client already knows about.
        if (setupPassword !== setupConfirm) {
            setSetupError("Passwords do not match.");
            return;
        }

        try {
            await setupMutation.mutateAsync({
                email: setupEmail.trim(),
                password: setupPassword,
                confirmPassword: setupConfirm,
            });

            // The mutation already wrote the fresh profile into the cache, so
            // `providers.password` is now true and the card re-renders itself.
            setIsSetupOpen(false);
            setSetupPassword("");
            setSetupConfirm("");
            setSetupNotice(
                "Password set. You can now sign in with email & password or Google.",
            );
        } catch (err) {
            setSetupError(
                (err as { message?: string })?.message ||
                    "Could not set your password. Please try again.",
            );
        }
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-canvas">
                <span
                    aria-hidden="true"
                    className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-r-transparent"
                />
                <span role="status" className="sr-only">
                    Loading your profile
                </span>
            </main>
        );
    }

    if (isError || !profile) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 text-center">
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">
                    We couldn&apos;t load your profile
                </h1>
                <p role="alert" className="mt-2 text-sm text-ink-500">
                    {(error as { message?: string })?.message ||
                        "Something went wrong. Please try again."}
                </p>
                <div className="mt-6 flex gap-3">
                    <Button onClick={() => refetch()}>Try again</Button>
                    <Link
                        to="/dashboard"
                        className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-grey-25"
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
        <main className="min-h-screen bg-canvas px-5 py-8 font-inter sm:px-8">
            <div className="mx-auto w-full max-w-4xl">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[28px] font-semibold leading-9 text-ink">
                            Your Profile
                        </h1>
                        <p className="mt-1 text-base font-semibold leading-6 text-ink-700">
                            Manage your personal details and sign-in options.
                        </p>
                    </div>
                    <Link
                        to="/dashboard"
                        className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-grey-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                    >
                        Back to Dashboard
                    </Link>
                </header>

                {/* Link-flow result (from the OAuth callback redirect) */}
                {linkStatus === "success" ? (
                    <div
                        role="status"
                        className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-ok-line bg-ok-soft px-4 py-3"
                    >
                        <p className="text-sm font-medium text-ok">
                            Google account linked successfully. You can now
                            sign in with Google.
                        </p>
                        <button
                            type="button"
                            onClick={dismissLinkStatus}
                            aria-label="Dismiss"
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-ok hover:bg-ok-soft-2"
                        >
                            Dismiss
                        </button>
                    </div>
                ) : linkErrorCode ? (
                    <div
                        role="alert"
                        className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-bad-line-2 bg-bad-soft px-4 py-3"
                    >
                        <p className="text-sm font-medium text-bad-strong">
                            {LINK_ERROR_COPY[linkErrorCode] ??
                                LINK_ERROR_COPY.oauth_failed}
                        </p>
                        <button
                            type="button"
                            onClick={dismissLinkStatus}
                            aria-label="Dismiss"
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-bad-strong hover:bg-bad-soft-2"
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
                            <p className="truncate text-lg font-semibold text-ink">
                                {profile.username}
                            </p>
                            <p className="truncate text-sm text-ink-500">
                                {profile.email}
                            </p>
                        </div>
                        <div className="ml-auto flex flex-wrap gap-2">
                            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
                                {ROLE_LABELS[profile.role] ?? profile.role}
                            </span>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    profile.isEmailVerified
                                        ? "bg-ok-soft text-ok"
                                        : "bg-warn-soft text-warn-strong"
                                }`}
                            >
                                {profile.isEmailVerified
                                    ? "Email verified"
                                    : "Email unverified"}
                            </span>
                            <span className="rounded-full bg-grey-50 px-3 py-1 text-xs font-semibold text-ink-700">
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
                        <h2 className="text-lg font-semibold text-ink">
                            Personal details
                        </h2>
                        <p className="mt-1 text-sm text-ink-500">
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
                                        className="mt-1.5 text-sm text-bad"
                                    >
                                        {usernameFieldError}
                                    </p>
                                ) : usernameNotice ? (
                                    <p role="status" className="mt-1.5 text-sm text-ok">
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
                                <p role="alert" className="text-sm text-bad">
                                    {saveError}
                                </p>
                            ) : null}
                            {saveMessage ? (
                                <p role="status" className="text-sm text-ok">
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
                            <h2 className="text-lg font-semibold text-ink">
                                Sign-in methods
                            </h2>
                            <p className="mt-1 text-sm text-ink-500">
                                Status is verified by the server based on the
                                credentials stored for your account.
                            </p>

                            <ul className="mt-4 space-y-3">
                                <li className="rounded-lg border border-line-soft px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-ink">
                                            Email &amp; password
                                        </span>
                                        <span
                                            className={`text-xs font-semibold ${
                                                profile.providers.password
                                                    ? "text-ok"
                                                    : "text-ink-500"
                                            }`}
                                        >
                                            {profile.providers.password
                                                ? "Enabled"
                                                : "Not set"}
                                        </span>
                                    </div>

                                    {setupNotice ? (
                                        <p
                                            role="status"
                                            className="mt-2 text-xs text-ok"
                                        >
                                            {setupNotice}
                                        </p>
                                    ) : null}

                                    {/* Google-linked accounts have no local
                                        password yet — offer the setup flow
                                        right where the status reads "Not set". */}
                                    {!profile.providers.password &&
                                    profile.providers.google ? (
                                        <div className="mt-3">
                                            <p className="mb-2.5 text-xs leading-5 text-ink-500">
                                                Add a password so you can also
                                                sign in with{" "}
                                                <span className="font-medium text-ink-700">
                                                    {profile.email}
                                                </span>{" "}
                                                — Google keeps working too.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={openSetup}
                                            >
                                                Set email &amp; password
                                            </Button>
                                        </div>
                                    ) : null}
                                </li>
                                <li className="rounded-lg border border-line-soft px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-ink">
                                            Google
                                        </span>
                                        <span
                                            className={`text-xs font-semibold ${
                                                profile.providers.google
                                                    ? "text-ok"
                                                    : "text-ink-500"
                                            }`}
                                        >
                                            {profile.providers.google
                                                ? "Connected"
                                                : "Not connected"}
                                        </span>
                                    </div>

                                    {!profile.providers.google ? (
                                        <div className="mt-3">
                                            <p className="mb-2.5 text-xs leading-5 text-ink-500">
                                                Link the Google account that
                                                uses{" "}
                                                <span className="font-medium text-ink-700">
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
                                                    className="mt-2 text-xs text-bad"
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
                                <h2 className="text-lg font-semibold text-ink">
                                    Change password
                                </h2>
                                <p className="mt-1 text-sm text-ink-500">
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
                                        <p role="alert" className="text-sm text-bad">
                                            {pwError}
                                        </p>
                                    ) : null}
                                    {pwMessage ? (
                                        <p
                                            role="status"
                                            className="text-sm text-ok"
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
                                <h2 className="text-lg font-semibold text-ink">
                                    Change password
                                </h2>
                                <p className="mt-2 text-sm text-ink-500">
                                    This account signs in with Google, so there
                                    is no local password to change.
                                </p>
                            </section>
                        )}
                    </div>
                </div>
            </div>

            {/* ==============================================================
                SET EMAIL & PASSWORD MODAL (Google-linked accounts)

                The shell intentionally mirrors the OTP dialogs in Signup and
                Login: same overlay, same 414px card, same typography and
                input styles. Every color class reads a theme token, so the
                modal follows light/dark with no extra rules.
               ============================================================== */}
            {isSetupOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6"
                    role="presentation"
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="setup-password-title"
                        aria-describedby="setup-password-description"
                        className="relative w-full max-w-[414px] rounded-[20px] border border-line-soft bg-surface px-7 py-8 shadow-[0_14px_44px_rgba(20,27,42,0.12)] sm:px-9"
                    >
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={closeSetup}
                            className="absolute right-4 top-4 rounded-lg p-1 text-ink-500 hover:bg-grey-50 hover:text-ink"
                        >
                            ✕
                        </button>

                        <h2
                            id="setup-password-title"
                            className="text-center font-sans text-[20px] font-semibold leading-6 tracking-[-0.02em] text-ink"
                        >
                            Set email &amp; password
                        </h2>
                        <p
                            id="setup-password-description"
                            className="mt-1 text-center text-[13px] leading-5 text-ink-600"
                        >
                            Confirm your email and choose a password for{" "}
                            <span className="font-mono text-ink-800">
                                {profile.email}
                            </span>
                        </p>

                        <form
                            onSubmit={handleSetupPassword}
                            className="mt-6 space-y-3"
                        >
                            <input
                                ref={setupEmailRef}
                                type="email"
                                aria-label="Confirm your email"
                                autoComplete="email"
                                placeholder="Confirm email address"
                                value={setupEmail}
                                onChange={(event) => {
                                    setSetupEmail(event.target.value);
                                    setSetupError("");
                                }}
                                className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                            />
                            <input
                                type="password"
                                aria-label="New password"
                                autoComplete="new-password"
                                placeholder="New password (min. 8 characters)"
                                value={setupPassword}
                                onChange={(event) => {
                                    setSetupPassword(event.target.value);
                                    setSetupError("");
                                }}
                                className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                            />
                            <input
                                type="password"
                                aria-label="Confirm new password"
                                autoComplete="new-password"
                                placeholder="Confirm new password"
                                value={setupConfirm}
                                onChange={(event) => {
                                    setSetupConfirm(event.target.value);
                                    setSetupError("");
                                }}
                                className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                            />

                            {setupError ? (
                                <p
                                    role="alert"
                                    className="text-left text-xs text-bad"
                                >
                                    {setupError}
                                </p>
                            ) : null}

                            <Button
                                type="submit"
                                fullWidth
                                loading={setupMutation.isPending}
                                loadingLabel="Setting password…"
                            >
                                Set password
                            </Button>
                        </form>

                        <p className="mt-4 text-center text-[12px] leading-4 text-ink-500">
                            You&apos;ll be able to sign in with either method
                            afterwards.
                        </p>
                    </section>
                </div>
            ) : null}
        </main>
    );
}
