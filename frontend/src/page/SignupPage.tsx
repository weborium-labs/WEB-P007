import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
} from "react";
import Button from "../component/Button";
import LeftGradient from "../assets/left-gradient.png";
import GoogleIcon from "../assets/GoogleIcon.svg";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type UserRole = "Intern" | "Group_manager" | "HR";

type SignupValues = {
    email: string;
    fullName: string;
    password: string;
    confirmPassword: string;
    role: UserRole | "";
};

export type SignupPayload = Omit<SignupValues, "confirmPassword">;

export interface SignupPageProps {
    /** Called after local validation when the user chooses Continue with Email. */
    onSignup?: (payload: SignupPayload) => void | Promise<void>;

    /** Resolve this callback only after the server accepts the submitted OTP. */
    onVerifyOtp?: (payload: { email: string; otp: string }) => void | Promise<void>;
    onOtpVerified?: () => void;
    onResendOtp?: (email: string) => void | Promise<void>;
    onGoogleSignIn?: () => void | Promise<void>;
    onNavigateToLogin?: () => void;
    onOpenTerms?: () => void;

    /** Override these paths with the actual approved brand assets in your app. */
    noiseImageSrc?: string;
    glowImageSrc?: string;
    weboriumLogoSrc?: string;
    googleLogoSrc?: string;
    className?: string;
}

type FieldErrors = Partial<Record<keyof SignupValues, string>>;

type OtpStatus = "verified" | "network-error" | "otp-incorrect" | null;

const ROLE_OPTIONS: UserRole[] = ["Intern", "Group_manager", "HR"];

const INITIAL_VALUES: SignupValues = {
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
    role: "",
};

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getErrorDetails(error: unknown): { code?: string; message: string } {
    if (error && typeof error === "object") {
        const candidate = error as { code?: unknown; message?: unknown };

        return {
            code: typeof candidate.code === "string" ? candidate.code : undefined,
            message:
                typeof candidate.message === "string"
                    ? candidate.message
                    : "Something went wrong. Please try again.",
        };
    }

    return { message: "Something went wrong. Please try again." };
}

function validateSignup(values: SignupValues): FieldErrors {
    const errors: FieldErrors = {};
    if (!isValidEmail(values.email)) {
        errors.email = "Enter a valid email address.";
    }
    if (values.fullName.trim().length < 2) {
        errors.fullName = "Enter your full name.";
    }
    if (values.password.length < 8) {
        errors.password = "Use at least 8 characters for your password.";
    }
    if (values.confirmPassword !== values.password) {
        errors.confirmPassword = "Your passwords do not match.";
    }
    if (!values.role) {
        errors.role = "Select a role to continue.";
    }

    return errors;
}

/**
 * Responsive page-level artwork. The mobile/tablet Figma canvas keeps the
 * textured gradient visible around and behind the form card, including while
 * the OTP dialog is open. On desktop the page returns to the split light layout.
 */
const REGISTER_GRADIENT_URL = "https://i.ibb.co/6cmHPkyt/register-gradient.jpg";

export function AuthPageBackdrop(_props: {
    noiseImageSrc?: string;
    glowImageSrc?: string;
}) {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#020407] lg:hidden"
        >
            <img
                src={REGISTER_GRADIENT_URL}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
            />
        </div>
    );
}

