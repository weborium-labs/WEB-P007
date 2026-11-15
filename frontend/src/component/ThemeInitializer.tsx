import { useEffect, type ReactNode } from "react";

import {
    applyTheme,
    followsSystem,
    syncModeFromSystem,
    useThemeStore,
} from "../store/theme.store";

/**
 * Applies the resolved theme before the first paint of any route and keeps
 * following the OS light/dark preference while the user has not chosen a mode
 * themselves. Once they toggle explicitly, the stored choice wins from then on.
 */
export function ThemeInitializer({ children }: { children: ReactNode }) {
    useEffect(() => {
        applyTheme(useThemeStore.getState().mode);

        if (!followsSystem() || !window.matchMedia) return;

        const query = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => syncModeFromSystem();
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }, []);

    return children;
}
