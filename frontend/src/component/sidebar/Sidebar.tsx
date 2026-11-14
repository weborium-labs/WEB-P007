import {
    memo,
    useCallback,
    useEffect,
    useLayoutEffect,
    useState,
    useSyncExternalStore,
    type ReactNode,
    type SVGProps,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/*  Visibility control                                                         */
/* -------------------------------------------------------------------------- */

const SIDEBAR_WIDTH = 272;
const COLLAPSED_WIDTH = 72;
const STORAGE_KEY = "sidebar-collapsed";

/** Exact-match routes where the sidebar is hidden. */
const HIDDEN_EXACT: readonly string[] = ["/"];
/** Prefix-match routes where the sidebar is hidden. */
const HIDDEN_PREFIXES: readonly string[] = ["/auth", "/terms-and-services"];

/** Tiny external store: counts mounted components that asked to hide the sidebar. */
let hideRequests = 0;
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
};
const getSnapshot = () => hideRequests > 0;
const emit = () => listeners.forEach((l) => l());

/**
 * Call inside any page to hide the global sidebar while it is mounted.
 * Usage: `useHideSidebar();` or `useHideSidebar(condition);`
 */
export function useHideSidebar(hidden: boolean = true): void {
    useEffect(() => {
        if (!hidden) return;
        hideRequests += 1;
        emit();
        return () => {
            hideRequests -= 1;
            emit();
        };
    }, [hidden]);
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                      */
/* -------------------------------------------------------------------------- */

type IconProps = SVGProps<SVGSVGElement>;

const StrokeIcon = ({ d, ...props }: IconProps & { d: string }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        {...props}
    >
        <path
            d={d}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const CollapseIcon = (p: IconProps) => (
    <StrokeIcon
        d="M15 3V21M10 15L7 12L10 9M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"
        {...p}
    />
);
const DashboardIcon = (p: IconProps) => (
    <StrokeIcon
        d="M4 3H9C9.55228 3 10 3.44772 10 4V11C10 11.5523 9.55228 12 9 12H4C3.44772 12 3 11.5523 3 11V4C3 3.44772 3.44772 3 4 3ZM15 3H20C20.5523 3 21 3.44772 21 4V7C21 7.55228 20.5523 8 20 8H15C14.4477 8 14 7.55228 14 7V4C14 3.44772 14.4477 3 15 3ZM15 12H20C20.5523 12 21 12.4477 21 13V20C21 20.5523 20.5523 21 20 21H15C14.4477 21 14 20.5523 14 20V13C14 12.4477 14.4477 12 15 12ZM4 16H9C9.55228 16 10 16.4477 10 17V20C10 20.5523 9.55228 21 9 21H4C3.44772 21 3 20.5523 3 20V17C3 16.4477 3.44772 16 4 16Z"
        {...p}
    />
);
const TeamsIcon = (p: IconProps) => (
    <StrokeIcon
        d="M17 21V20C17 19.4696 16.7893 18.9609 16.4142 18.5858C16.0391 18.2107 15.5304 18 15 18H9C8.46957 18 7.96086 18.2107 7.58579 18.5858C7.21071 18.9609 7 19.4696 7 20V21M19 10H20C20.5304 10 21.0391 10.2107 21.4142 10.5858C21.7893 10.9609 22 11.4696 22 12V13M5 10H4C3.46957 10 2.96086 10.2107 2.58579 10.5858C2.21071 10.9609 2 11.4696 2 12V13M15 11C15 12.6569 13.6569 14 12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11ZM20 4C20 5.10457 19.1046 6 18 6C16.8954 6 16 5.10457 16 4C16 2.89543 16.8954 2 18 2C19.1046 2 20 2.89543 20 4ZM8 4C8 5.10457 7.10457 6 6 6C4.89543 6 4 5.10457 4 4C4 2.89543 4.89543 2 6 2C7.10457 2 8 2.89543 8 4Z"
        {...p}
    />
);
const ChatsIcon = (p: IconProps) => (
    <StrokeIcon
        d="M2.992 16.3417C3.13904 16.7126 3.17177 17.119 3.086 17.5087L2.021 20.7987C1.98668 20.9655 1.99555 21.1384 2.04677 21.3008C2.09799 21.4633 2.18986 21.61 2.31366 21.727C2.43747 21.844 2.58911 21.9274 2.7542 21.9693C2.91929 22.0113 3.09236 22.0104 3.257 21.9667L6.67 20.9687C7.03771 20.8958 7.41852 20.9276 7.769 21.0607C9.90438 22.0579 12.3234 22.2689 14.5991 21.6564C16.8749 21.0439 18.8613 19.6473 20.2077 17.7131C21.5541 15.7788 22.1741 13.4311 21.9583 11.0842C21.7425 8.73738 20.7047 6.54216 19.0281 4.88589C17.3514 3.22962 15.1437 2.21873 12.7944 2.03159C10.4451 1.84445 8.10513 2.49308 6.18744 3.86303C4.26975 5.23299 2.89753 7.23624 2.31289 9.51933C1.72825 11.8024 1.96877 14.2186 2.992 16.3417Z"
        {...p}
    />
);
const TasksIcon = (p: IconProps) => (
    <StrokeIcon
        d="M8 2V6M12 2V6M16 2V6M8 10H14M8 14H16M8 18H13M6 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V6C4 4.89543 4.89543 4 6 4Z"
        {...p}
    />
);
const TicketsIcon = (p: IconProps) => (
    <StrokeIcon
        d="M3.1731 8.17976L14.1731 3.17976C14.6558 2.96068 15.2058 2.94221 15.7021 3.12841C16.1985 3.3146 16.6006 3.69024 16.8201 4.17276L18.5601 7.99976M6 10V8M6 14V15M6 19V21M4 8H20C21.1046 8 22 8.89543 22 10V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V10C2 8.89543 2.89543 8 4 8Z"
        {...p}
    />
);

const Logo = () => (
    <div className="relative h-4 w-[35px]" aria-hidden="true">
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-[19px] top-0 h-4 w-4"
        >
            <path
                d="M9.57469 0.0117222C9.83808 0.00129026 10.1284 0.00504791 10.3937 0.00844963C12.1593 0.0311925 13.9431 -0.0291633 15.7068 0.0196593C15.2679 0.869018 14.7573 1.7581 14.2995 2.60561L11.1466 8.46644L9.17037 12.166C8.81595 12.8373 7.91692 14.7416 7.45461 15.2033C6.73054 15.9261 5.60019 15.7469 4.66391 15.743C2.26166 15.7589 2.2785 15.6701 1.15723 13.5918L0 11.4494C0.292871 10.8537 0.734123 10.1084 1.05777 9.51264C1.56317 8.58177 2.08412 7.59097 2.61673 6.67924C2.88271 7.08729 3.26338 7.83537 3.51575 8.29052C4.40603 6.63376 5.30635 4.98234 6.21671 3.33643C6.52967 2.76824 6.86433 2.18214 7.16919 1.61163C7.72383 0.573393 8.3815 0.0816679 9.57469 0.0117222Z"
                fill="#101828"
            />
        </svg>
        <svg
            width="14"
            height="16"
            viewBox="0 0 14 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-2 top-0 h-4 w-[13px]"
        >
            <path
                d="M8.96546 0.000818369C9.64191 -0.0238036 9.97625 0.5114 10.2717 1.03439C11.1821 2.64745 12.2243 4.315 13.0459 5.97115C12.3594 7.26983 11.612 8.55882 10.9184 9.85707L9.4174 12.66C9.17766 13.1123 8.8579 13.6789 8.6457 14.1305C7.89907 15.7203 7.31508 15.7416 5.69013 15.7391L4.13308 15.7371L0 15.7381C0.502125 14.8387 1.00833 13.8182 1.49335 12.8991L5.52697 5.20878L6.84606 2.72277C7.21435 2.03566 7.55527 1.36442 8.01761 0.734649C8.31136 0.33451 8.44678 0.109025 8.96546 0.000818369Z"
                fill="#101828"
            />
        </svg>
        <svg
            width="12"
            height="15"
            viewBox="0 0 12 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-0 top-0 h-[15px] w-3"
        >
            <path
                d="M0.299934 0.0231717C1.73348 -0.0137936 3.54416 0.0909457 4.91593 0.0171447C7.97115 -0.147207 8.11986 0.867153 9.4164 3.18579L11.9456 7.73553C11.5902 8.39997 11.1653 9.06347 10.8065 9.72661C10.3023 10.6585 9.81206 11.6046 9.3204 12.5435L8.05004 14.9853C6.24985 11.581 4.422 8.19137 2.56671 4.8167C1.70079 3.22603 0.890374 1.64948 0 0.0632135C0.0830018 0.01465 0.194448 0.0264115 0.299934 0.0231717Z"
                fill="#101828"
            />
        </svg>
    </div>
);

/* -------------------------------------------------------------------------- */
/*  Navigation config                                                          */
/* -------------------------------------------------------------------------- */

interface NavItem {
    label: string;
    to: string;
    icon: (props: IconProps) => ReactNode;
}

const NAV_ITEMS: readonly NavItem[] = [
    { label: "Dashboard", to: "/dashboard", icon: DashboardIcon },
    { label: "Batches & Teams", to: "/batches-teams", icon: TeamsIcon },
    { label: "Chats", to: "/chats", icon: ChatsIcon },
    { label: "Tasks", to: "/tasks", icon: TasksIcon },
    { label: "Tickets", to: "/tickets", icon: TicketsIcon },
];

/* -------------------------------------------------------------------------- */
/*  Components                                                                 */
/* -------------------------------------------------------------------------- */

const SidebarLink = memo(function SidebarLink({
    item,
    collapsed,
}: {
    item: NavItem;
    collapsed: boolean;
}) {
    const Icon = item.icon;
    return (
        <li className="w-full">
            <NavLink
                to={item.to}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`flex h-10 w-full items-center rounded-md p-1.5 text-[#101828] outline-none transition-colors hover:bg-[#F1F3F6] focus-visible:ring-2 focus-visible:ring-[#101828]/30`}
            >
                <Icon className="h-6 w-6 shrink-0" />
                <span
                    aria-hidden={collapsed}
                    className={`overflow-hidden whitespace-nowrap font-inter text-base font-semibold leading-6 text-black transition-[max-width,opacity,margin] duration-300 ease-in-out motion-reduce:transition-none ${collapsed ? "ml-0 max-w-0 opacity-0" : "ml-2.5 max-w-[200px] opacity-100"
                        }`}
                >
                    {item.label}
                </span>
            </NavLink>
        </li>
    );
});

export default function Sidebar() {
    const { pathname } = useLocation();
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === "1";
        } catch {
            return false;
        }
    });

    const toggle = useCallback(() => {
        setCollapsed((c) => {
            const next = !c;
            try {
                localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
            } catch {
                /* ignore */
            }
            return next;
        });
    }, []);

    const width = collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;
    const forcedHidden = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const routeHidden =
        HIDDEN_EXACT.includes(pathname) ||
        HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    const hidden = forcedHidden || routeHidden;

    // Reserve space for the fixed sidebar so page content never sits underneath it.
    useLayoutEffect(() => {
        if (hidden) return;
        const prev = document.body.style.paddingLeft;
        const prevTransition = document.body.style.transition;
        document.body.style.transition = "padding-left 300ms ease-in-out";
        document.body.style.paddingLeft = `${width}px`;
        return () => {
            document.body.style.paddingLeft = prev;
            document.body.style.transition = prevTransition;
        };
    }, [hidden, width]);

    if (hidden) return null;

    return (
        <aside
            style={{ width }}
            className="fixed left-0 top-0 z-40 h-screen overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none border-r border-[#F1F3F6] bg-white px-4 py-8"
        >
            <div className="flex w-full flex-col items-start gap-9">
                <div
                    className={`flex items-center justify-between transition-[width] duration-300 ease-in-out motion-reduce:transition-none ${collapsed ? "w-10" : "w-60"}`}
                >
                    <Link
                        to="/dashboard"
                        aria-label="Home"
                        tabIndex={collapsed ? -1 : 0}
                        className={`flex h-10 items-center justify-center overflow-hidden rounded-md transition-[width,opacity] duration-300 ease-in-out motion-reduce:transition-none ${collapsed ? "pointer-events-none w-0 p-0 opacity-0" : "w-[39px] p-1.5 opacity-100"
                            }`}
                    >
                        <Logo />
                    </Link>
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-expanded={!collapsed}
                        className="flex h-10 w-10 items-center justify-center rounded-md p-1.5 text-[#101828] outline-none transition-colors hover:bg-[#F1F3F6] focus-visible:ring-2 focus-visible:ring-[#101828]/30"
                    >
                        <CollapseIcon className={`h-6 w-6 ${collapsed ? "rotate-180" : ""}`} />
                    </button>
                </div>

                <nav aria-label="Main" className="w-full">
                    <ul className="flex w-full flex-col items-start gap-2.5">
                        {NAV_ITEMS.map((item) => (
                            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
                        ))}
                    </ul>
                </nav>
            </div>
        </aside>
    );
}