function WeboriumBrandMark({ logoSrc }: { logoSrc?: string }) {
    if (logoSrc) {
        return (
            <img
                src={logoSrc}
                alt="Weborium Labs"
                className="h-[31px] w-16 object-contain"
            />
        );
    }

    // The three paths are taken from the supplied Figma-exported Weborium mark.
    return (
        <span className="flex h-[31px] w-16 flex-col items-center justify-start">
            <svg
                aria-hidden="true"
                width="64"
                height="22"
                viewBox="0 0 64 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="block h-[22px] w-16 shrink-0"
            >
                <path
                    d="M0.402758 0.0311155C2.32776 -0.0185223 4.75919 0.122124 6.60123 0.0230223C10.7039 -0.197673 10.9035 1.16443 12.6446 4.27796L16.0409 10.3875C15.5636 11.2797 14.993 12.1706 14.5112 13.0611C13.8342 14.3125 13.1759 15.5829 12.5157 16.8437L10.8098 20.1226C8.39245 15.5512 5.93797 10.9996 3.44663 6.46798C2.28386 4.33199 1.19562 2.21496 0 0.0848846C0.111457 0.0196723 0.26111 0.0354655 0.402758 0.0311155Z"
                    transform="translate(9 0)"
                    fill="white"
                />
                <path
                    d="M12.039 0.00109893C12.9474 -0.031964 13.3963 0.68672 13.7931 1.389C15.0156 3.55506 16.4151 5.79429 17.5183 8.0182C16.5963 9.7621 15.5929 11.493 14.6614 13.2363L12.6459 17.0002C12.324 17.6075 11.8946 18.3684 11.6096 18.9748C10.607 21.1095 9.82286 21.1383 7.64084 21.1348L5.55 21.1322L0 21.1335C0.674266 19.9258 1.35401 18.5554 2.00531 17.3212L7.42175 6.99447L9.19305 3.6562C9.6876 2.73353 10.1454 1.83217 10.7662 0.986504C11.1607 0.449188 11.3425 0.146402 12.039 0.00109893Z"
                    transform="translate(20 0)"
                    fill="white"
                />
                <path
                    d="M12.8571 0.0157408C13.2108 0.00173259 13.6006 0.00677846 13.9569 0.0113464C16.3279 0.041886 18.7232 -0.0391612 21.0915 0.026399C20.502 1.16694 19.8164 2.36081 19.2017 3.49887L14.9679 11.3689L12.3142 16.3368C11.8383 17.2382 10.631 19.7954 10.0102 20.4153C9.03792 21.3859 7.52007 21.1453 6.26281 21.1401C3.037 21.1614 3.05963 21.0422 1.55396 18.2515L0 15.3745C0.393274 14.5745 0.985797 13.5735 1.4204 12.7738C2.09906 11.5235 2.7986 10.1933 3.5138 8.96904C3.87097 9.51697 4.38214 10.5215 4.72103 11.1327C5.91652 8.90796 7.12549 6.6904 8.34795 4.48023C8.76819 3.71726 9.21759 2.93023 9.62696 2.16413C10.3717 0.769965 11.2549 0.109666 12.8571 0.0157408Z"
                    transform="translate(35 0)"
                    fill="white"
                />
            </svg>
            <span className="-mt-px whitespace-nowrap text-[7px] font-semibold leading-[8px] tracking-[-0.03em] text-white">
                Weborium Labs
            </span>
        </span>
    );
}

export function AuthVisualPanel({
    mode,
    noiseImageSrc,
    glowImageSrc,
    weboriumLogoSrc,
}: {
    mode: "signup" | "login";
    noiseImageSrc: string;
    glowImageSrc: string;
    weboriumLogoSrc?: string;
}) {
    const isSignup = mode === "signup";

    return (
        <aside
            aria-hidden="true"
            className={[
                "relative isolate h-[288px] shrink-0 overflow-hidden bg-[#020407] text-white",
                "sm:h-64 lg:h-[calc(100svh-16px)] lg:min-h-[620px] lg:rounded-2xl",
                isSignup ? "lg:col-start-1" : "lg:order-2 lg:col-start-2",
            ].join(" ")}
        >
            <img
                src={glowImageSrc}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center bg-no-repeat"
            />
            <img
                src={noiseImageSrc}
                alt=""
                className="hidden pointer-events-none bg-no-repeat absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
            <p
                className={[
                    "absolute left-5 right-5 top-[94px] z-10 flex flex-col items-center text-center",
                    "text-[25px] font-semibold leading-[1.25] tracking-[-0.035em] text-white",
                    "sm:top-[66px] sm:text-[28px] lg:top-1/2 lg:-translate-y-1/2 lg:text-[32px] lg:leading-10",
                ].join(" ")}
            >
                {isSignup ? (
                    <>
                        {/* <span className="hidden">IMS that helps you track</span>
                        <span className="hidden font-normal italic">seamlessly.</span> */}
                    </>
                ) : (
                    <>
                        {/* <span className="hidden">Your workspace</span>
                        <span className="hidden font-normal italic">awaits.</span> */}
                    </>
                )}
            </p>
            <div className="sm:hidden absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap sm:bottom-6 lg:bottom-7">
                <span className="font-mono text-[10px] font-medium leading-5 tracking-[0.02em] text-white sm:text-[11px]">
                    POWERED BY
                </span>
                <WeboriumBrandMark logoSrc={weboriumLogoSrc} />
            </div>
        </aside>
    );
}

