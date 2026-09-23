import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useStore } from "@/lib/store";
import { supabase, useSupabaseData } from "@/lib/supabase";
import type { Profile } from "@/lib/groompulse";

/**
 * Unified auth surface. In the default demo it wraps the mock store exactly as
 * before. When the app is opted into Supabase (VITE_DATA_SOURCE="supabase" +
 * credentials) it uses real Supabase Auth: session tracking, password/OAuth
 * sign-in, sign-up, password reset, and the caller's `profiles` row as
 * `currentUser`. Callers read `mode` to choose which methods to invoke; the
 * mock-only `signIn` and the Supabase-only async methods are each undefined in
 * the other mode.
 */
export type AuthMode = "mock" | "supabase";
export type OAuthProvider = "google";
type AuthResult = { error: string | null };

export interface AuthApi {
  mode: AuthMode;
  /** The signed-in person's profile, or null while loading / when signed out. */
  currentUser: Profile | null;
  isSignedIn: boolean;
  /** True while the session or the profile is still resolving (Supabase mode). */
  isLoading: boolean;
  signOut: () => void | Promise<void>;
  /** Mock demo helper: jump to a seeded user by id. Undefined in Supabase mode. */
  signIn?: (userId: string) => void;
  /** Supabase-only. Undefined in mock mode. */
  signInWithPassword?: (email: string, password: string) => Promise<AuthResult>;
  signUp?: (email: string, password: string) => Promise<AuthResult>;
  signInWithOAuth?: (provider: OAuthProvider) => Promise<AuthResult>;
  resetPassword?: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthApi | null>(null);

async function fetchMyProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  // Read own profile through profiles_secure so the base-table SELECT revoke on
  // sensitive columns does not block it; the view returns the caller's own
  // payout in full (see the 20260923120000_profiles_payout_privacy migration).
  const { data, error } = await supabase
    .from("profiles_secure")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // The mock surface is always available (this provider sits inside StoreProvider).
  const store = useStore();

  const [session, setSession] = useState<Session | null>(null);
  // In mock mode there is nothing to load, so the session is "resolved" at once.
  const [sessionLoaded, setSessionLoaded] = useState(!useSupabaseData);

  useEffect(() => {
    if (!useSupabaseData || !supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const profileQ = useQuery({
    queryKey: ["me", session?.user.id],
    queryFn: () => fetchMyProfile(session!.user.id),
    enabled: useSupabaseData && Boolean(session?.user.id),
  });

  let value: AuthApi;
  if (!useSupabaseData) {
    value = {
      mode: "mock",
      currentUser: store.currentUser,
      isSignedIn: store.isSignedIn,
      isLoading: false,
      signIn: store.signIn,
      signOut: store.signOut,
    };
  } else {
    value = {
      mode: "supabase",
      currentUser: profileQ.data ?? null,
      isSignedIn: Boolean(session),
      isLoading: !sessionLoaded || (Boolean(session) && profileQ.isLoading),
      signOut: async () => {
        await supabase?.auth.signOut();
      },
      signInWithPassword: async (email, password) => {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password) => {
        const { error } = await supabase!.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signInWithOAuth: async (provider) => {
        const { error } = await supabase!.auth.signInWithOAuth({
          provider,
          options:
            typeof window !== "undefined" ? { redirectTo: window.location.origin } : undefined,
        });
        return { error: error?.message ?? null };
      },
      resetPassword: async (email) => {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        });
        return { error: error?.message ?? null };
      },
    };
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Returns the signed-in profile, asserting it is present. Use inside components
 * that only ever render for an authenticated user (the portals + AppShell,
 * which sit behind AuthGate). In mock mode the store always resolves a profile,
 * so this never throws there either.
 */
export function useSessionUser(): Profile {
  const { currentUser } = useAuth();
  if (!currentUser) {
    throw new Error("useSessionUser must be used behind AuthGate (no authenticated profile).");
  }
  return currentUser;
}
