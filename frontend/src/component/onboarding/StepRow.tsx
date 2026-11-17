import type { ReactNode } from "react";
import { ArrowRightIcon, CheckIcon, DotIcon } from "../intern-dashboard/Icons";

export type StepState = "done" | "active" | "pending";

interface StepRowProps {
    state: StepState;
    title: string;
    subtitle?: ReactNode;
    isLast?: boolean;
    children?: ReactNode;
}

const titleClasses: Record<StepState, string> = {
    done: "text-xl leading-7 text-ok-bright",
    active: "text-[28px] leading-9 text-ink",
    pending: "text-xl leading-7 text-ink-400",
};

/** One row of the onboarding timeline: status icon + connector rail + content. */
export default function StepRow({ state, title, subtitle, isLast = false, children }: StepRowProps) {
    return (
        <li
            aria-current={state === "active" ? "step" : undefined}
            className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-6"
        >
            <div className="flex flex-col items-center">
                <span
                    className={`mt-1 flex h-6 w-6 items-center justify-center ${state === "done" ? "text-ok-bright" : state === "active" ? "text-ink" : "text-ink-400"
                        }`}
                >
                    {state === "done" ? <CheckIcon /> : state === "active" ? <ArrowRightIcon /> : <DotIcon />}
                </span>
                {!isLast && <span aria-hidden="true" className="mt-2 w-px flex-1 bg-line-mid" />}
            </div>

            <div className={`flex min-w-0 flex-col gap-4 ${isLast ? "" : "pb-8"}`}>
                <div className="flex flex-col gap-1.5">
                    <h3 className={`font-semibold ${titleClasses[state]}`}>{title}</h3>
                    {subtitle ? <div className="text-base font-semibold leading-6 text-ink-700">{subtitle}</div> : null}
                </div>
                {children}
            </div>
        </li>
    );
}