function FormField({
    id,
    label,
    value,
    onChange,
    type = "text",
    autoComplete,
    error,
    inputMode,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "email" | "password";
    autoComplete?: string;
    error?: string;
    inputMode?: "text" | "email" | "numeric";
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
                inputMode={inputMode}
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

function RoleSelect({
    value,
    onChange,
    error,
}: {
    value: UserRole | "";
    onChange: (value: UserRole) => void;
    error?: string;
}) {
    const listboxId = useId();

    const rootRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);

    const [activeIndex, setActiveIndex] = useState(() =>
        Math.max(0, ROLE_OPTIONS.indexOf(value as UserRole)),
    );
    useEffect(() => {
        if (!isOpen) return;

        const handleOutsidePointer = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("pointerdown", handleOutsidePointer);

        return () => document.removeEventListener("pointerdown", handleOutsidePointer);
    }, [isOpen]);

    const chooseRole = (role: UserRole) => {
        onChange(role);
        setActiveIndex(ROLE_OPTIONS.indexOf(role));
        setIsOpen(false);
    };

    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => Math.min(current + 1, ROLE_OPTIONS.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => Math.max(current - 1, 0));
        } else if (event.key === "Escape") {
            setIsOpen(false);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (isOpen) chooseRole(ROLE_OPTIONS[activeIndex]);
            else setIsOpen(true);
        }
    };

    return (
        <div ref={rootRef} className="relative w-full">
            <span id={`${listboxId}-label`} className="sr-only">
                Select role
            </span>
            <button
                type="button"
                role="combobox"
                aria-labelledby={`${listboxId}-label`}
                aria-controls={listboxId}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-invalid={Boolean(error)}
                onClick={() => setIsOpen((open) => !open)}
                onKeyDown={handleTriggerKeyDown}
                className={[
                    "flex h-[46px] w-full items-center justify-between rounded-xl border bg-white px-4",
                    "text-left font-sans text-[14px] outline-none transition-colors",
                    "focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10",
                    error ? "border-[#DC5555]" : "border-[#E8EBF0]",
                    value ? "text-[#141B2A]" : "text-[#98A2B3]",
                ].join(" ")}
            >
                <span>{value || "Select role"}</span>
                <svg className={[isOpen ? 'rotate-180' : '', "hover:cursor-pointer"].join("")} xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="#101828" />
                </svg>
            </button>
            {isOpen ? (
                <div
                    id={listboxId}
                    role="listbox"
                    aria-labelledby={`${listboxId}-label`}
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#E8EBF0] bg-white py-1.5 shadow-[0_12px_32px_rgba(20,27,42,0.12)]"
                >
                    {ROLE_OPTIONS.map((role, index) => {
                        const selected = role === value;

                        const active = index === activeIndex;

                        return (
                            <button
                                key={role}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => chooseRole(role)}
                                className={[
                                    "flex min-h-[37px] w-full items-center px-4 text-left text-[14px]",
                                    "transition-colors hover:bg-[#F7F8FA]",
                                    selected ? "font-medium text-[#2862F4]" : "text-[#141B2A]",
                                    active && !selected ? "bg-[#F7F8FA]" : "",
                                ].join(" ")}
                            >
                                {role}
                            </button>
                        );
                    })}
                </div>
            ) : null}
            {error ? <p className="mt-1.5 text-left text-xs text-[#C33F45]">{error}</p> : null}
        </div>
    );
}

