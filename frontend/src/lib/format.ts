/**
 * Display helpers shared by the admin pages.
 *
 * Dates arrive as ISO strings (parsed to `Date` by `lib/admin.schemas`) and
 * are formatted with `Intl` so the locale comes from the browser instead of
 * being hard-coded.
 */

const dateOnly = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const dateTime = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

const numberFormat = new Intl.NumberFormat();

/** First two characters of a name, uppercased — matches `ProfilePage`. */
export const initialsOf = (name: string): string =>
    name.slice(0, 2).toUpperCase();

/** `16 Nov 2026`, or an em dash when the value is missing. */
export const formatDate = (value: Date | string | null | undefined): string => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateOnly.format(date);
};

/** `16 Nov 2026, 10:44 PM`, or an em dash when missing. */
export const formatDateTime = (
    value: Date | string | null | undefined,
): string => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
};

/** Grouped thousands: `1,204`. */
export const formatNumber = (value: number): string =>
    numberFormat.format(value);

/** One decimal place with a `%`: `84.3%`, or an em dash when null. */
export const formatPercent = (value: number | null | undefined): string =>
    value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;

/** `12 / 40` style ratio, or an em dash when the denominator is 0. */
export const formatRatio = (numerator: number, denominator: number): string =>
    denominator === 0 ? "—" : `${numerator} / ${denominator}`;
