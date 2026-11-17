import type { ReactNode } from "react";

export type BadgeTone =
    | "brand"
    | "ok"
    | "warn"
    | "bad"
    | "neutral";

const TONES: Record<BadgeTone, string> = {
    brand: "bg-brand-soft text-brand-link",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn-strong",
    bad: "bg-bad-soft text-bad-strong",
    neutral: "bg-grey-50 text-ink-600",
};

interface BadgeProps {
    children: ReactNode;
    tone?: BadgeTone;
    /** Leading status dot, mirroring the top-bar status pill. */
    dot?: boolean;
    className?: string;
}

/** Compact rounded status label used across list rows and detail headers. */
export default function Badge({
    children,
    tone = "neutral",
    dot = false,
    className = "",
}: BadgeProps) {
    return (
        <span
            className={[
                "inline-flex max-w-full items-center gap-1.5 rounded-full",
                "px-2.5 py-0.5 text-xs font-medium leading-5",
                TONES[tone],
                className,
            ].join(" ")}
        >
            {dot && (
                <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-current opacity-70"
                />
            )}
            <span className="truncate">{children}</span>
        </span>
    );
}