function OtpDialog({
    email,
    noiseMessage,
    status,
    digits,
    busy,
    onDigitChange,
    onDigitKeyDown,
    onPaste,
    onResend,
    inputRefs,
}: {
    email: string;
    noiseMessage: string;
    status: OtpStatus;
    digits: string[];
    busy: boolean;
    onDigitChange: (index: number, value: string) => void;
    onDigitKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
    onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
    onResend: () => void;
    inputRefs: Array<HTMLInputElement | null>;
}) {
    useEffect(() => {
        inputRefs[0]?.focus();
    }, [inputRefs]);

    const message =
        status === "verified"
            ? "Verified"
            : status === "network-error"
                ? "Network Error"
                : status === "otp-incorrect"
                    ? "OTP Incorrect"
                    : noiseMessage;

    const statusClass =
        status === "verified"
            ? "text-[#2EAD79]"
            : status === "network-error"
                ? "text-[#D99127]"
                : status === "otp-incorrect"
                    ? "text-[#D94A4A]"
                    : "text-[#647087]";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 px-4 py-6"
            role="presentation"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="signup-otp-title"
                aria-describedby="signup-otp-description"
                className="w-full max-w-[414px] rounded-[20px] border border-[#EEF0F3] bg-white px-7 py-8 shadow-[0_14px_44px_rgba(20,27,42,0.12)] sm:px-9"
            >
                <h2
                    id="signup-otp-title"
                    className="text-center font-sans text-[20px] font-semibold leading-6 tracking-[-0.02em] text-[#141B2A]"
                >
                    Please check your email address
                </h2>
                <p
                    id="signup-otp-description"
                    className="mt-1 text-center text-[13px] leading-5 text-[#536078]"
                >
                    We’ve sent a code to <span className="font-mono text-[#30394B]">{email}</span>
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    {digits.map((digit, index) => (
                        <input
                            // Each box is a single digit; focus advances as the user types.
                            key={index}
                            ref={(element) => {
                                inputRefs[index] = element;
                            }}
                            aria-label={`Verification code digit ${index + 1}`}
                            autoComplete={index === 0 ? "one-time-code" : "off"}
                            inputMode="numeric"
                            pattern="[0-9]\"
                            maxLength={1}
                            value={digit}
                            disabled={busy || status === "verified"}
                            onChange={(event) => onDigitChange(index, event.target.value)}
                            onKeyDown={(event) => onDigitKeyDown(index, event)}
                            onPaste={index === 0 ? onPaste : undefined}
                            className="h-12 w-11 rounded-xl border border-transparent bg-[#F1F3F6] text-center font-mono text-[16px] text-[#141B2A] outline-none transition focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10 disabled:opacity-70"
                        />
                    ))}
                </div>
                <div className="mt-5 flex min-h-5 items-center justify-center gap-2" aria-live="polite">
                    {busy ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#747D8B] border-r-transparent" />
                    ) : status ? (
                        <>
                            <span aria-hidden="true" className={`text-[19px] leading-none ${statusClass}`}>
                                {status === "verified" ? "✓" : status === "network-error" ? "⚠" : "×"}
                            </span>
                            <span className={`text-[13px] font-medium ${statusClass}`}>{message}</span>
                        </>
                    ) : noiseMessage ? (
                        <p className="text-center text-[12px] text-[#C33F45]">{noiseMessage}</p>
                    ) : null}
                </div>
                {status && status !== "verified" ? (
                    <button
                        type="button"
                        onClick={onResend}
                        className="mt-3 block w-full text-center text-[13px] font-medium text-[#2862F4] underline underline-offset-2 hover:text-[#1F55DC]"
                    >
                        Resend code
                    </button>
                ) : null}
            </section>
        </div>
    );
}

