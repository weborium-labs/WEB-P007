import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "../Button";
import { useExchangeGoogleCodeMutation } from "../../hooks/useAuthMutations";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { dashboardPathForRole } from "../../lib/routes";

/**
 * OAuth landing route (`/verify-token`).
 *
 * The backend redirected here with a **single-use authorization code** — never
 * with a reusable access token. This component exchanges the code through a
 * TanStack Query mutation, stores the resulting session in the Zustand auth
 * store (memory only), scrubs the credentials from the URL and navigates to
 * the dashboard only after authentication has fully initialized.
 */
export default function CaptureToken() {
    useDocumentTitle("Signing in");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const exchangeMutation = useExchangeGoogleCodeMutation();

    const code = searchParams.get("code");
    const oauthError = searchParams.get("error") ?? searchParams.get("reason");

    // Single-use guard: prevents duplicate exchange requests (React Strict
    // Mode double-effects, re-renders while the mutation is in flight) and
    // keeps a failed exchange from bouncing back to /auth/login when the URL
    // is scrubbed.
    const processingRef = useRef(false);

    useEffect(() => {
        if (processingRef.current) return;

        // The OAuth callback reported a failure — hand off to the dedicated
        // failure page carrying only a safe reason code.
        if (oauthError) {
            processingRef.current = true;
            navigate(`/auth/failure?reason=${encodeURIComponent(oauthError)}`, {
                replace: true,
            });
            return;
        }

        if (!code) {
            // Fresh entry without credentials (bookmark / direct visit).
            navigate("/auth/login", { replace: true });
            return;
        }

        processingRef.current = true;

        exchangeMutation.mutate(code, {
            onSuccess: ({ user }) => {
                // Same role-based landing as password login.
                navigate(dashboardPathForRole(user.role), { replace: true });
            },
            onError: () => {
                // Scrub the spent/invalid code so a refresh or replay can
                // never re-post it. The ref stays `true`, so the effect does
                // not re-run and the error UI below renders instead.
                setSearchParams({}, { replace: true });
            },
        });
    }, [code, oauthError, exchangeMutation, navigate, setSearchParams]);

    if (oauthError) {
        return null; // Redirecting to the failure page.
    }

    if (exchangeMutation.isError) {
        const message =
            exchangeMutation.error?.message ||
            "We couldn't complete your Google sign-in. Please try again.";

        return (
            <main className="flex min-h-[100svh] items-center justify-center bg-[#F7F8FA] px-5 py-12 font-sans">
                <section className="w-full max-w-[440px] rounded-2xl border border-[#EEF0F3] bg-white p-8 text-center shadow-[0_14px_44px_rgba(20,27,42,0.10)]">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FEE4E2]">
                        <span
                            aria-hidden="true"
                            className="text-[20px] leading-none font-bold text-[#C33F45]"
                        >
                            !
                        </span>
                    </div>
                    <h1 className="mt-4 text-[22px] font-bold tracking-[-0.02em] text-[#141B2A]">
                        Sign-in failed
                    </h1>
                    <p role="alert" className="mt-2 text-[14px] leading-6 text-[#647087]">
                        {message}
                    </p>
                    <div className="mt-6">
                        <Button
                            fullWidth
                            onClick={() => navigate("/auth/login", { replace: true })}
                        >
                            Back to Log In
                        </Button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="flex min-h-[100svh] flex-col items-center justify-center bg-[#F7F8FA] px-5 font-sans">
            <span
                aria-hidden="true"
                className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2862F4] border-r-transparent"
            />
            <p role="status" className="mt-5 text-[15px] font-medium text-[#536078]">
                Signing you in securely…
            </p>
        </main>
    );
}
