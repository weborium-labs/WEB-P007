import { useEffect, useId, useRef, useState, type ReactElement, type SVGProps } from "react";
import Avatar from "./Avatar";
import { InfoIcon } from "../intern-dashboard/Icons";

interface StatusPillProps {
    initials: string;
    status: string;
    onViewProfile?: () => void;
    onLogout?: () => void;
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

const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
    <MenuIcon
        d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
        {...p}
    />
);

const itemClass =
    "flex w-full rounded-xl p-1.5 text-left outline-none transition-colors hover:bg-[#F1F3F6] focus-visible:ring-2 focus-visible:ring-[#101828]/30";

interface MenuItemProps {
    icon: (p: SVGProps<SVGSVGElement>) => ReactElement;
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
    onLogout,
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
                    {/* "Active Sessions" is intentionally not rendered: sessions are
                        stateless refresh JWTs today, so there is no session inventory
                        to show. Re-enable together with server-side session tracking. */}
                    <MenuItem icon={LogoutIcon} label="Log Out" onSelect={select(onLogout)} />
                    {/* "Log out from all devices" is intentionally disabled: refresh
                        sessions are stateless JWTs, so global revocation requires
                        server-side session tracking first (documented limitation).
                        Re-enable together with that backend work. */}
                </div>
            )}
        </div>
    );
}