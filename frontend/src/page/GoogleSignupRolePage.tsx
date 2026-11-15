import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "../component/Button";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useGoogleSignupMutation } from "../hooks/useAuthMutations";
import { RoleSelect, type UserRole } from "./SignupPage";

/**
 * Google sign-up role chooser (`/auth/google/role?pending=<signed token>`).
 *
 * Reached only from the OAuth callback when Google proved an identity that has
 * **no account yet** — the account is never created with a default role. This
 * screen pauses the flow so the user picks their own role, then submits the
 * signed `pending` token (which carries the identity; the client never sends
 * profile data) to `POST /auth/google/signup`.
 *
 * The result is a single-use `{ code }`, handed straight to `/verify-token` so
 * the existing exchange/session logic runs untouched. A missing or expired
 * `pending` token cannot be recovered here — back to Log In.
 */
export default function GoogleSignupRolePage() {
    useDocumentTitle("Choose your role");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const signupMutation = useGoogleSignupMutation();

    const pending = searchParams.get("pending");

    const [role, setRole] = useState<UserRole | "">("");
    const [roleError, setRoleError] = useState("");
    const [formError, setFormError] = useState("");

    // Single-use guard against duplicate submissions (React Strict Mode
    // double-effects while a redirect is already in flight).
    const submittingRef = useRef(false);

    useEffect(() => {
        if (!pending && !submittingRef.current) {
            navigate("/auth/login", { replace: true });
        }
    }, [pending, navigate]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setFormError("");

        if (!pending) return;

        if (!role) {
            setRoleError("Select a role to continue.");
            return;
        }

        if (submittingRef.current) return;
        submittingRef.current = true;

        signupMutation.mutate(
            { pending, role },
            {
                onSuccess: ({ code }) => {
                    // Hand off to the shared exchange step; the code is
                    // single-use and short-lived, so navigate immediately.
                    navigate(`/verify-token?code=${encodeURIComponent(code)}`, {
                        replace: true,
                    });
                },
                onError: (error) => {
                    submittingRef.current = false;
                    setFormError(
                        error instanceof Error
                            ? error.message
                            : "We couldn't create your account. Please try again.",
                    );
                },
            },
        );
    };

    // Redirecting to Log In (no/expired token).
    if (!pending && !formError) {
        return null;
    }

    return (
        <main className="flex min-h-[100svh] items-center justify-center bg-canvas px-5 py-12 font-sans text-ink">
            <section className="w-full max-w-[440px] rounded-2xl border border-line-soft bg-surface p-8 shadow-[0_14px_44px_rgba(20,27,42,0.10)]">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand/10">
                    <span
                        aria-hidden="true"
                        className="text-[20px] leading-none font-bold text-brand-strong"
                    >
                        ✓
                    </span>
                </div>

                <h1 className="mt-4 text-center text-[22px] font-bold tracking-[-0.02em]">
                    Choose your role
                </h1>
                <p className="mt-2 text-center text-[14px] leading-6 text-ink-500">
                    Your Google account is verified. Pick the role you'll use
                    on this platform — this creates your account.
                </p>

                <form onSubmit={handleSubmit} noValidate className="mt-6">
                    {/* Visible label; the combobox already exposes its own
                        sr-only "Select role" name via aria-labelledby. */}
                    <span
                        aria-hidden="true"
                        className="mb-1.5 block text-left text-[13px] font-medium text-ink-600"
                    >
                        Role
                    </span>
                    <RoleSelect
                        value={role}
                        onChange={(value) => {
                            setRole(value);
                            setRoleError("");
                        }}
                        error={roleError}
                    />

                    {formError ? (
                        <p
                            role="alert"
                            className="mt-3 text-left text-[13px] text-bad"
                        >
                            {formError}
                        </p>
                    ) : null}

                    <div className="mt-6">
                        <Button
                            type="submit"
                            fullWidth
                            loading={signupMutation.isPending}
                            loadingLabel="Creating your account…"
                        >
                            Continue
                        </Button>
                    </div>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/auth/login", { replace: true })
                            }
                            className="text-[13px] font-medium text-brand-strong underline underline-offset-2 hover:text-brand-link"
                        >
                            Back to Log In
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
