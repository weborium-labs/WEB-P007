import { create } from "zustand";

/**
 * Light/dark theme state.
 *
 * - The stored choice persists in `localStorage` (`ims-theme`).
 * - With no stored choice the OS preference (`prefers-color-scheme`) wins and
 *   keeps being followed until the user picks a mode explicitly.
 * - The `<html class="dark">` flip is the single switch every color token in
 *   `index.css` reacts to; `theme-fade` temporarily animates that flip so the
 *   change reads as a smooth cross-fade rather than a snap.
 *
 * `index.html` runs the same resolution inline before React mounts so the
 * first paint is already in the right theme (no flash).
 */

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "ims-theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";
/** Length of the cross-fade; must match the `theme-fade` rule in index.css. */
const FADE_MS = 420;

const readStoredMode = (): ThemeMode | null => {
    try {
        const value = window.localStorage.getItem(THEME_STORAGE_KEY);
        return value === "light" || value === "dark" ? value : null;
    } catch {
        return null;
    }
};

export const systemMode = (): ThemeMode => {
    if (typeof window === "undefined" || !window.matchMedia) return "light";
    return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
};

/** Stored choice if the user made one, otherwise the OS preference. */
export const resolveInitialMode = (): ThemeMode => readStoredMode() ?? systemMode();

/** True while no explicit choice exists, i.e. the OS preference still drives us. */
export const followsSystem = (): boolean => readStoredMode() === null;

export const applyTheme = (mode: ThemeMode): void => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    root.style.colorScheme = mode;
};

/** Cross-fade the upcoming token flip instead of snapping between themes. */
const startThemeFade = (): void => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    root.classList.add("theme-fade");
    window.setTimeout(() => root.classList.remove("theme-fade"), FADE_MS);
};

const persist = (mode: ThemeMode): void => {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
        /* storage can be unavailable (private mode) — theme still applies */
    }
};

/** Adopt the OS theme without writing an explicit choice. */
export const syncModeFromSystem = (): void => {
    const mode = systemMode();
    applyTheme(mode);
    useThemeStore.setState({ mode });
};

interface ThemeState {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    mode: resolveInitialMode(),

    setMode: (mode) => {
        if (get().mode !== mode) startThemeFade();
        persist(mode);
        applyTheme(mode);
        set({ mode });
    },

    toggle: () => {
        get().setMode(get().mode === "dark" ? "light" : "dark");
    },
}));
