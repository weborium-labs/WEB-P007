import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MOCK_BATCH } from "../data/intern-dashboard.data";
import { isValidBatchCode } from "../lib/onboarding";
import type { BatchPreview, DocType, UploadDocumentPayload } from "../types/types";

/**
 * Onboarding data layer (batch lookup, join, document upload).
 *
 * API calls are intentionally left blank — each has a `TODO(API)` slot.
 * While `USE_MOCK` is true they resolve with demo data and realistic delays so
 * the UI (loading / found / not-found / upload progress) can be exercised.
 * To go live: implement the TODO branches with `apiClient` and set `USE_MOCK = false`.
 */
const USE_MOCK = true;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const onboardingKeys = {
    batchLookup: (code: string) => ["batch-lookup", code] as const,
};

/** Resolves the batch for a code, or `null` when no batch matches (404). */
async function lookupBatchByCode(code: string): Promise<BatchPreview | null> {
    if (USE_MOCK) {
        await sleep(1200);
        return code === MOCK_BATCH.code ? MOCK_BATCH : null;
    }

    // TODO(API): GET batch by code via `apiClient`; map a 404 to `return null`.
    throw new Error("TODO(API): lookupBatchByCode is not implemented.");
}

async function joinBatch(batchId: string): Promise<{ batchId: string }> {
    if (USE_MOCK) {
        await sleep(900);
        return { batchId };
    }

    // TODO(API): POST join-batch via `apiClient`.
    throw new Error("TODO(API): joinBatch is not implemented.");
}

async function uploadDocument({
    docType,
    file,
    onProgress,
}: UploadDocumentPayload): Promise<{ docType: DocType; fileName: string }> {
    if (USE_MOCK) {
        for (let percent = 10; percent <= 100; percent += 10) {
            await sleep(120);
            onProgress?.(percent);
        }
        return { docType, fileName: file.name };
    }

    // TODO(API): POST multipart FormData via `apiClient`; report `onUploadProgress` to `onProgress`.
    throw new Error("TODO(API): uploadDocument is not implemented.");
}

/** Looks up a batch by (already normalised) code. Only runs for well-formed codes. */
export function useBatchLookupQuery(code: string) {
    return useQuery({
        queryKey: onboardingKeys.batchLookup(code),
        queryFn: () => lookupBatchByCode(code),
        enabled: isValidBatchCode(code),
        retry: false,
        staleTime: 5 * 60 * 1000,
    });
}

export function useJoinBatchMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (batchId: string) => joinBatch(batchId),
        onSuccess: () => {
            // Server owns `batchId`; refresh the profile instead of patching it locally.
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}

export function useUploadDocumentMutation() {
    return useMutation({
        mutationFn: (payload: UploadDocumentPayload) => uploadDocument(payload),
    });
}