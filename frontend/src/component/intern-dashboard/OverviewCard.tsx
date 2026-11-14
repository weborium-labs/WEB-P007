import type { OverviewStat } from "../../types/types";

export default function OverviewCard({ stat }: { stat: OverviewStat }) {
    const { label, value, suffix, suffixBold } = stat;
    return (
        <div className=" flex w-[250px] max-w-full shrink-0 flex-col items-start gap-4 overflow-hidden rounded-3xl border border-[#F1F3F6] bg-white px-8 pb-8 pt-[22px] shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]">
            <p className="text-xl font-semibold leading-7 text-[#98A2B3]">{label}</p>
            <p className="flex items-baseline gap-[3px] font-jetBrainsMono">
                <div className="font-jetbrains">
                    <span className="text-[56px] font-bold leading-[56px] text-[#101828]">{value}</span>
                    <span className={`text-base leading-6 text-[#475467] ${suffixBold ? "font-bold" : ""}`}>
                        {suffix}
                    </span>
                </div>
            </p>
        </div>
    );
}