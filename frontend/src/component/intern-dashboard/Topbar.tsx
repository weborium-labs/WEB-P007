import type { InternshipOption } from "../../types/types";
import InternshipSelector from "./InternshipSelector";
import StatusPill from "./StatusPill";

interface TopBarProps {
    options: readonly InternshipOption[];
    userInitials: string;
    status: string;
    onInternshipChange?: (option: InternshipOption) => void;
    onViewProfile?: () => void;
    onLogout?: () => void;
}

export default function TopBar({
    options,
    userInitials,
    status,
    onInternshipChange,
    onViewProfile,
    onLogout,
}: TopBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-6">
            <InternshipSelector options={options} onChange={onInternshipChange} />
            <StatusPill
                initials={userInitials}
                status={status}
                onViewProfile={onViewProfile}
                onLogout={onLogout}
            />
        </div>
    );
}
