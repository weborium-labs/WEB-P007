/**
 * Shared pagination bounds for every list endpoint.
 *
 * Extracted from `batch.constants.ts` so non-batch domains (admin, …) can reuse
 * the same limits without importing batch-specific rules. `batch.constants.ts`
 * re-exports both values, so existing imports keep working unchanged.
 */

/** Rows returned when the caller omits `limit`. */
export const DEFAULT_PAGE_SIZE = 20;

/** Hard upper bound on `limit` — protects the DB from unbounded pages. */
export const MAX_PAGE_SIZE = 100;
