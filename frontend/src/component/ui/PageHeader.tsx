import type { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    /** Actions aligned right (buttons, filters) — wraps under on mobile. */
    actions?: ReactNode;
    /** Leading element before the title (back link, avatar). */
    leading?: ReactNode;
}

/**
 * Page-level heading shared by the admin pages.
 *
 * Uses the same type scale as `Salutation` (bold display title + semibold
 * subtitle) so every page opens with the same rhythm; the title steps down
 * one size below `sm` to stay pixel-clean on narrow viewports.
 */
export default function PageHeader({
    title,
    subtitle,
    actions,
    leading,
}: PageHeaderProps) {
    return (
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 items-start gap-3">
                {leading}
                <div className="flex min-w-0 flex-col items-start gap-1.5">
                    <h1 className="break-words text-[30px] font-bold leading-9 text-ink sm:text-[40px] sm:leading-[48px]">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-base font-semibold leading-6 text-ink-800 sm:text-lg sm:leading-7">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-3">
                    {actions}
                </div>
            )}
        </header>
    );
}
