interface PaginationProps {
    page: number;
    totalPages: number;
    /** Total matching rows (used for the "showing X–Y of Z" summary). */
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    itemLabel?: string;
    className?: string;
}

const BUTTON_BASE =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

const IDLE =
    "border-line bg-surface text-ink hover:bg-grey-50";
const ACTIVE =
    "border-transparent bg-brand text-white";

/** Page numbers to render: first, last, and a window around the current page. */
const pageWindow = (page: number, totalPages: number): Array<number | "gap"> => {
    const pages = new Set<number>([1, totalPages, page]);

    for (const candidate of [page - 1, page + 1]) {
        if (candidate > 1 && candidate < totalPages) pages.add(candidate);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const output: Array<number | "gap"> = [];

    sorted.forEach((value, index) => {
        if (index > 0 && value - sorted[index - 1] > 1) output.push("gap");
        output.push(value);
    });

    return output;
};

/**
 * Prev / numbered pages / next, plus a "showing X–Y of Z" summary.
 *
 * Renders nothing when there is a single page or no data at all, so empty
 * states are not followed by a dead control strip.
 */
export default function Pagination({
    page,
    totalPages,
    total,
    limit,
    onPageChange,
    itemLabel = "users",
    className = "",
}: PaginationProps) {
    if (total === 0 || totalPages <= 1) return null;

    const firstRow = (page - 1) * limit + 1;
    const lastRow = Math.min(page * limit, total);
    const pages = pageWindow(page, totalPages);

    const goTo = (next: number) => {
        if (next >= 1 && next <= totalPages && next !== page) onPageChange(next);
    };

    return (
        <nav
            aria-label="Pagination"
            className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${className}`}
        >
            <p className="text-sm leading-5 text-ink-500">
                Showing{" "}
                <span className="font-medium text-ink">
                    {firstRow}–{lastRow}
                </span>{" "}
                of <span className="font-medium text-ink">{total}</span>{" "}
                {itemLabel}
            </p>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => goTo(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className={`${BUTTON_BASE} ${IDLE}`}
                >
                    Prev
                </button>

                {pages.map((entry, index) =>
                    entry === "gap" ? (
                        <span
                            key={`gap-${index}`}
                            aria-hidden="true"
                            className="px-1 text-sm text-ink-400"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={entry}
                            type="button"
                            onClick={() => goTo(entry)}
                            aria-current={entry === page ? "page" : undefined}
                            aria-label={`Page ${entry}`}
                            className={`${BUTTON_BASE} ${
                                entry === page ? ACTIVE : IDLE
                            }`}
                        >
                            {entry}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    onClick={() => goTo(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                    className={`${BUTTON_BASE} ${IDLE}`}
                >
                    Next
                </button>
            </div>
        </nav>
    );
}
