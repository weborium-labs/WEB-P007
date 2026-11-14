import type { Task } from "../../types/types";
import SectionHeading from "./SectionHeading";
import TaskCard from "./TaskCard";
import ViewAllLink from "./ViewAllLink";

export default function TasksSection({ tasks }: { tasks: readonly Task[] }) {
    return (
        <section aria-labelledby="tasks-heading" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-2">
                <SectionHeading
                    id="tasks-heading"
                    title="Tasks Assigned"
                    subtitle="Your current workload and upcoming deadlines."
                />
                <ViewAllLink to="/tasks">View all Assigned Tasks</ViewAllLink>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,326px),326px))] gap-6">
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </ul>
        </section>
    );
}