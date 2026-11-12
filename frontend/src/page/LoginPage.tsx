import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import Button from "../component/Button";
import LeftGradient from "../assets/left-gradient.png";
import GoogleIcon from "../assets/GoogleIcon.svg";
import { AuthPageBackdrop, AuthVisualPanel } from "../page/SignupPage";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type LoginPayload = {
    fullName: string;
    password: string;
};

export interface LoginPageProps {
    onLogin?: (payload: LoginPayload) => void | Promise<void>;
    onGoogleSignIn?: () => void | Promise<void>;
    onRequestPasswordResetOtp?: (email: string) => void | Promise<void>;
    onNavigateToSignup?: () => void;
    noiseImageSrc?: string;
    glowImageSrc?: string;
    weboriumLogoSrc?: string;
    googleLogoSrc?: string;
    className?: string;
}

function getErrorMessage(error: unknown): string {
    if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) return message;
    }
    return "Something went wrong. Please try again.";
}

function TextField({
    id,
    label,
    value,
    onChange,
    type = "text",
    autoComplete,
    error,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "email" | "password";
    autoComplete?: string;
    error?: string;
}) {
    const errorId = `${id}-error`;
    return (
        <div className="w-full">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <input
                id={id}
                name={id}
                type={type}
                autoComplete={autoComplete}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={label}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className={[
                    "h-[46px] w-full rounded-xl border bg-white px-4",
                    "font-sans text-[14px] font-normal text-[#141B2A] outline-none",
                    "placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10",
                    error ? "border-[#DC5555]" : "border-[#E8EBF0]",
                ].join(" ")}
            />
            {error ? (
                <p id={errorId} className="mt-1.5 text-left text-xs text-[#C33F45]">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function ForgotPasswordDialog({
    onClose,
    onRequestOtp,
}: {
    onClose: () => void;
    onRequestOtp?: (email: string) => void | Promise<void>;
}) {
    const [email, setEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const titleId = useId();
    const emailRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        emailRef.current?.focus();
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setSuccess(false);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Enter a valid email address.");
            return;
        }
        if (!onRequestOtp) {
            setError("Password reset is not connected. Pass an onRequestPasswordResetOtp handler.");
            return;
        }
        setIsSending(true);
        try {
            await onRequestOtp(email.trim());
            setSuccess(true);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setIsSending(false);
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 px-4 py-6">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative w-full max-w-[408px] rounded-[20px] border border-[#EEF0F3] bg-white px-8 pb-8 pt-12 shadow-[0_14px_44px_rgba(20,27,42,0.12)] sm:px-12"
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSending}
                    aria-label="Close password reset dialog"
                    className="absolute right-5 top-4 rounded-md px-1 text-[26px] leading-7 text-[#98A2B3] transition hover:text-[#141B2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2862F4]"
                >
                    ×
                </button>
                <h2
                    id={titleId}
                    className="text-center text-[20px] font-semibold leading-6 tracking-[-0.02em] text-[#141B2A]"
                >
                    Please enter your email address
                </h2>
                <p className="mt-1 text-center text-[13px] leading-5 text-[#536078]">
                    A code will be sent to your email address
                </p>
                <form onSubmit={handleSubmit} className="mt-6">
                    <label htmlFor="reset-email" className="sr-only">
                        Enter email address
                    </label>
                    <input
                        ref={emailRef}
                        id="reset-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter email address"
                        aria-invalid={Boolean(error)}
                        className={[
                            "h-[46px] w-full rounded-xl border bg-white px-4",
                            "text-[14px] text-[#141B2A] outline-none placeholder:text-[#98A2B3]",
                            "focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10",
                            error ? "border-[#DC5555]" : "border-[#E8EBF0]",
                        ].join(" ")}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        loading={isSending}
                        loadingLabel="Sending code"
                        endIcon={<span className="text-[18px] leading-none">➤</span>}
                        className="mt-6"
                    >
                        Send OTP
                    </Button>
                    {error ? (
                        <p role="alert" className="mt-3 text-center text-[12px] leading-4 text-[#C33F45]">
                            {error}
                        </p>
                    ) : success ? (
                        <p role="status" className="mt-3 text-center text-[12px] leading-4 text-[#2EAD79]">
                            If the address is eligible, a verification code has been sent.
                        </p>
                    ) : (
                        <p className="mx-auto mt-3 flex max-w-[310px] items-start justify-center gap-2 text-center text-[13px] leading-[18px] text-[#1680FF]">
                            <span aria-hidden="true" className="mt-px text-[15px] leading-4">
                                ⓘ
                            </span>
                            Once code sent, you must complete the password reset.
                        </p>
                    )}
                </form>
            </section>
        </div>
    );
}

export default function LoginPage({
    onLogin,
    onGoogleSignIn,
    onRequestPasswordResetOtp,
    onNavigateToSignup,
    noiseImageSrc = "/Noise.png",
    glowImageSrc = LeftGradient,
    weboriumLogoSrc,
    googleLogoSrc = GoogleIcon,
    className = "",
}: LoginPageProps) {
    useDocumentTitle('Login')
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; password?: string }>({});
    const [formError, setFormError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
    const closeForgotPassword = useCallback(() => setIsForgotPasswordOpen(false), []);
    const loginRequestInFlight = useRef(false);
    const googleRequestInFlight = useRef(false);
    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");
        const errors: { fullName?: string; password?: string } = {};
        if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
        if (!password) errors.password = "Enter your password.";
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;
        if (loginRequestInFlight.current) return;
        if (!onLogin) {
            setFormError("Login is not connected yet. Pass an onLogin handler from your API layer.");
            return;
        }
        loginRequestInFlight.current = true;
        setIsSubmitting(true);
        try {
            await onLogin({ fullName: fullName.trim(), password });
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            loginRequestInFlight.current = false;
            setIsSubmitting(false);
        }
    };
    const handleGoogleSignIn = async () => {
        setFormError("");
        if (googleRequestInFlight.current) return;
        if (!onGoogleSignIn) {
            setFormError("Google sign-in is not connected yet. Pass an onGoogleSignIn handler.");
            return;
        }
        googleRequestInFlight.current = true;
        setIsGoogleLoading(true);
        try {
            await onGoogleSignIn();
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            googleRequestInFlight.current = false;
            setIsGoogleLoading(false);
        }
    };
    return (
        <div
            className={[
                "relative isolate min-h-[100svh] w-full overflow-x-hidden bg-[#020407] font-sans text-[#141B2A]",
                "lg:bg-[#F7F8FA]",
                className,
            ].join(" ")}
        >
            <AuthPageBackdrop noiseImageSrc={noiseImageSrc} glowImageSrc={glowImageSrc} />
            <div className="relative z-10 mx-auto flex min-h-[100svh] flex-col p-0 lg:grid lg:grid-cols-[60%_40%] lg:gap-0 lg:p-2">
                <AuthVisualPanel
                    mode="login"
                    noiseImageSrc={noiseImageSrc}
                    glowImageSrc={glowImageSrc}
                    weboriumLogoSrc={weboriumLogoSrc}
                />
                <main className="relative z-10 -mt-2 mx-2 mb-2 flex min-h-[calc(100svh-288px)] flex-1 flex-col items-center justify-start rounded-2xl bg-[#F7F8FA] px-6 pb-10 pt-7 sm:min-h-[calc(100svh-256px)] sm:px-10 sm:pt-12 lg:order-1 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:my-0 lg:mt-0 lg:min-h-0 lg:justify-center lg:rounded-none lg:px-8 lg:py-10">
                    <div className="w-full max-w-[540px]">
                        <header className="text-center">
                            <h1
                                data-aos="fade-up"
                                data-aos-delay="150"
                                className="text-[30px] font-bold leading-[1.2] tracking-[-0.035em] text-[#141B2A] sm:text-[36px] lg:text-[40px]">
                                Login to your account
                            </h1>
                            <p
                                data-aos="fade-up"
                                data-aos-delay="250"
                                className="mt-2 text-[14px] font-semibold leading-5 text-[#536078] sm:text-[15px]">
                                Pick up where you left off.
                            </p>
                        </header>
                        <form
                                onSubmit={handleLogin}
                                noValidate
                                data-aos="fade-up"
                                data-aos-delay="300"
                                data-aos-duration="700"
                                className="mt-7 sm:mt-9 lg:mt-12">
                            <div className="mx-auto w-full max-w-[440px] space-y-4">
                                <TextField
                                    id="login-full-name"
                                    label="Enter username"
                                    autoComplete="username"
                                    value={fullName}
                                    onChange={(value) => {
                                        setFullName(value);
                                        setFieldErrors((current) => ({ ...current, fullName: undefined }));
                                        setFormError("");
                                    }}
                                    error={fieldErrors.fullName}
                                />
                                <TextField
                                    id="login-password"
                                    label="Enter password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(value) => {
                                        setPassword(value);
                                        setFieldErrors((current) => ({ ...current, password: undefined }));
                                        setFormError("");
                                    }}
                                    error={fieldErrors.password}
                                />
                            </div>
                            {formError ? (
                                <p role="alert" className="mx-auto max-w-[440px] text-left text-[13px] text-[#C33F45]">
                                    {formError}
                                </p>
                            ) : null}
                            <div
                                data-aos="fade-up"
                                data-aos-delay="400"
                                className="mx-auto mt-8 flex w-full max-w-[538px] flex-col items-stretch gap-2.5 sm:mt-10 sm:flex-row sm:items-center sm:gap-4 lg:mt-12">
                                <Button
                                    type="submit"
                                    fullWidth
                                    loading={isSubmitting}
                                    loadingLabel="Signing in"
                                    disabled={isGoogleLoading}
                                    endIcon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M11 11V1H1M11 1L1 11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="white" />
                                    </svg>}
                                    className="sm:flex-1 hover:cursor-pointer"
                                >
                                    Continue with Email
                                </Button>
                                <span className="my-0.5 text-center text-[12px] text-[#98A2B3] sm:my-0">
                                    or
                                </span>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    fullWidth
                                    loading={isGoogleLoading}
                                    loadingLabel="Connecting"
                                    disabled={isSubmitting}
                                    onClick={handleGoogleSignIn}
                                    endIcon={
                                        <img
                                            src={googleLogoSrc}
                                            alt=""
                                            className="h-6 w-6 object-contain"
                                        />
                                    }
                                    className="sm:flex-1 hover:cursor-pointer"
                                >
                                    Continue with Google
                                </Button>
                            </div>
                            <div
                                data-aos="fade-up"
                                data-aos-delay="500"
                                className="mt-6 pt-1 text-center text-[13px] leading-5 text-[#647087]">
                                <p>
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPasswordOpen(true)}
                                        className="hover:cursor-pointer font-medium text-[#1457E8] underline underline-offset-2 hover:text-[#0F45BD]"
                                    >
                                        Forgot password?
                                    </button>
                                </p>
                                <p className="mt-3">
                                    Don’t have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onNavigateToSignup) onNavigateToSignup();
                                            else setFormError("Connect onNavigateToSignup to open the signup page.");
                                        }}
                                        className="hover:cursor-pointer font-medium text-[#1457E8] underline underline-offset-2 hover:text-[#0F45BD]"
                                    >
                                        Sign up
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
            {isForgotPasswordOpen ? (
                <ForgotPasswordDialog
                    onClose={closeForgotPassword}
                    onRequestOtp={onRequestPasswordResetOtp}
                />
            ) : null}
        </div>
    );
}
