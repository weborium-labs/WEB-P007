import {
    forwardRef,
    type ButtonHTMLAttributes,
    type ReactNode,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    loadingLabel?: string;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "border border-transparent bg-[#2862F4] text-white shadow-none hover:bg-[#1F55DC] focus-visible:ring-[#2862F4]/35 active:bg-[#194BCB]",
    secondary:
        "border border-transparent bg-[#F0F2F5] text-[#141B2A] hover:bg-[#E8EBF0] focus-visible:ring-[#98A2B3]/35 active:bg-[#E1E5EB]",
    outline:
        "border border-[#DCE1E8] bg-white text-[#141B2A] hover:bg-[#F8F9FB] focus-visible:ring-[#98A2B3]/35 active:bg-[#F1F3F6]",
    ghost:
        "border border-transparent bg-transparent text-[#2862F4] hover:bg-[#2862F4]/5 focus-visible:ring-[#2862F4]/25 active:bg-[#2862F4]/10",
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "min-h-9 rounded-lg px-4 text-sm",
    md: "min-h-12 rounded-xl px-6 text-base",
    lg: "min-h-[52px] rounded-xl px-7 text-base",
};

/**
 * Shared application button.
 *
 * Keep API calls in the page/container that owns the action; this component is
 * intentionally presentation-only and reports clicks through the native
 * onClick prop. `loading` prevents duplicate submissions while preserving the
 * button label and layout.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        children,
        variant = "primary",
        size = "md",
        fullWidth = false,
        loading = false,
        loadingLabel,
        startIcon,
        endIcon,
        disabled,
        className = "",
        type = "button",
        "aria-busy": ariaBusy,
        ...buttonProps
    },
    ref,
) {
    const isDisabled = Boolean(disabled || loading);

    return (
        <button
            ref={ref}
            type={type}
            disabled={isDisabled}
            aria-busy={loading || ariaBusy}
            className={[
                "inline-flex items-center justify-center gap-2.5 whitespace-nowrap",
                "font-sans font-semibold leading-5 tracking-[-0.01em]",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-4",
                "disabled:cursor-not-allowed disabled:opacity-60",
                variantClasses[variant],
                sizeClasses[size],
                fullWidth ? "w-full" : "w-auto",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...buttonProps}
        >
            {loading ? (
                <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
                />
            ) : startIcon ? (
                <span aria-hidden="true" className="inline-flex shrink-0 items-center">
                    {startIcon}
                </span>
            ) : null}

            <span>{loading && loadingLabel ? loadingLabel : children}</span>

            {!loading && endIcon ? (
                <span aria-hidden="true" className="inline-flex shrink-0 items-center">
                    {endIcon}
                </span>
            ) : null}
        </button>
    );
});

Button.displayName = "Button";

export default Button;
