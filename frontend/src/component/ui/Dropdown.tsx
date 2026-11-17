import { useEffect, useId, useRef, useState } from "react";

import { CheckIcon, ChevronDownIcon } from "../intern-dashboard/Icons";

export interface DropdownOption<T extends string> {
    value: T;
    label: string;
    disabled?: boolean;
}

interface DropdownProps<T extends string> {
    value: T;
    options: ReadonlyArray<DropdownOption<T>>;
    onChange: (value: T) => void;
    /** Accessible name for the trigger button. */
    label: string;
    align?: "left" | "right";
    size?: "sm" | "md";
    disabled?: boolean;
    triggerClassName?: string;
}

const TRIGGER_SIZES = {
    sm: "min-h-9 rounded-lg px-3 text-sm",
    md: "min-h-[46px] rounded-xl px-4 text-sm",
} as const;

/**
 * Generic menu-button dropdown.
 *
 * Same interaction contract as the existing top-bar menus (outside-click and
 * Escape close, `role="menu"` + `menuitemradio` items, current value
 * check-marked) so every dropdown in the app behaves identically. Used for
 * filters, sorting and role selection.
 */
export default function Dropdown<T extends string>({
    value,
    options,
    onChange,
    label,
    align = "left",
    size = "sm",
    disabled = false,
    triggerClassName = "",
}: DropdownProps<T>) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const selected =
        options.find((option) => option.value === value) ?? options[0];

    const select = (option: DropdownOption<T>) => {
        setOpen(false);
        if (option.value !== value) onChange(option.value);
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={label}
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={[
                    "flex w-full items-center justify-between gap-2 border",
                    "border-grey-100 bg-surface text-ink outline-none transition-colors",
                    "focus-visible:ring-4 focus-visible:ring-brand/10",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    "hover:border-line",
                    TRIGGER_SIZES[size],
                    triggerClassName,
                ].join(" ")}
            >
                <span className="truncate">{selected?.label}</span>
                <ChevronDownIcon
                    className={`size-4 shrink-0 text-ink-400 transition-transform duration-150 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label={label}
                    className={[
                        "absolute z-30 mt-1.5 flex min-w-[184px] flex-col gap-0.5",
                        "rounded-2xl border border-grey-50 bg-surface p-1.5",
                        "shadow-[0_8px_24px_rgba(16,24,40,0.08)] dark:shadow-black/50",
                        "max-w-[calc(100vw-32px)]",
                        align === "right" ? "right-0" : "left-0",
                    ].join(" ")}
                >
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isSelected}
                                disabled={option.disabled}
                                onClick={() => select(option)}
                                className={[
                                    "flex w-full items-center justify-between gap-3 rounded-xl",
                                    "p-1.5 text-left text-sm font-medium leading-5 text-ink",
                                    "outline-none transition-colors hover:bg-grey-50",
                                    "focus-visible:ring-2 focus-visible:ring-ink/30",
                                    "disabled:cursor-not-allowed disabled:opacity-50",
                                    isSelected ? "bg-grey-25" : "",
                                ].join(" ")}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected && (
                                    <CheckIcon className="size-4 shrink-0 text-brand" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
