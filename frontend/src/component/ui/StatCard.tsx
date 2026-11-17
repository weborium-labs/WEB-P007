import type { ReactNode } from "react";

interface StatCardProps {
    title: string;
    subtitle?: string;
    /** Extra content aligned to the right of the heading (e.g. a badge). */
    action?: ReactNode;
    children: ReactNode;
    /** Grid columns for the tile children. */
    columns?: "1" | "2" | "3" | "4";
}

const COLUMNS = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 sm:grid-cols-2",
    "3": "grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-2 lg:grid-cols-4",
} as const;

/**
 * Surface card that groups `StatTile`s under a section heading — the same
 * card treatment as the dashboard tiles, with a compact heading sized for
 * in-card use (the standalone `SectionHeading` is intentionally larger).
 */
export default function StatCard({
    title,
    subtitle,
    action,
    children,
    columns = "3",
}: StatCardProps) {
    return (
        <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-grey-50 bg-surface p-5 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)] sm:p-6">
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="text-lg font-semibold leading-7 text-ink">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm leading-5 text-ink-500">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action}
            </header>

            <div className={`grid gap-3 ${COLUMNS[columns]}`}>{children}</div>
        </section>
    );
}
