import { z } from "zod";

import {
    ARCHIVE_FILTERS,
    BATCH_NAME_MAX_LENGTH,
    BATCH_NAME_MIN_LENGTH,
    BATCH_SORT_FIELDS,
    BATCH_STATUS_FILTERS,
    DEFAULT_PAGE_SIZE,
    MAX_HR_PER_BATCH,
    MAX_PAGE_SIZE,
} from "../constants/batch.constants.js";
import { checkBatchDateRange, todayIst } from "../utils/date.js";

/* ------------------------------------------------------------------ */
/* Field primitives                                                    */
/* ------------------------------------------------------------------ */

// Letters/digits first, then letters, digits, space and _ - ( ) . , & /
// Covers "B1", "B2 (June 2026)", "Winter-Intake_2026".
const BATCH_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _\-().,&/]*$/u;

const batchName = z
    .string({ error: "Batch name must be a string." })
    .trim()
    .min(BATCH_NAME_MIN_LENGTH, {
        error: `Batch name must be at least ${BATCH_NAME_MIN_LENGTH} characters.`,
    })
    .max(BATCH_NAME_MAX_LENGTH, {
        error: `Batch name must be at most ${BATCH_NAME_MAX_LENGTH} characters.`,
    })
    .regex(BATCH_NAME_PATTERN, {
        error: "Batch name contains unsupported characters.",
    })
    .transform((value) => value.replace(/\s+/g, " "));

/** Calendar day in IST, `YYYY-MM-DD`. Real dates only (no 2026-02-31). */
const calendarDay = (label: string) =>
    z.iso.date({ error: `${label} must be a valid date in YYYY-MM-DD format.` });

const uuid = (label: string) =>
    z.uuid({ error: `${label} must be a valid UUID.` });

const hrIdList = z
    .array(uuid("hrIds[]"), { error: "hrIds must be an array of UUIDs." })
    .max(MAX_HR_PER_BATCH, {
        error: `A batch can have at most ${MAX_HR_PER_BATCH} HR owners.`,
    })
    .refine((ids) => new Set(ids).size === ids.length, {
        error: "hrIds must not contain duplicates.",
    });

/* ------------------------------------------------------------------ */
/* Request schemas                                                     */
/* ------------------------------------------------------------------ */

/** Route param `:batchId`. */
export const batchIdParamSchema = z.object({
    batchId: uuid("batchId"),
});

/**
 * POST /batch
 * - BAT-01: name, start date, end date
 * - BAT-03: end date >= start date
 * - A batch that has already finished cannot be created.
 * - `hrIds` is honoured for Admin only (enforced in the service, BAT-02).
 */
export const createBatchSchema = z
    .strictObject({
        name: batchName,
        startDate: calendarDay("startDate"),
        endDate: calendarDay("endDate"),
        hrIds: hrIdList.optional(),
    })
    .superRefine((value, ctx) => {
        const range = checkBatchDateRange(value.startDate, value.endDate);

        if (!range.ok) {
            ctx.addIssue({
                code: "custom",
                path: ["endDate"],
                message: range.message,
            });
            return;
        }

        if (value.endDate < todayIst()) {
            ctx.addIssue({
                code: "custom",
                path: ["endDate"],
                message: "End date cannot be in the past.",
            });
        }
    });

/**
 * PATCH /batch/:batchId — partial update. Cross-checks against the stored
 * dates (when only one of the two is sent) happen in the service.
 */
export const updateBatchSchema = z
    .strictObject({
        name: batchName.optional(),
        startDate: calendarDay("startDate").optional(),
        endDate: calendarDay("endDate").optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        error: "Provide at least one field to update.",
    })
    .superRefine((value, ctx) => {
        if (value.startDate && value.endDate) {
            const range = checkBatchDateRange(value.startDate, value.endDate);

            if (!range.ok) {
                ctx.addIssue({
                    code: "custom",
                    path: ["endDate"],
                    message: range.message,
                });
            }
        }
    });

/** PUT /batch/:batchId/hr — full replacement of the HR owner set (Admin). */
export const assignBatchHrSchema = z.strictObject({
    hrIds: hrIdList,
});

/** GET /batch — query string (unknown keys are stripped, not rejected). */
export const listBatchesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE),
    search: z.string().trim().min(1).max(BATCH_NAME_MAX_LENGTH).optional(),
    status: z.enum(BATCH_STATUS_FILTERS).optional(),
    /** Admin only; ignored for every other role. */
    archived: z.enum(ARCHIVE_FILTERS).default("exclude"),
    sortBy: z.enum(BATCH_SORT_FIELDS).default("startDate"),
    order: z.enum(["asc", "desc"]).default("desc"),
});

/* ------------------------------------------------------------------ */
/* Inferred types (validated output)                                   */
/* ------------------------------------------------------------------ */

export type BatchIdParams = z.infer<typeof batchIdParamSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type AssignBatchHrInput = z.infer<typeof assignBatchHrSchema>;
export type ListBatchesQuery = z.infer<typeof listBatchesQuerySchema>;