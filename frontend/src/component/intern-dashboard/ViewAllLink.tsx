import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRightIcon } from "../intern-dashboard/Icons";

interface ViewAllLinkProps {
    to: string;
    children: ReactNode;
}

export default function ViewAllLink({ to, children }: ViewAllLinkProps) {
    return (
        <Link
            to={to}
            className="inline-flex w-fit items-center justify-center gap-2 text-nowrap rounded-xl px-6 py-3 text-base font-semibold leading-6 text-ink outline-none transition-colors hover:bg-grey-50 focus-visible:ring-2 focus-visible:ring-ink/30"
        >
            {children}
            <ArrowUpRightIcon className="size-6 shrink-0" />
        </Link>
    );
}