import { useEffect, useId, useRef, useState, type SVGProps } from "react";
import Avatar from "./Avatar";
import { InfoIcon } from "../intern-dashboard/Icons";

interface StatusPillProps {
    initials: string;
    status: string;
    onViewProfile?: () => void;
    onViewSessions?: () => void;
    onLogout?: () => void;
    onLogoutAll?: () => void;
}

const MenuIcon = ({ d, ...props }: SVGProps<SVGSVGElement> & { d: string }) => (
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
        <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ProfileIcon = (p: SVGProps<SVGSVGElement>) => (
    <MenuIcon
        d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
        {...p}
    />
);

const SessionsIcon = (p: SVGProps<SVGSVGElement>) => (
    <MenuIcon
        d="M8 21H16M12 17V21M5 3H19C20.1046 3 21 3.89543 21 5V15C21 16.1046 20.1046 17 19 17H5C3.89543 17 3 16.1046 3 15V5C3 3.89543 3.89543 3 5 3Z"
        {...p}
    />
);

const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
    <MenuIcon
        d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
        {...p}
    />
);

const LogoutAllIcon = (p: SVGProps<SVGSVGElement>) => (
    <MenuIcon
        d="M12 8V12M12 16H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81442 19.9905C1.98733 20.2939 2.23672 20.5467 2.53771 20.7239C2.83869 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0127 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z"
        {...p}
    />
);

const itemClass =
    "flex w-full rounded-xl p-1.5 text-left outline-none transition-colors hover:bg-[#F1F3F6] focus-visible:ring-2 focus-visible:ring-[#101828]/30";

interface MenuItemProps {
    icon: (p: SVGProps<SVGSVGElement>) => JSX.Element;
    label: string;
    onSelect: () => void;
}

function MenuItem({ icon: Icon, label, onSelect }: MenuItemProps) {
    return (
        <button type="button" role="menuitem" onClick={onSelect} className={itemClass}>
            <span className="flex items-center gap-2 p-1 text-[#101828]">
                <Icon className="size-6 shrink-0" />
                <span className="whitespace-nowrap text-sm font-medium leading-5">{label}</span>
            </span>
        </button>
    );
}

export default function StatusPill({
    initials,
    status,
    onViewProfile,
    onViewSessions,
    onLogout,
    onLogoutAll,
}: StatusPillProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

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

    const select = (cb?: () => void) => () => {
        setOpen(false);
        cb?.();
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((o) => !o)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#F1F3F6] bg-white p-2 outline-none focus-visible:ring-2 focus-visible:ring-[#101828]/30"
            >
                <Avatar initials={initials} />
                <span className="flex items-center">
                    <span className="text-sm font-medium leading-5 text-[#2563EB]">{status}</span>
                    <span aria-hidden="true" className="flex size-6 items-center justify-center">
                        <span className="size-1.5 rounded-full bg-[linear-gradient(180deg,#2563EB_0%,#1E40AF_100%)]" />
                    </span>
                </span>
                <InfoIcon className="size-5 shrink-0 text-[#667085]" />
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-[256px] max-w-[calc(100vw-32px)] flex-col gap-0.5 rounded-2xl border border-[#F1F3F6] bg-white p-3 shadow-[0_8px_24px_rgba(16,24,40,0.08)]"
                >
                    <MenuItem icon={ProfileIcon} label="Your Profile" onSelect={select(onViewProfile)} />
                    <MenuItem icon={SessionsIcon} label="Active Sessions" onSelect={select(onViewSessions)} />
                    <MenuItem icon={LogoutIcon} label="Log Out" onSelect={select(onLogout)} />
                    {/* <MenuItem icon={LogoutAllIcon} label="Log out from all devices" onSelect={select(onLogoutAll)} /> */}
                </div>
            )}
        </div>
    );
}