import { useState } from "react";
import { DEMO_BATCH_CODE, ONBOARDING_DOCUMENTS } from "../../data/intern-dashboard.data";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useBatchLookupQuery, useJoinBatchMutation } from "../../hooks/useOnboarding";
import { isValidBatchCode, normalizeBatchCode } from "../../lib/onboarding";
import type { BatchLookupStatus, DocType } from "../../types/types";
import SectionHeading from "../intern-dashboard/SectionHeading";
import { InfoIcon } from "../intern-dashboard/Icons";
import BatchCodeInput from "./BatchCodeInput";
import BatchFindCard from "./BatchFindCard";
import DocumentUploadGrid from "./DocumentUploadGrid";
import StepRow from "./StepRow";

const LOOKUP_DEBOUNCE_MS = 500;

/** "Complete your onboarding": account created → join batch → upload documents. */
export default function OnboardingCard() {
    const [rawCode, setRawCode] = useState(DEMO_BATCH_CODE);
    const [joinedBatchLabel, setJoinedBatchLabel] = useState<string | null>(null);
    const [uploaded, setUploaded] = useState<ReadonlySet<DocType>>(new Set());

    const code = normalizeBatchCode(rawCode);
    const debouncedCode = useDebouncedValue(code, LOOKUP_DEBOUNCE_MS);
    const lookup = useBatchLookupQuery(debouncedCode);
    const join = useJoinBatchMutation();

    const joined = joinedBatchLabel !== null;
    const docsComplete = uploaded.size === ONBOARDING_DOCUMENTS.length;
    const stepsLeft = 2 - Number(joined) - Number(docsComplete);

    // Typing → debounce window counts as "loading" so the card never shows stale results.
    let status: BatchLookupStatus = "idle";
    if (isValidBatchCode(code)) {
        if (code !== debouncedCode || lookup.isFetching) status = "loading";
        else if (lookup.isError) status = "error";
        else if (lookup.data) status = "found";
        else if (lookup.data === null) status = "notFound";
    }

    const handleJoin = () => {
        const batch = lookup.data;
        if (!batch || join.isPending) return;
        join.mutate(batch.id, {
            onSuccess: () => setJoinedBatchLabel(`${batch.institute} · ${batch.batch}`),
        });
    };

    const handleUploaded = (type: DocType) => setUploaded((prev) => new Set(prev).add(type));

    return (
        <section
            aria-labelledby="onboarding-heading"
            className="flex flex-col gap-8 rounded-3xl border border-grey-50 bg-surface p-[30px] shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]"
        >
            <SectionHeading
                id="onboarding-heading"
                title="Complete your onboarding"
                subtitle={
                    stepsLeft === 0
                        ? "All steps complete."
                        : `You are just ${stepsLeft} step${stepsLeft === 1 ? "" : "s"} away from onboarding.`
                }
            />

            <ol className="flex flex-col">
                <StepRow state="done" title="Account created" />

                {joined ? (
                    <StepRow state="done" title={`Joined ${joinedBatchLabel}`} />
                ) : (
                    <StepRow
                        state="active"
                        title="Join your batch"
                        subtitle={
                            <span className="inline-flex items-center gap-2">
                                Enter the batch code shared by your coordinator.
                                <span title="Ask your coordinator or HR for the batch code." className="text-ink-700">
                                    <InfoIcon aria-label="Batch code help" role="img" />
                                </span>
                            </span>
                        }
                    >
                        <div className="flex flex-wrap items-start gap-x-11 gap-y-6">
                            <div className="min-w-0 flex-1 basis-[300px]">
                                <BatchCodeInput value={rawCode} onChange={setRawCode} disabled={join.isPending} />
                            </div>
                            <div className="min-w-0 flex-1 basis-[300px]">
                                {status !== "idle" && (
                                    <BatchFindCard
                                        status={status}
                                        code={code}
                                        batch={lookup.data}
                                        isJoining={join.isPending}
                                        joinError={join.isError ? "Couldn't join the batch. Please try again." : null}
                                        onJoin={handleJoin}
                                    />
                                )}
                            </div>
                        </div>
                    </StepRow>
                )}

                <StepRow
                    state={docsComplete ? "done" : joined ? "active" : "pending"}
                    title={docsComplete ? "Documents uploaded" : "Upload the below 4 documents"}
                    isLast
                >
                    {!docsComplete && (
                        <DocumentUploadGrid
                            documents={ONBOARDING_DOCUMENTS}
                            disabled={!joined}
                            onUploaded={handleUploaded}
                        />
                    )}
                </StepRow>
            </ol>
        </section>
    );
}