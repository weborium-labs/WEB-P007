interface SalutationProps {
    name: string;
}

export default function Salutation({ name }: SalutationProps) {
    return (
        <div className="flex min-w-0 flex-col items-start gap-1.5">
            <h1 className="break-words text-[40px] font-bold leading-[48px] text-[#101828]">
                Glad to see you, {name}
            </h1>
            <p className="text-lg font-semibold leading-7 text-[#344054]">Your internship at a glance.</p>
        </div>
    );
}