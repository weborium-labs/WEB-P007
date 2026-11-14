import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "../component/Button";
import GoogleIcon from "../assets/GoogleIcon.svg";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface FailureContent {
    title: string;
    body: string;
    showGoogleRetry: boolean;
}

/**
 * Safe, non-leaking reason codes emitted by the backend OAuth handlers.
 * Anything unknown falls back to the generic entry.
 */
const FAILURE_CONTENT: Readonly<Record<string, FailureContent>> = {
    account_exists: {
        title: "Account already exists",
        body: "An account with this email already exists. Sign in with your email and password first, then connect Google from your profile.",
        showGoogleRetry: false,
    },
    email_not_verified: {
        title: "Google email not verified",
        body: "Google reported that this email address is not verified. Verify it with Google and try again.",
        showGoogleRetry: true,
    },
    account_inactive: {
        title: "Account inactive",
        body: "This account has been deactivated. Please contact your HR or administrator.",
        showGoogleRetry: false,
    },
    access_denied: {
        title: "Sign-in cancelled",
        body: "You cancelled the Google sign-in. You can try again whenever you're ready.",
        showGoogleRetry: true,
    },
    invalid_state: {
        title: "Sign-in link expired",
        body: "For your security, this sign-in attempt expired or could not be verified. Please try again.",
        showGoogleRetry: true,
    },
    role_required: {
        title: "Role required",
        body: "Please choose your role on the sign-up page before continuing with Google.",
        showGoogleRetry: false,
    },
    profile_incomplete: {
        title: "Google profile incomplete",
        body: "Your Google account did not provide the information we need. Try again or use your email and password.",
        showGoogleRetry: true,
    },
    oauth_failed: {
        title: "Google sign-in failed",
        body: "We couldn't sign you in with Google. Please try again, or continue with your email and password.",
        showGoogleRetry: true,
    },
};

const GENERIC_FAILURE: FailureContent = FAILURE_CONTENT.oauth_failed;

/**
 * Landing page for OAuth failures (`/auth/failure?reason=<safe code>`).
 * Renders only fixed, safe copy — never raw provider errors or tokens.
 */
export default function AuthFailurePage() {
    useDocumentTitle("Sign-in failed");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const reason = searchParams.get("reason") ?? "";
    const content = FAILURE_CONTENT[reason] ?? GENERIC_FAILURE;

    const handleGoogleRetry = () => {
        // Role selection happens on sign-up; login retries as Intern,
        // matching the existing login-page behaviour.
        const baseUri = import.meta.env.VITE_GOOGLE_CALLBACK_URI?.replace(
            /\/+$/,
            "",
        );

        if (!baseUri) {
            navigate("/auth/login", { replace: true });
            return;
        }

        window.location.href = `${baseUri}?role=Intern`;
    };

    return (
        <main className="flex min-h-[100svh] items-center justify-center bg-[#F7F8FA] px-5 py-12 font-sans text-[#141B2A]">
            <section className="w-full max-w-[440px] rounded-2xl border border-[#EEF0F3] bg-white p-8 text-center shadow-[0_14px_44px_rgba(20,27,42,0.10)]">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FEE4E2]">
                    <span
                        aria-hidden="true"
                        className="text-[20px] leading-none font-bold text-[#C33F45]"
                    >
                        !
                    </span>
                </div>

                <h1 className="mt-4 text-[22px] font-bold tracking-[-0.02em]">
                    {content.title}
                </h1>
                <p className="mt-2 text-[14px] leading-6 text-[#647087]">
                    {content.body}
                </p>

                <div className="mt-6 space-y-2.5">
                    <Button fullWidth onClick={() => navigate("/auth/login", { replace: true })}>
                        Back to Log In
                    </Button>

                    {content.showGoogleRetry ? (
                        <Button
                            variant="secondary"
                            fullWidth
                            onClick={handleGoogleRetry}
                            endIcon={
                                <img
                                    src={GoogleIcon}
                                    alt=""
                                    className="h-5 w-5 object-contain"
                                />
                            }
                        >
                            Try Google again
                        </Button>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => navigate("/auth/signup", { replace: true })}
                        className="mx-auto block text-[13px] font-medium text-[#1457E8] underline underline-offset-2 hover:text-[#0F45BD]"
                    >
                        Create an account
                    </button>
                </div>
            </section>
        </main>
    );
}