export default function Signup({
    onSignup,
    onVerifyOtp,
    onOtpVerified,
    onResendOtp,
    onNavigateToLogin,
    onOpenTerms,
    noiseImageSrc = "/Noise.png",
    glowImageSrc = LeftGradient,
    weboriumLogoSrc,
    googleLogoSrc = GoogleIcon,
    className = "",
}: SignupPageProps) {
    useDocumentTitle('Sign Up')

    const [values, setValues] = useState<SignupValues>(INITIAL_VALUES);

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const [formError, setFormError] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const [isOtpOpen, setIsOtpOpen] = useState(false);

    const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);

    const [otpStatus, setOtpStatus] = useState<OtpStatus>(null);

    const [otpMessage, setOtpMessage] = useState("");

    const [isOtpBusy, setIsOtpBusy] = useState(false);

    const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const verificationInFlight = useRef(false);

    const signupRequestInFlight = useRef(false);

    const googleRequestInFlight = useRef(false);

    const updateValue = useCallback(
        <K extends keyof SignupValues>(key: K, value: SignupValues[K]) => {
            setValues((current) => ({ ...current, [key]: value }));
            setFieldErrors((current) => ({ ...current, [key]: undefined }));
            setFormError("");
        },
        [],
    );

    const verifyOtp = useCallback(
        async (code: string) => {
            if (verificationInFlight.current) return;
            if (!onVerifyOtp) {
                setOtpMessage("Connect the onVerifyOtp handler to complete verification.");
                return;
            }
            verificationInFlight.current = true;
            setIsOtpBusy(true);
            setOtpStatus(null);
            setOtpMessage("");
            try {
                await onVerifyOtp({ email: values.email.trim(), otp: code });
                setOtpStatus("verified");
                onOtpVerified?.();
            } catch (error) {
                const details = getErrorDetails(error);

                const invalidOtp =
                    details.code === "OTP_INVALID" || /incorrect|invalid otp/i.test(details.message);
                setOtpStatus(invalidOtp ? "otp-incorrect" : "network-error");
            } finally {
                verificationInFlight.current = false;
                setIsOtpBusy(false);
            }
        },
        [onVerifyOtp, onOtpVerified, values.email],
    );

    const handleOtpDigitChange = (index: number, rawValue: string) => {
        const digit = rawValue.replace(/\D/g, "").slice(-1);

        const nextDigits = [...otpDigits];
        nextDigits[index] = digit;
        setOtpDigits(nextDigits);
        setOtpStatus(null);
        setOtpMessage("");
        if (digit && index < nextDigits.length - 1) {
            otpInputRefs.current[index + 1]?.focus();
        }
        if (nextDigits.every(Boolean)) {
            void verifyOtp(nextDigits.join(""));
        }
    };

    const handleOtpKeyDown = (
        index: number,
        event: KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
        if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            otpInputRefs.current[index - 1]?.focus();
        }
        if (event.key === "ArrowRight" && index < 3) {
            event.preventDefault();
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
        const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (!pasted) return;
        event.preventDefault();

        const nextDigits = ["", "", "", ""];
        pasted.split("").forEach((digit, index) => {
            nextDigits[index] = digit;
        });
        setOtpDigits(nextDigits);
        setOtpStatus(null);
        setOtpMessage("");
        otpInputRefs.current[Math.min(pasted.length, 4) - 1]?.focus();
        if (pasted.length === 4) void verifyOtp(pasted);
    };

    const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");

        const errors = validateSignup(values);
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;
        if (signupRequestInFlight.current) return;
        if (!onSignup) {
            setFormError("Signup is not connected yet. Pass an onSignup handler from your API layer.");
            return;
        }
        signupRequestInFlight.current = true;
        setIsSubmitting(true);
        try {
            await onSignup({
                email: values.email.trim(),
                fullName: values.fullName.trim(),
                password: values.password,
                role: values.role as UserRole,
            });
            setOtpDigits(["", "", "", ""]);
            setOtpStatus(null);
            setOtpMessage("");
            setIsOtpOpen(true);
        } catch (error) {
            setFormError(getErrorDetails(error).message);
        } finally {
            signupRequestInFlight.current = false;
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setFormError("");

        // Validate role before initiating Google Sign In
        if (!values.role) {
            setFieldErrors((current) => ({
                ...current,
                role: "Select a role to continue.",
            }));
            return;
        }

        // Prevent duplicate requests
        if (googleRequestInFlight.current) return;

        googleRequestInFlight.current = true;
        setIsGoogleLoading(true);

        try {
            window.location.href = `${import.meta.env.VITE_GOOGLE_CALLBACK_URI}/?role=${values.role}`;
        } catch (error) {
            setFormError(getErrorDetails(error).message);
        } finally {
            googleRequestInFlight.current = false;
            setIsGoogleLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (verificationInFlight.current) return;
        if (!onResendOtp) {
            setOtpMessage("Connect the onResendOtp handler to resend a verification code.");
            return;
        }
        verificationInFlight.current = true;
        setIsOtpBusy(true);
        setOtpMessage("");
        setOtpStatus(null);
        setOtpDigits(["", "", "", ""]);
        try {
            await onResendOtp(values.email.trim());
            otpInputRefs.current[0]?.focus();
        } catch (error) {
            const details = getErrorDetails(error);
            setOtpStatus("network-error");
            setOtpMessage(details.message);
        } finally {
            verificationInFlight.current = false;
            setIsOtpBusy(false);
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
            <div className="relative z-10 mx-auto flex min-h-[100svh] flex-col p-0 lg:grid lg:grid-cols-[40%\_60%] lg:gap-0 lg:p-2">
                <AuthVisualPanel
                    mode="signup"
                    noiseImageSrc={noiseImageSrc}
                    glowImageSrc={glowImageSrc}
                    weboriumLogoSrc={weboriumLogoSrc}
                />
                <main className="relative z-10 -mt-2 mx-2 mb-2 flex min-h-[calc(100svh-288px)] flex-1 flex-col items-center justify-start rounded-2xl bg-[#F7F8FA] px-6 pb-10 pt-7 sm:min-h-[calc(100svh-256px)] sm:px-10 sm:pt-12 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:my-0 lg:mt-0 lg:min-h-0 lg:justify-center lg:rounded-none lg:px-8 lg:py-10">
                    <div className="w-full max-w-[540px]">
                        <header className="text-center">
                            <h1
                                className="text-[30px] font-bold leading-[1.2] tracking-[-0.035em] text-[#141B2A] sm:text-[36px] lg:text-[40px]"
                            >
                                Create your account
                            </h1>
                            <p
                                className="mt-2 text-[14px] font-semibold leading-5 text-[#536078] sm:text-[15px]"
                            >
                                Join a smarter way to work.
                            </p>
                        </header>
                        <form
                            onSubmit={handleSignup}
                            noValidate
                            className="mt-8 sm:mt-10 lg:mt-12"
                        >
                            <div className="mx-auto w-full max-w-[440px] space-y-4">
                                <FormField
                                    id="signup-email"
                                    label="Enter email address"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    value={values.email}
                                    onChange={(value) => updateValue("email", value)}
                                    error={fieldErrors.email}
                                />
                                <FormField
                                    id="signup-full-name"
                                    label="Create username"
                                    autoComplete="name"
                                    value={values.fullName}
                                    onChange={(value) => updateValue("fullName", value)}
                                    error={fieldErrors.fullName}
                                />
                                <FormField
                                    id="signup-password"
                                    label="Create a password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={values.password}
                                    onChange={(value) => updateValue("password", value)}
                                    error={fieldErrors.password}
                                />
                                <FormField
                                    id="signup-confirm-password"
                                    label="Re-enter your password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={values.confirmPassword}
                                    onChange={(value) => updateValue("confirmPassword", value)}
                                    error={fieldErrors.confirmPassword}
                                />
                                <RoleSelect
                                    value={values.role}
                                    onChange={(value) => updateValue("role", value)}
                                    error={fieldErrors.role}
                                />
                            </div>
                            {formError ? (
                                <p role="alert" className="mx-auto max-w-[440px] text-left text-[13px] text-[#C33F45]">
                                    {formError}
                                </p>
                            ) : null}
                            <div
                                className="mx-auto mt-8 flex w-full max-w-[538px] flex-col items-stretch gap-2.5 sm:mt-10 sm:flex-row sm:items-center sm:gap-4 lg:mt-12"
                            >
                                <Button
                                    type="submit"
                                    fullWidth
                                    loading={isSubmitting}
                                    loadingLabel="Please wait"
                                    disabled={isGoogleLoading}
                                    endIcon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M17 17V7H7M17 7L7 17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="white" />
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
                                className="mt-6 pt-1 text-center text-[13px] leading-5 text-[#647087]"
                            >
                                <p>
                                    By signing in you accept our{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onOpenTerms) onOpenTerms();
                                            else setFormError("Connect onOpenTerms to open the terms page.");
                                        }}
                                        className="hover:cursor-pointer font-medium text-[#1457E8] underline underline-offset-2 hover:text-[#0F45BD]"
                                    >
                                        Terms & Services
                                    </button>
                                </p>
                                <p className="mt-3">
                                    Already have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onNavigateToLogin) onNavigateToLogin();
                                            else setFormError("Connect onNavigateToLogin to open the login page.");
                                        }}
                                        className="hover:cursor-pointer font-medium text-[#1457E8] underline underline-offset-2 hover:text-[#0F45BD]"
                                    >
                                        Log in
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
            {isOtpOpen ? (
                <OtpDialog
                    email={values.email.trim()}
                    noiseMessage={otpMessage}
                    status={otpStatus}
                    digits={otpDigits}
                    busy={isOtpBusy}
                    onDigitChange={handleOtpDigitChange}
                    onDigitKeyDown={handleOtpKeyDown}
                    onPaste={handleOtpPaste}
                    onResend={handleResendOtp}
                    inputRefs={otpInputRefs.current}
                />
            ) : null}
        </div>
    );
}
