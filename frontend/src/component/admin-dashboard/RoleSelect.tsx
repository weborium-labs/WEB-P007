import Dropdown from "../ui/Dropdown";
import { ROLE_OPTIONS } from "../../data/admin.data";
import type { UserRole } from "../../lib/admin.schemas";

interface RoleSelectProps {
    value: UserRole;
    onChange: (role: UserRole) => void;
    /** Accessible label; defaults to a generic "Change role". */
    label?: string;
    align?: "left" | "right";
    size?: "sm" | "md";
    disabled?: boolean;
    triggerClassName?: string;
}

/**
 * Role picker backed by the shared `Dropdown`.
 *
 * Lives in one place so the table row and the detail page can never drift
 * apart in options, labels or behaviour.
 */
export default function RoleSelect({
    value,
    onChange,
    label = "Change role",
    align = "left",
    size = "sm",
    disabled = false,
    triggerClassName = "",
}: RoleSelectProps) {
    return (
        <Dropdown
            value={value}
            options={ROLE_OPTIONS}
            onChange={onChange}
            label={label}
            align={align}
            size={size}
            disabled={disabled}
            triggerClassName={triggerClassName}
        />
    );
}
