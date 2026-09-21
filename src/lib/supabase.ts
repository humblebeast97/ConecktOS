import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client + data-source switch for the Phase 1 backend migration.
 *
 * The app still ships on the in-memory mock store (src/lib/store.tsx). Real
 * Supabase reads are wired in src/api but stay OFF until you explicitly opt in
 * with VITE_DATA_SOURCE="supabase" AND the URL + key are present. Merely having
 * keys in .env does not flip the app, so the working demo is never disturbed by
 * an empty or half-migrated database. Flip the flag once the schema (see
 * supabase/migrations) is applied and auth is wired.
 */

const url = import.meta.env["VITE_SUPABASE_URL"] ?? "";
const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
const dataSource = (import.meta.env["VITE_DATA_SOURCE"] ?? "mock").toLowerCase();

/** True only when the developer has opted into Supabase AND credentials exist. */
export const useSupabaseData = dataSource === "supabase" && Boolean(url) && Boolean(publishableKey);

let client: SupabaseClient | null = null;

// "Remember me" backing: the choice itself lives in localStorage so it survives
// reloads and the OAuth round-trip, and it decides WHERE the auth token is kept.
// Remembered -> localStorage (survives closing the app). Not remembered ->
// sessionStorage (dropped when the tab/app is closed, so the next launch asks
// the user to sign in again).
const REMEMBER_KEY = "conecktos-remember";

function rememberChoice(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

/** Record the "Remember me" choice. Call this before a sign-in so the session
 * token lands in the right store. */
export function setRememberMe(remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    /* storage unavailable (private mode): fall back to default persistence */
  }
}

// Storage adapter that routes the Supabase session to local- or sessionStorage
// per the current "Remember me" choice. Reads check both so an existing session
// is always found; writes go to the chosen store and clear the other to avoid a
// stale token resurrecting a "not remembered" login.
const rememberAwareStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      const remember = rememberChoice();
      const primary = remember ? window.localStorage : window.sessionStorage;
      const other = remember ? window.sessionStorage : window.localStorage;
      primary.setItem(key, value);
      other.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/**
 * The shared Supabase client, or null when credentials are absent. Session
 * persistence is browser-only so SSR (the Cloudflare Worker) never touches
 * localStorage.
 */
export const supabase: SupabaseClient | null =
  url && publishableKey
    ? (client ??= createClient(url, publishableKey, {
        auth: {
          persistSession: typeof window !== "undefined",
          autoRefreshToken: typeof window !== "undefined",
          detectSessionInUrl: typeof window !== "undefined",
          ...(typeof window !== "undefined" ? { storage: rememberAwareStorage } : {}),
        },
      }))
    : null;

/** Narrowing helper for call sites that require a configured client. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return supabase;
}
