import type { OverviewStat } from "../../types/types";
import OverviewCard from "./OverviewCard";

export default function OverviewStats({ stats }: { stats: readonly OverviewStat[] }) {
    return (
        <section aria-label="Overview" className="flex flex-wrap items-center gap-6">
            {stats.map((stat) => (
                <OverviewCard key={stat.id} stat={stat} />
            ))}
        </section>
    );
}