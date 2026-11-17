import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Icon primitives for the shared UI kit.
 *
 * Same construction as `intern-dashboard/Icons` (single stroked path,
 * `currentColor`, `aria-hidden`) so new icons sit pixel-consistently next to
 * the existing set. Icons that already exist there (`ChevronDownIcon`,
 * `CheckIcon`, `CloseIcon`, `ArrowRightIcon`, `SpinnerIcon`) are reused
 * directly instead of being redefined here.
 */
const Base = ({
    d,
    size = 24,
    sw = 1.5,
    ...props
}: IconProps & { d: string; size?: number; sw?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        {...props}
    >
        <path
            d={d}
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/** Magnifier used by the search input. */
export const SearchIcon = (p: IconProps) => (
    <Base
        size={20}
        sw={1.5}
        d="M17.5 17.5L14 14M15.5 9.5C15.5 12.8137 12.8137 15.5 9.5 15.5C6.18629 15.5 3.5 12.8137 3.5 9.5C3.5 6.18629 6.18629 3.5 9.5 3.5C12.8137 3.5 15.5 6.18629 15.5 9.5Z"
        {...p}
    />
);

/** Back affordance for detail pages. */
export const ArrowLeftIcon = (p: IconProps) => (
    <Base d="M19 12H5M12 19L5 12L12 5" {...p} />
);

/** People, used by the sidebar entry and the dashboard CTA. */
export const UsersIcon = (p: IconProps) => (
    <Base
        d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H6C4.93913 15 3.92172 15.4214 3.17157 16.1716C2.42143 16.9217 2 17.9391 2 19V21M22 21V19C22 17.9391 21.5786 16.9217 20.8284 16.1716C20.0783 15.4214 19.0609 15 18 15M16 3.13C16.8604 3.36647 17.623 3.86318 18.1676 4.55378C18.7122 5.24438 19.0078 6.09354 19.0078 6.975C19.0078 7.85646 18.7122 8.70562 18.1676 9.39622C17.623 10.0868 16.8604 10.5835 16 10.82M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
        {...p}
    />
);

/** Chevron used where a control navigates (CTA rows). */
export const ChevronRightIcon = (p: IconProps) => (
    <Base size={20} sw={1.5} d="M9 5L16 12L9 19" {...p} />
);

/** Calendar, used for joined / date meta on the detail page. */
export const CalendarIcon = (p: IconProps) => (
    <Base
        size={20}
        sw={1.5}
        d="M8 2V6M16 2V6M3.5 10H20.5M5.5 4H18.5C19.6046 4 20.5 4.89543 20.5 6V20C20.5 21.1046 19.6046 22 18.5 22H5.5C4.39543 22 3.5 21.1046 3.5 20V6C3.5 4.89543 4.39543 4 5.5 4Z"
        {...p}
    />
);

/** Clock, used for last-login / last-activity meta. */
export const ClockIcon = (p: IconProps) => (
    <Base
        size={20}
        sw={1.5}
        d="M12 7V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        {...p}
    />
);

/** Shield, used for access / role meta. */
export const ShieldIcon = (p: IconProps) => (
    <Base
        size={20}
        sw={1.5}
        d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
        {...p}
    />
);
