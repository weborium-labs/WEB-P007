import { useId } from "react";

import { CloseIcon } from "../intern-dashboard/Icons";
import { SearchIcon } from "./icons";

/** Mirrors the backend's `USER_SEARCH_MAX_LENGTH` so input can never over-run. */
const MAX_SEARCH_LENGTH = 100;

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

/**
 * Search box styled with the app's canonical input treatment
 * (`h-[46px] rounded-xl … focus:ring-brand/10`), with an inline leading
 * icon and a one-click clear affordance.
 */
export default function SearchInput({
    value,
    onChange,
    placeholder = "Search…",
    label = "Search",
    className = "",
}: SearchInputProps) {
    const id = useId();

    return (
        <div className={`relative min-w-0 ${className}`}>
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
            <input
                id={id}
                type="search"
                value={value}
                maxLength={MAX_SEARCH_LENGTH}
                placeholder={placeholder}
                autoComplete="off"
                onChange={(event) => onChange(event.target.value)}
                className="h-[46px] w-full rounded-xl border border-grey-100 bg-surface pl-11 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-ink-400 focus:border-brand focus:ring-4 focus:ring-brand/10 [&::-webkit-search-cancel-button]:hidden"
            />
            {value.length > 0 && (
                <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => onChange("")}
                    className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 outline-none transition-colors hover:bg-grey-50 hover:text-ink focus-visible:ring-2 focus-visible:ring-ink/30"
                >
                    <CloseIcon className="size-4" />
                </button>
            )}
        </div>
    );
}
