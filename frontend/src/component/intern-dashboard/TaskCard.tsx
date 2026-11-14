import type { Task } from "../../types/types";
import Avatar from "./Avatar";

export default function TaskCard({ task }: { task: Task }) {
    const { title, assignee, team, start, end, urgent } = task;
    return (
        <li className="relative w-full max-w-[326px]">
            <article className="flex h-[152px] flex-col overflow-hidden rounded-2xl border border-[#F1F3F6] bg-white px-3 pb-3.5 pt-3 shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]">
                <h3 className="line-clamp-2 pr-1 text-xl font-semibold leading-7 text-[#101828]">{title}</h3>

                <div className="mx-[3px] mt-auto flex flex-col items-center gap-3 text-xs leading-4 text-[#101828]">
                    <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1">
                            <Avatar initials={assignee.initials} gradient="purple" size="xs" />
                            <span className="truncate">{assignee.name}</span>
                        </div>
                        <span className="shrink-0">{team}</span>
                    </div>
                    <div className="flex items-center gap-3 whitespace-nowrap">
                        <span>{start}</span>
                        <span aria-label="to">→</span>
                        <span>{end}</span>
                    </div>
                </div>
            </article>

            {urgent && (
                <span className="absolute -left-2 -top-2 z-10 flex items-center justify-center rounded-full bg-[#FECDCA] px-2 py-[3px] text-xs font-medium leading-4 text-[#B42318]">
                    Urgent
                </span>
            )}
        </li>
    );
}