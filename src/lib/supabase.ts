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
