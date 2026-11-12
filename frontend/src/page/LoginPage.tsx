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
import { AuthPageBackdrop, AuthVisualPanel } from "./SignupPage";
import {
    useForgotPasswordMutation,
    useLoginMutation,
    useResetPasswordMutation,
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

    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

    const loginMutation = useLoginMutation();
    const forgotMutation = useForgotPasswordMutation();
    const verifyResetOtpMutation = useVerifyResetOtpMutation();
    const resetPasswordMutation = useResetPasswordMutation();

    useEffect(() => {
        if (resetStep === "otp") {
            otpRefs.current[0]?.focus();
        }
    }, [resetStep]);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!identifier.trim() || !password) {
            setFormError("Please enter your username/email and password.");
            return;
        }

        try {
            await loginMutation.mutateAsync({
                identifier: identifier.trim(),
                password,
            });
            navigate("/dashboard");
        } catch (err: unknown) {
            const msg = (err as { message?: string })?.message || "Invalid credentials.";
            setFormError(msg);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_GOOGLE_CALLBACK_URI}/?role=Intern`;
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

    return (
        <div className="relative isolate min-h-[100svh] w-full overflow-x-hidden bg-[#020407] font-sans text-[#141B2A] lg:bg-[#F7F8FA]">
            <AuthPageBackdrop mode="login" />

            <div className="relative z-10 mx-auto flex min-h-[100svh] flex-col p-0 lg:grid lg:grid-cols-[60%_40%] lg:gap-0 lg:p-2">
                {/* Right Visual Panel on Desktop (handled by AuthVisualPanel mode="login") */}
                <AuthVisualPanel
                    mode="login"
                    noiseImageSrc="/Noise.png"
                    glowImageSrc={LeftGradient}
                />

                {/* Left Form Panel on Desktop */}
                <main className="relative z-10 -mt-2 mx-2 mb-2 flex min-h-[calc(100svh-288px)] flex-1 flex-col items-center justify-start rounded-2xl bg-[#F7F8FA] px-6 pb-10 pt-7 sm:min-h-[calc(100svh-256px)] sm:px-10 sm:pt-12 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:my-0 lg:mt-0 lg:min-h-0 lg:justify-center lg:rounded-none lg:px-8 lg:py-10">
                    <div className="w-full max-w-[540px]">
                        <header className="text-center">
                            <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.035em] text-[#141B2A] sm:text-[36px] lg:text-[40px]">
                                Login to your account
                            </h1>
                            <p className="mt-2 text-[14px] font-semibold leading-5 text-[#536078] sm:text-[15px]">
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
                                    className="h-[46px] w-full rounded-xl border border-[#E8EBF0] bg-white px-4 text-[14px] text-[#141B2A] outline-none placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10"
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
                                    className="h-[46px] w-full rounded-xl border border-[#E8EBF0] bg-white px-4 text-[14px] text-[#141B2A] outline-none placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10"
                                />
                            </div>

                            {formError ? (
                                <p role="alert" className="mx-auto mt-3 max-w-[440px] text-left text-[13px] text-[#C33F45]">
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

                                <span className="my-0.5 text-center text-[12px] text-[#98A2B3] sm:my-0">
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

                            <div className="mt-6 pt-1 text-center text-[13px] leading-5 text-[#647087]">
                                <p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalError("");
                                            setModalSuccess("");
                                            setResetEmail(identifier.includes("@") ? identifier : "");
                                            setResetStep("email");
                                        }}
                                        className="font-medium text-[#1457E8] underline underline-offset-2 hover:cursor-pointer hover:text-[#0F45BD]"
                                    >
                                        Forgot password?
                                    </button>
                                </p>
                                <p className="mt-3">
                                    Don&apos;t have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => navigate("/signup")}
                                        className="font-medium text-[#1457E8] underline underline-offset-2 hover:cursor-pointer hover:text-[#0F45BD]"
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
                        className="relative w-full max-w-[414px] rounded-[20px] border border-[#EEF0F3] bg-white px-7 py-8 shadow-[0_14px_44px_rgba(20,27,42,0.14)] sm:px-9"
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            aria-label="Close modal"
                            onClick={() => setResetStep(null)}
                            className="absolute right-4 top-4 rounded-lg p-1 text-[#647087] hover:bg-[#F1F3F6] hover:text-[#141B2A]"
                        >
                            ✕
                        </button>

                        {/* STEP 1: ENTER EMAIL */}
                        {resetStep === "email" && (
                            <form onSubmit={handleSendResetOtp}>
                                <h2 className="text-center text-[20px] font-semibold tracking-[-0.02em] text-[#141B2A]">
                                    Please enter your email address
                                </h2>
                                <p className="mt-1 text-center text-[13px] text-[#536078]">
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
                                        className="h-[46px] w-full rounded-xl border border-[#E8EBF0] bg-white px-4 text-[14px] text-[#141B2A] outline-none placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10"
                                    />
                                </div>

                                {modalError ? (
                                    <p className="mt-2 text-left text-xs text-[#C33F45]">{modalError}</p>
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

                                <div className="mt-4 flex items-start gap-2 text-left text-[12px] leading-4 text-[#2862F4]">
                                    <span className="mt-0.5 shrink-0">ⓘ</span>
                                    <span>Once code sent, you must complete the password reset.</span>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: VERIFY 4-DIGIT OTP */}
                        {resetStep === "otp" && (
                            <div>
                                <h2 className="text-center text-[20px] font-semibold tracking-[-0.02em] text-[#141B2A]">
                                    Please check your email address
                                </h2>
                                <p className="mt-1 text-center text-[13px] text-[#536078]">
                                    We&apos;ve sent a code to{" "}
                                    <span className="font-mono text-[#30394B]">{resetEmail}</span>
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
                                            className="h-12 w-11 rounded-xl border border-transparent bg-[#F1F3F6] text-center font-mono text-[16px] text-[#141B2A] outline-none transition focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10"
                                        />
                                    ))}
                                </div>

                                <div className="mt-4 flex min-h-5 items-center justify-center">
                                    {verifyResetOtpMutation.isPending ? (
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#2862F4] border-r-transparent" />
                                    ) : modalError ? (
                                        <p className="text-center text-[13px] font-medium text-[#D94A4A]">
                                            {modalError}
                                        </p>
                                    ) : null}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => forgotMutation.mutate(resetEmail.trim())}
                                    className="mt-2 block w-full text-center text-[13px] font-medium text-[#2862F4] underline underline-offset-2"
                                >
                                    Resend code
                                </button>
                            </div>
                        )}

                        {/* STEP 3: NEW PASSWORD */}
                        {resetStep === "new-password" && (
                            <form onSubmit={handleCompleteReset}>
                                <h2 className="text-center text-[20px] font-semibold tracking-[-0.02em] text-[#141B2A]">
                                    Set a new password
                                </h2>
                                <p className="mt-1 text-center text-[13px] text-[#536078]">
                                    Create a strong password for{" "}
                                    <span className="font-mono text-[#30394B]">{resetEmail}</span>
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
                                        className="h-[46px] w-full rounded-xl border border-[#E8EBF0] bg-white px-4 text-[14px] text-[#141B2A] outline-none placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmNewPassword}
                                        onChange={(e) => {
                                            setConfirmNewPassword(e.target.value);
                                            setModalError("");
                                        }}
                                        className="h-[46px] w-full rounded-xl border border-[#E8EBF0] bg-white px-4 text-[14px] text-[#141B2A] outline-none placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10"
                                    />
                                </div>

                                {modalError ? (
                                    <p className="mt-2 text-left text-xs text-[#C33F45]">{modalError}</p>
                                ) : null}
                                {modalSuccess ? (
                                    <p className="mt-2 text-center text-xs font-medium text-[#2EAD79]">
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
        </div>
    );
}