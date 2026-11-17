import Button from "../Button";
import { formatBatchDate, startsInLabel } from "../../lib/onboarding";
import type { BatchLookupStatus, BatchPreview } from "../../types/types";
import { ArrowUpRightIcon, CheckIcon, CloseIcon, SpinnerIcon } from "../intern-dashboard/Icons";

interface BatchFindCardProps {
    status: Exclude<BatchLookupStatus, "idle">;
    code: string;
    batch?: BatchPreview | null;
    isJoining?: boolean;
    joinError?: string | null;
    onJoin: () => void;
}

const shell =
    "flex w-full max-w-[350px] flex-col items-start gap-6 rounded-3xl border border-grey-50 bg-surface px-[22px] py-4 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]";
const line = "text-sm font-semibold leading-5 text-ink-700";

/** Batch-Find states: loading → found | not found (| error). */
export default function BatchFindCard({ status, code, batch, isJoining, joinError, onJoin }: BatchFindCardProps) {
    if (status === "loading") {
        return (
            <div role="status" aria-live="polite" aria-busy="true" className={shell}>
                <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3 text-ink-700">
                        <p className="text-xl font-semibold leading-7">Finding your batch</p>
                        <SpinnerIcon className="animate-spin" />
                    </div>
                    <div className="flex flex-col gap-2 text-ink-400">
                        <p className="break-all font-jetbrains text-[13px] font-medium leading-5">Checking code: {code}</p>
                        <p className="text-sm font-semibold leading-5">Verifying schedule and coordinator details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === "found" && batch) {
        return (
            <div role="status" aria-live="polite" className={shell}>
                <div className="flex w-full flex-col items-start gap-3">
                    <div className="flex items-center gap-3 text-ok-bright">
                        <p className="text-xl font-semibold leading-7">Batch found</p>
                        <CheckIcon />
                    </div>
                    <div className="flex w-full flex-col gap-2">
                        <p className={line}>
                            {batch.institute} · {batch.batch}
                        </p>
                        <p className={line}>
                            Starts {formatBatchDate(batch.startDate)} · Ends {formatBatchDate(batch.endDate)}
                        </p>
                        <p className={line}>{startsInLabel(batch.startDate)}</p>
                        <p className={line}>Managed by HR: {batch.hrName}</p>
                    </div>
                </div>
                <Button onClick={onJoin} loading={isJoining} loadingLabel="Joining..." endIcon={<ArrowUpRightIcon />}>
                    Join batch
                </Button>
                {joinError ? (
                    <p role="alert" className="text-sm font-semibold leading-5 text-bad">
                        {joinError}
                    </p>
                ) : null}
            </div>
        );
    }

    const isError = status === "error";
    return (
        <div role="alert" className={shell}>
            <div className="flex flex-col items-start gap-3">
                <div className="flex items-center gap-3 text-bad">
                    <p className="text-xl font-semibold leading-7">{isError ? "Something went wrong" : "Batch not found"}</p>
                    <CloseIcon />
                </div>
                <div className="flex flex-col gap-2">
                    <p className={line}>
                        {isError ? "We couldn't verify the code right now." : "No batch matched the code you entered."}
                    </p>
                    <p className={line}>{isError ? "Please try again." : "Try another code."}</p>
                </div>
            </div>
        </div>
    );
}