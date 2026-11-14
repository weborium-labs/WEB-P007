import { useEffect, useId, useRef, useState } from "react";
import type { InternshipOption } from "../../types/types";
import { BatchIcon, ChevronDownIcon, InstituteIcon } from "../../component/intern-dashboard/Icons";

interface InternshipSelectorProps {
    options: readonly InternshipOption[];
    onChange?: (option: InternshipOption) => void;
}

function OptionLabel({ option }: { option: InternshipOption }) {
    return (
        <span className="flex items-center gap-6 p-1 text-[#101828]">
            <span className="flex items-center gap-2">
                <InstituteIcon className="size-6 shrink-0" />
                <span className="text-sm font-medium leading-5">{option.institute}</span>
            </span>
            <span className="flex items-center gap-2">
                <BatchIcon className="size-6 shrink-0" />
                <span className="whitespace-nowrap text-sm font-medium leading-5">{option.batch}</span>
            </span>
        </span>
    );
}

export default function InternshipSelector({ options, onChange }: InternshipSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(options[0]?.id);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    const selected = options.find((o) => o.id === selectedId) ?? options[0];

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    if (!selected) return null;

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((o) => !o)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#F1F3F6] bg-white p-2 outline-none focus-visible:ring-2 focus-visible:ring-[#101828]/30"
            >
                <OptionLabel option={selected} />
                <ChevronDownIcon
                    className={`size-5 shrink-0 text-[#667085] transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-[263px] max-w-[calc(100vw-32px)] flex-col gap-0.5 rounded-2xl border border-[#F1F3F6] bg-white p-3 shadow-[0_8px_24px_rgba(16,24,40,0.08)]"
                >
                    {options.map((option) => (
                        <li key={option.id} role="presentation">
                            <button
                                type="button"
                                role="option"
                                aria-selected={option.id === selected.id}
                                onClick={() => {
                                    setSelectedId(option.id);
                                    setOpen(false);
                                    onChange?.(option);
                                }}
                                className="flex w-full rounded-xl p-1.5 text-left outline-none transition-colors hover:bg-[#F1F3F6] focus-visible:ring-2 focus-visible:ring-[#101828]/30 aria-selected:bg-[#F1F3F6]"
                            >
                                <OptionLabel option={option} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}