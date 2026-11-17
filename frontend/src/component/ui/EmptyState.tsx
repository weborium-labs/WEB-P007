import type { ReactNode } from "react";

interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
}

/** Centered empty / no-results block used inside cards. */
export default function EmptyState({
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <p className="text-base font-semibold leading-6 text-ink">
                {title}
            </p>
            {description && (
                <p className="max-w-sm text-sm leading-5 text-ink-500">
                    {description}
                </p>
            )}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
