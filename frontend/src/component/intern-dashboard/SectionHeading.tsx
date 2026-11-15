interface SectionHeadingProps {
    id?: string;
    title: string;
    subtitle: string;
}

export default function SectionHeading({ id, title, subtitle }: SectionHeadingProps) {
    return (
        <div className="flex flex-col items-start gap-1.5">
            <h2 id={id} className="text-[28px] font-semibold leading-9 text-ink">
                {title}
            </h2>
            <p className="text-base font-semibold leading-6 text-ink-700">{subtitle}</p>
        </div>
    );
}