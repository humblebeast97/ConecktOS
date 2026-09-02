import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "conecktos-theme";
const VALID: ThemeMode[] = ["light", "dark", "system"];

/**
 * Applies a theme choice to the document root. "system" clears the attribute
 * so the CSS `prefers-color-scheme` media query decides.
 * Safe to call in module scope (guards against SSR).
 */
export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

/** Reads the persisted preference. Defaults to "light" when nothing is saved
 * so new visitors land on the light palette; users who want system-following
 * explicitly opt into it. */
export function readSavedTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return (VALID as string[]).includes(raw ?? "") ? (raw as ThemeMode) : "light";
}

/**
 * Applies the saved preference immediately. Call once at boot before React
 * paints so users on Dark don't flash a Light frame first.
 */
export function bootTheme() {
  applyTheme(readSavedTheme());
}

/**
 * Hook: exposes the current mode, a setter that persists, and the effective
 * theme actually painted (useful for icon flips).
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => readSavedTheme());
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyTheme(next);
    if (typeof window === "undefined") return;
    if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const effective: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  return { mode, setMode, effective } as const;
}
