const GRADIENTS = {
    blue: "bg-[linear-gradient(180deg,#B2DDFF_0%,#6B8599_100%)]",
    purple: "bg-[linear-gradient(180deg,#8A38F5_0%,#51218F_100%)]",
} as const;

const SIZES = {
    md: "size-8 text-sm leading-5",
    xs: "h-[13px] w-3 text-[5px] leading-[7.5px]",
} as const;

interface AvatarProps {
    initials: string;
    gradient?: keyof typeof GRADIENTS;
    size?: keyof typeof SIZES;
}

export default function Avatar({ initials, gradient = "blue", size = "md" }: AvatarProps) {
    return (
        <span
            aria-hidden="true"
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${GRADIENTS[gradient]} ${SIZES[size]}`}
        >
            {initials}
        </span>
    );
}