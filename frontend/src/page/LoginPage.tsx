import {
    useEffect,
    useRef,
    useState,
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import Button from "../component/Button";
import LeftGradient from "../assets/left-gradient.png";
import GoogleIcon from "../assets/GoogleIcon.svg";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { dashboardPathForRole } from "../lib/routes";
import { AuthPageBackdrop, AuthVisualPanel } from "./SignupPage";
import type { ApiClientError } from "../api/apiClient";
import {
    useForgotPasswordMutation,
    useLoginMutation,
    useResendOtpMutation,
    useResetPasswordMutation,
    useVerifyOtpMutation,
    useVerifyResetOtpMutation,
} from "../hooks/useAuthMutations";

type ResetStep = "email" | "otp" | "new-password" | null;

export default function Login() {
    useDocumentTitle("Log In");
    const navigate = useNavigate();

    // Login Form State
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [formError, setFormError] = useState("");

    // Reset Password Flow State
    const [resetStep, setResetStep] = useState<ResetStep>(null);
    const [resetEmail, setResetEmail] = useState("");
    const [resetDigits, setResetDigits] = useState(["", "", "", ""]);
    const [verifiedOtp, setVerifiedOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [modalError, setModalError] = useState("");
    const [modalSuccess, setModalSuccess] = useState("");

    // Email-verification flow: login answered 403 EMAIL_NOT_VERIFIED after the
    // password was correct. The OTP that was just emailed is entered here, and
    // a successful verify *is* a login (the endpoint returns tokens).
    const [isVerifyOpen, setIsVerifyOpen] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState("");
    const [verifyDigits, setVerifyDigits] = useState(["", "", "", ""]);
    const [verifyError, setVerifyError] = useState("");
    const [verifySuccess, setVerifySuccess] = useState("");

    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
    const verifyRefs = useRef<Array<HTMLInputElement | null>>([]);

    const loginMutation = useLoginMutation();
    const forgotMutation = useForgotPasswordMutation();
    const verifyResetOtpMutation = useVerifyResetOtpMutation();
    const resetPasswordMutation = useResetPasswordMutation();
    const verifyOtpMutation = useVerifyOtpMutation();
    const resendVerifyMutation = useResendOtpMutation();

    useEffect(() => {
        if (resetStep === "otp") {
            otpRefs.current[0]?.focus();
        }
    }, [resetStep]);

    // Same DOM sync as the reset OTP step: focus the first box when the
    // verification modal opens (autoFocus only applies on first mount).
    useEffect(() => {
        if (isVerifyOpen) {
            verifyRefs.current[0]?.focus();
        }
    }, [isVerifyOpen]);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!identifier.trim() || !password) {
            setFormError("Please enter your username/email and password.");
            return;
        }

        try {
            const { user } = await loginMutation.mutateAsync({
                identifier: identifier.trim(),
                password,
            });
            // Role-based landing: each role goes to its own dashboard.
            navigate(dashboardPathForRole(user.role), { replace: true });
        } catch (err: unknown) {
            const apiError = err as Partial<ApiClientError>;

            // Password was correct but the account is unverified: the backend
            // already emailed a fresh OTP — open the modal so the user can act
            // on it immediately instead of just reading the message.
            if (apiError.status === 403 && apiError.code === "EMAIL_NOT_VERIFIED") {
                const emailForVerification = identifier.includes("@")
                    ? identifier.trim().toLowerCase()
                    : (apiError.email ?? "");

                setFormError(apiError.message || "Email not verified.");

                if (emailForVerification) {
                    setVerifyEmail(emailForVerification);
                    setVerifyDigits(["", "", "", ""]);
                    setVerifyError("");
                    setVerifySuccess("");
                    setIsVerifyOpen(true);
                }
                return;
            }

            setFormError(
                apiError.message || "Invalid credentials.",
            );
        }
    };

    const handleGoogleLogin = () => {
        const baseUri = import.meta.env.VITE_GOOGLE_CALLBACK_URI?.replace(
            /\/+$/,
            "",
        );

        if (!baseUri) {
            setFormError("Google sign-in is not configured.");
            return;
        }

        // No role travels with the request: a brand-new Google account is
        // paused after authentication and picks its role on the next screen.
        // Existing accounts resolve by googleId regardless of any role.
        window.location.href = baseUri;
    };

    // Step 1: Send Reset OTP
    const handleSendResetOtp = async (e: FormEvent) => {
        e.preventDefault();
        setModalError("");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
            setModalError("Enter a valid email address.");
            return;
        }

        try {
            await forgotMutation.mutateAsync(resetEmail.trim());
            setResetDigits(["", "", "", ""]);
            setResetStep("otp");
        } catch (err: unknown) {
            setModalError((err as { message?: string })?.message || "Failed to send OTP.");
        }
    };

    // Step 2: Verify Reset OTP
    const submitResetOtp = async (code: string) => {
        setModalError("");
        try {
            await verifyResetOtpMutation.mutateAsync({
                email: resetEmail.trim(),
                otp: code,
            });
            setVerifiedOtp(code);
            setResetStep("new-password");
        } catch (err: unknown) {
            setModalError((err as { message?: string })?.message || "Invalid OTP code.");
        }
    };

    const handleDigitChange = (index: number, raw: string) => {
        const digit = raw.replace(/\D/g, "").slice(-1);
        const next = [...resetDigits];
        next[index] = digit;
        setResetDigits(next);
        setModalError("");

        if (digit && index < 3) {
            otpRefs.current[index + 1]?.focus();
        }
        if (next.every(Boolean)) {
            void submitResetOtp(next.join(""));
        }
    };

    const handleDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !resetDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleDigitPaste = (e: ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (!pasted) return;
        e.preventDefault();
        const next = ["", "", "", ""];
        pasted.split("").forEach((d, i) => {
            next[i] = d;
        });
        setResetDigits(next);
        if (pasted.length === 4) void submitResetOtp(pasted);
    };

    // Step 3: Submit New Password
    const handleCompleteReset = async (e: FormEvent) => {
        e.preventDefault();
        setModalError("");

        if (newPassword.length < 8) {
            setModalError("Use at least 8 characters for your password.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setModalError("Passwords do not match.");
            return;
        }

        try {
            await resetPasswordMutation.mutateAsync({
                email: resetEmail.trim(),
                otp: verifiedOtp,
                newPassword,
                confirmPassword: confirmNewPassword,
            });
            setModalSuccess("Password updated! You can now log in.");
            setTimeout(() => {
                setResetStep(null);
                setModalSuccess("");
                setNewPassword("");
                setConfirmNewPassword("");
                setIdentifier(resetEmail.trim());
            }, 1200);
        } catch (err: unknown) {
            setModalError((err as { message?: string })?.message || "Failed to reset password.");
        }
    };

    /* ------------------ Verify email (login was blocked) ------------------ */

    // A successful verify-otp *is* a login: the endpoint marks the account
    // verified, issues tokens and the mutation stores the session.
    const submitVerifyOtp = async (code: string) => {
        setVerifyError("");
        setVerifySuccess("");

        try {
            const { user } = await verifyOtpMutation.mutateAsync({
                email: verifyEmail,
                otp: code,
            });
            setIsVerifyOpen(false);
            navigate(dashboardPathForRole(user.role), { replace: true });
        } catch (err: unknown) {
            setVerifyError(
                (err as { message?: string })?.message || "Invalid OTP code.",
            );
        }
    };

    const handleVerifyDigitChange = (index: number, raw: string) => {
        const digit = raw.replace(/\D/g, "").slice(-1);
        const next = [...verifyDigits];
        next[index] = digit;
        setVerifyDigits(next);
        setVerifyError("");
        setVerifySuccess("");

        if (digit && index < 3) {
            verifyRefs.current[index + 1]?.focus();
        }
        if (next.every(Boolean)) {
            void submitVerifyOtp(next.join(""));
        }
    };

    const handleVerifyDigitKeyDown = (
        index: number,
        e: KeyboardEvent<HTMLInputElement>,
    ) => {
        if (e.key === "Backspace" && !verifyDigits[index] && index > 0) {
            verifyRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyDigitPaste = (e: ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 4);
        if (!pasted) return;
        e.preventDefault();
        const next = ["", "", "", ""];
        pasted.split("").forEach((d, i) => {
            next[i] = d;
        });
        setVerifyDigits(next);
        setVerifyError("");
        setVerifySuccess("");
        if (pasted.length === 4) void submitVerifyOtp(pasted);
    };

    const handleResendVerify = async () => {
        setVerifyError("");
        setVerifySuccess("");

        try {
            await resendVerifyMutation.mutateAsync(verifyEmail);
            setVerifySuccess("A new code has been sent to your email.");
        } catch (err: unknown) {
            setVerifyError(
                (err as { message?: string })?.message ||
                    "Could not send a new code.",
            );
        }
    };

    return (
        <div className="relative isolate min-h-[100svh] w-full overflow-x-hidden bg-panel font-sans text-ink lg:bg-canvas">
            <AuthPageBackdrop mode="login" />

            <div className="relative z-10 mx-auto flex min-h-[100svh] flex-col p-0 lg:grid lg:grid-cols-[60%_40%] lg:gap-0 lg:p-2">
                {/* Right Visual Panel on Desktop (handled by AuthVisualPanel mode="login") */}
                <AuthVisualPanel
                    mode="login"
                    noiseImageSrc="/Noise.png"
                    glowImageSrc={LeftGradient}
                />

                {/* Left Form Panel on Desktop */}
                <main className="relative z-10 -mt-2 mx-2 mb-2 flex min-h-[calc(100svh-288px)] flex-1 flex-col items-center justify-start rounded-2xl bg-canvas px-6 pb-10 pt-7 sm:min-h-[calc(100svh-256px)] sm:px-10 sm:pt-12 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:my-0 lg:mt-0 lg:min-h-0 lg:justify-center lg:rounded-none lg:px-8 lg:py-10">
                    <div className="w-full max-w-[540px]">
                        <header className="text-center">
                            <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.035em] text-ink sm:text-[36px] lg:text-[40px]">
                                Login to your account
                            </h1>
                            <p className="mt-2 text-[14px] font-semibold leading-5 text-ink-600 sm:text-[15px]">
                                Pick up where you left off.
                            </p>
                        </header>

                        <form onSubmit={handleLogin} noValidate className="mt-8 sm:mt-10 lg:mt-12">
                            <div className="mx-auto w-full max-w-[440px] space-y-4">
                                <input
                                    type="text"
                                    placeholder="Enter email or username"
                                    autoComplete="username"
                                    value={identifier}
                                    onChange={(e) => {
                                        setIdentifier(e.target.value);
                                        setFormError("");
                                    }}
                                    className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                                />

                                <input
                                    type="password"
                                    placeholder="Enter password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setFormError("");
                                    }}
                                    className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                                />
                            </div>

                            {formError ? (
                                <p role="alert" className="mx-auto mt-3 max-w-[440px] text-left text-[13px] text-bad">
                                    {formError}
                                </p>
                            ) : null}

                            <div className="mx-auto mt-8 flex w-full max-w-[538px] flex-col items-stretch gap-2.5 sm:mt-10 sm:flex-row sm:items-center sm:gap-4 lg:mt-12">
                                <Button
                                    type="submit"
                                    fullWidth
                                    loading={loginMutation.isPending}
                                    loadingLabel="Signing in"
                                    className="sm:flex-1 hover:cursor-pointer"
                                    endIcon={
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M17 17V7H7M17 7L7 17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="white" />
                                        </svg>
                                    }
                                >
                                    Continue with Email
                                </Button>

                                <span className="my-0.5 text-center text-[12px] text-ink-400 sm:my-0">
                                    or
                                </span>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    fullWidth
                                    disabled={loginMutation.isPending}
                                    onClick={handleGoogleLogin}
                                    className="sm:flex-1 hover:cursor-pointer"
                                    endIcon={<img src={GoogleIcon} alt="" className="h-6 w-6 object-contain" />}
                                >
                                    Continue with Google
                                </Button>
                            </div>

                            <div className="mt-6 pt-1 text-center text-[13px] leading-5 text-ink-500">
                                <p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalError("");
                                            setModalSuccess("");
                                            setResetEmail(identifier.includes("@") ? identifier : "");
                                            setResetStep("email");
                                        }}
                                        className="font-medium text-brand-strong underline underline-offset-2 hover:cursor-pointer hover:text-brand-link"
                                    >
                                        Forgot password?
                                    </button>
                                </p>
                                <p className="mt-3">
                                    Don&apos;t have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => navigate("/signup")}
                                        className="font-medium text-brand-strong underline underline-offset-2 hover:cursor-pointer hover:text-brand-link"
                                    >
                                        Sign up
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>
                </main>
            </div>

            {/* ==============================================================
                FORGOT / RESET PASSWORD 3-STEP MODAL
               ============================================================== */}
            {resetStep ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6"
                    role="presentation"
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        className="relative w-full max-w-[414px] rounded-[20px] border border-line-soft bg-surface px-7 py-8 shadow-[0_14px_44px_rgba(20,27,42,0.14)] sm:px-9"
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={() => setResetStep(null)}
                            className="absolute right-4 top-4 rounded-lg p-1 text-ink-500 hover:bg-grey-50 hover:text-ink"
                        >
                            ✕
                        </button>

                        {/* STEP 1: ENTER EMAIL */}
                        {resetStep === "email" && (
                            <form onSubmit={handleSendResetOtp}>
                                <h2 className="text-center text-[20px] font-semibold tracking-[-0.02em] text-ink">
                                    Please enter your email address
                                </h2>
                                <p className="mt-1 text-center text-[13px] text-ink-600">
                                    A code will be sent to your email address
                                </p>

                                <div className="mt-6">
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={resetEmail}
                                        onChange={(e) => {
                                            setResetEmail(e.target.value);
                                            setModalError("");
                                        }}
                                        className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                                    />
                                </div>

                                {modalError ? (
                                    <p className="mt-2 text-left text-xs text-bad">{modalError}</p>
                                ) : null}

                                <div className="mt-5">
                                    <Button
                                        type="submit"
                                        fullWidth
                                        loading={forgotMutation.isPending}
                                        loadingLabel="Sending OTP"
                                    >
                                        Send OTP
                                    </Button>
                                </div>

                                <div className="mt-4 flex items-start gap-2 text-left text-[12px] leading-4 text-brand-text">
                                    <span className="mt-0.5 shrink-0">ⓘ</span>
                                    <span>Once code sent, you must complete the password reset.</span>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: VERIFY 4-DIGIT OTP */}
                        {resetStep === "otp" && (
                            <div>
                                <h2 className="text-center text-[20px] font-semibold tracking-[-0.02em] text-ink">
                                    Please check your email address
                                </h2>
                                <p className="mt-1 text-center text-[13px] text-ink-600">
                                    We&apos;ve sent a code to{" "}
                                    <span className="font-mono text-ink-800">{resetEmail}</span>
                                </p>

                                <div className="mt-6 flex items-center justify-center gap-3">
                                    {resetDigits.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => {
                                                otpRefs.current[i] = el;
                                            }}
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            disabled={verifyResetOtpMutation.isPending}
                                            onChange={(e) => handleDigitChange(i, e.target.value)}
                                            onKeyDown={(e) => handleDigitKeyDown(i, e)}
                                            onPaste={i === 0 ? handleDigitPaste : undefined}
                                            className="h-12 w-11 rounded-xl border border-transparent bg-grey-50 text-center font-mono text-[16px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                                        />
                                    ))}
                                </div>

                                <div className="mt-4 flex min-h-5 items-center justify-center">
                                    {verifyResetOtpMutation.isPending ? (
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
                                    ) : modalError ? (
                                        <p className="text-center text-[13px] font-medium text-bad-bright">
                                            {modalError}
                                        </p>
                                    ) : null}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => forgotMutation.mutate(resetEmail.trim())}
                                    className="mt-2 block w-full text-center text-[13px] font-medium text-brand-text underline underline-offset-2"
                                >
                                    Resend code
                                </button>
                            </div>
                        )}

                        {/* STEP 3: NEW PASSWORD */}
                        {resetStep === "new-password" && (
                            <form onSubmit={handleCompleteReset}>
                                <h2 className="text-center text-[20px] font-semibold tracking-[-0.02em] text-ink">
                                    Set a new password
                                </h2>
                                <p className="mt-1 text-center text-[13px] text-ink-600">
                                    Create a strong password for{" "}
                                    <span className="font-mono text-ink-800">{resetEmail}</span>
                                </p>

                                <div className="mt-6 space-y-3">
                                    <input
                                        type="password"
                                        placeholder="New password (min. 8 characters)"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setModalError("");
                                        }}
                                        className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmNewPassword}
                                        onChange={(e) => {
                                            setConfirmNewPassword(e.target.value);
                                            setModalError("");
                                        }}
                                        className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
                                    />
                                </div>

                                {modalError ? (
                                    <p className="mt-2 text-left text-xs text-bad">{modalError}</p>
                                ) : null}
                                {modalSuccess ? (
                                    <p className="mt-2 text-center text-xs font-medium text-ok-bright">
                                        {modalSuccess}
                                    </p>
                                ) : null}

                                <div className="mt-5">
                                    <Button
                                        type="submit"
                                        fullWidth
                                        loading={resetPasswordMutation.isPending}
                                        loadingLabel="Updating password"
                                    >
                                        Reset Password
                                    </Button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            ) : null}

            {/* ==============================================================
                EMAIL VERIFICATION MODAL (login blocked with EMAIL_NOT_VERIFIED)

                Same shell as the reset-password modal above: same overlay,
                414px card, heading and OTP box styles — every color class
                reads a theme token, so light/dark applies with no extra rules.
               ============================================================== */}
            {isVerifyOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6"
                    role="presentation"
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="verify-email-title"
                        aria-describedby="verify-email-description"
                        className="relative w-full max-w-[414px] rounded-[20px] border border-line-soft bg-surface px-7 py-8 shadow-[0_14px_44px_rgba(20,27,42,0.14)] sm:px-9"
                    >
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={() => setIsVerifyOpen(false)}
                            className="absolute right-4 top-4 rounded-lg p-1 text-ink-500 hover:bg-grey-50 hover:text-ink"
                        >
                            ✕
                        </button>

                        <h2
                            id="verify-email-title"
                            className="text-center text-[20px] font-semibold tracking-[-0.02em] text-ink"
                        >
                            Please check your email address
                        </h2>
                        <p
                            id="verify-email-description"
                            className="mt-1 text-center text-[13px] text-ink-600"
                        >
                            We&apos;ve sent a code to{" "}
                            <span className="font-mono text-ink-800">
                                {verifyEmail}
                            </span>
                        </p>

                        <div className="mt-6 flex items-center justify-center gap-3">
                            {verifyDigits.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => {
                                        verifyRefs.current[i] = el;
                                    }}
                                    inputMode="numeric"
                                    maxLength={1}
                                    aria-label={`Verification code digit ${i + 1}`}
                                    autoComplete={
                                        i === 0 ? "one-time-code" : "off"
                                    }
                                    value={digit}
                                    disabled={verifyOtpMutation.isPending}
                                    onChange={(e) =>
                                        handleVerifyDigitChange(i, e.target.value)
                                    }
                                    onKeyDown={(e) => handleVerifyDigitKeyDown(i, e)}
                                    onPaste={i === 0 ? handleVerifyDigitPaste : undefined}
                                    className="h-12 w-11 rounded-xl border border-transparent bg-grey-50 text-center font-mono text-[16px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:opacity-70"
                                />
                            ))}
                        </div>

                        <div className="mt-4 flex min-h-5 items-center justify-center">
                            {verifyOtpMutation.isPending ? (
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
                            ) : verifyError ? (
                                <p
                                    role="alert"
                                    className="text-center text-[13px] font-medium text-bad-bright"
                                >
                                    {verifyError}
                                </p>
                            ) : verifySuccess ? (
                                <p
                                    role="status"
                                    className="text-center text-[13px] font-medium text-ok-bright"
                                >
                                    {verifySuccess}
                                </p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleResendVerify()}
                            disabled={resendVerifyMutation.isPending}
                            className="mt-2 block w-full text-center text-[13px] font-medium text-brand-text underline underline-offset-2 disabled:opacity-60"
                        >
                            {resendVerifyMutation.isPending
                                ? "Sending…"
                                : "Resend code"}
                        </button>
                    </section>
                </div>
            ) : null}
        </div>
    );
}