import { MAX_BATCH_DURATION_DAYS } from "../constants/batch.constants.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const toIstDay = (date: Date): string =>
    new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

export const todayIst = (now: Date = new Date()): string => toIstDay(now);

/** 00:00:00.000 IST of the given day, as a UTC instant. */
export const istStartOfDay = (day: string): Date =>
    new Date(`${day}T00:00:00.000+05:30`);

/** 23:59:59.999 IST of the given day, as a UTC instant. */
export const istEndOfDay = (day: string): Date =>
    new Date(`${day}T23:59:59.999+05:30`);

/** Whole days from `startDay` to `endDay` (both `YYYY-MM-DD`). */
export const daysBetween = (startDay: string, endDay: string): number =>
    Math.round(
        (Date.parse(`${endDay}T00:00:00Z`) -
            Date.parse(`${startDay}T00:00:00Z`)) /
        DAY_MS,
    );

export type DateRangeCheck = { ok: true } | { ok: false; message: string };

/** BAT-03 plus the duration sanity bound. Shared by the validator and service. */
export const checkBatchDateRange = (
    startDay: string,
    endDay: string,
): DateRangeCheck => {
    if (endDay < startDay) {
        return {
            ok: false,
            message: "End date cannot be earlier than the start date.",
        };
    }

    if (daysBetween(startDay, endDay) > MAX_BATCH_DURATION_DAYS) {
        return {
            ok: false,
            message: `A batch cannot run longer than ${MAX_BATCH_DURATION_DAYS} days.`,
        };
    }

    return { ok: true };
};