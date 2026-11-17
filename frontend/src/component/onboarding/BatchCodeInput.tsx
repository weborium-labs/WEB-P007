import type { ChangeEvent } from "react";

interface BatchCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function BatchCodeInput({ value, onChange, disabled = false }: BatchCodeInputProps) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value.toUpperCase());

    return (
        <input
            type="text"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            maxLength={40}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="characters"
            aria-label="Batch code"
            placeholder="Enter batch code"
            className="h-14 w-full max-w-[380px] rounded-xl border-2 border-brand bg-surface px-4 font-inter text-base text-ink outline-none placeholder:text-ink-400 disabled:cursor-not-allowed disabled:border-line disabled:opacity-60"
        />
    );
}