import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/api";
import type { Role } from "@/lib/groompulse";

/** Where a signed-in user lands, by role. */
export function portalFor(role: Role): "/admin" | "/reception" | "/staff" {
  if (role === "owner") return "/admin";
  if (role === "staff") return "/staff";
  return "/reception";
}

// --- Sign-in tab vs. account role --------------------------------------------
// The login screen has Owner / Front desk / Staff tabs. Credentials must match
// the tab they were entered on: an owner account typed on the Staff tab is
// refused. We remember the tab across the sign-in (and the Google OAuth round
// trip) and /portal checks it against the real profile role once it loads.

const EXPECTED_ROLE_KEY = "conecktos-expected-role";
// A tab choice only counts for the sign-in it was made for.
const EXPECTED_ROLE_TTL_MS = 10 * 60 * 1000;

/** Record the sign-in tab just before signing in. */
export function setExpectedRole(tab: Role): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXPECTED_ROLE_KEY, JSON.stringify({ tab, at: Date.now() }));
  } catch {
    /* storage unavailable: the check is skipped, the role guards still apply */
  }
}

/** Forget the recorded tab (after a failed sign-in, or once it's been checked). */
export function clearExpectedRole(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(EXPECTED_ROLE_KEY);
  } catch {
    /* ignore */
  }
}

/** The recorded sign-in tab, or null if none / stale. */
export function readExpectedRole(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EXPECTED_ROLE_KEY);
    if (!raw) return null;
    const { tab, at } = JSON.parse(raw) as { tab: Role; at: number };
    if (Date.now() - at > EXPECTED_ROLE_TTL_MS) return null;
    return tab;
  } catch {
    return null;
  }
}

/** Does an account with `role` belong on the `tab` it signed in from? The Front
 * desk tab covers receptionists and managers (they share the /reception portal). */
export function roleMatchesTab(tab: Role, role: Role): boolean {
  if (tab === "receptionist" || tab === "manager") {
    return role === "receptionist" || role === "manager";
  }
  return tab === role;
}

/** User-facing tab name for the wrong-tab error, exactly as the login tabs read. */
export function tabLabel(tab: Role): string {
  if (tab === "owner") return "Owner";
  if (tab === "staff") return "Staff";
  return "Front desk";
}

/**
 * Bounce an already-signed-in user off a public / auth page (landing, login,
 * signup) into the app. Goes through /portal so the sign-in tab check runs and
 * the user lands on their own portal. Only in Supabase mode, where `isSignedIn`
 * reflects a real session; the mock store is always "signed in", so redirecting
 * there would break the demo.
 */
export function useRedirectSignedIn() {
  const { mode, isSignedIn, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode !== "supabase") return;
    if (isSignedIn && currentUser) {
      navigate({ to: "/portal", replace: true });
    }
  }, [mode, isSignedIn, currentUser, navigate]);
}
