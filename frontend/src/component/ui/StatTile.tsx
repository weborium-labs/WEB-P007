export type StatTileTone = "default" | "brand" | "ok" | "warn" | "bad";

const VALUE_TONES: Record<StatTileTone, string> = {
    default: "text-ink",
    brand: "text-brand-link",
    ok: "text-ok",
    warn: "text-warn-strong",
    bad: "text-bad-strong",
};

interface StatTileProps {
    label: string;
    value: string | number;
    /** Small secondary line under the value (percentage, hint, …). */
    hint?: string;
    tone?: StatTileTone;
    /** `sm` keeps long values (dates, names) legible in narrow tiles. */
    size?: "md" | "sm";
}

const VALUE_SIZES = {
    md: "text-2xl leading-8",
    sm: "text-lg leading-7",
} as const;

/**
 * Dense stat tile used inside `StatCard` sections.
 *
 * Deliberately smaller than `intern-dashboard/OverviewCard` (which is the
 * hero-sized tile for dashboard overviews) — same card surface, border and
 * shadow so the two read as one family.
 */
export default function StatTile({
    label,
    value,
    hint,
    tone = "default",
    size = "md",
}: StatTileProps) {
    return (
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-grey-50 bg-surface px-4 py-3.5 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]">
            <p className="truncate text-sm leading-5 text-ink-500">{label}</p>
            <p
                className={`font-jetbrains truncate font-semibold ${VALUE_SIZES[size]} ${VALUE_TONES[tone]}`}
            >
                {value}
            </p>
            {hint && (
                <p className="truncate text-xs leading-4 text-ink-400">
                    {hint}
                </p>
            )}
        </div>
    );
}
