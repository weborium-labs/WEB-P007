interface SalutationProps {
    name: string;
}

export default function Salutation({ name }: SalutationProps) {
    return (
        <div className="flex min-w-0 flex-col items-start gap-1.5">
            <h1 className="break-words text-[40px] font-bold leading-[48px] text-ink">
                Glad to see you, {name}
            </h1>
            <p className="text-lg font-semibold leading-7 text-ink-800">Your internship at a glance.</p>
        </div>
    );
}