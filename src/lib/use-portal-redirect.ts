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

/**
 * Bounce an already-signed-in user off a public / auth page (landing, login,
 * signup) to their portal, so they never see the marketing or sign-in screens
 * again. Only in Supabase mode, where `isSignedIn` reflects a real session; the
 * mock store is always "signed in", so redirecting there would break the demo.
 */
export function useRedirectSignedIn() {
  const { mode, isSignedIn, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode !== "supabase") return;
    if (isSignedIn && currentUser) {
      navigate({ to: portalFor(currentUser.role), replace: true });
    }
  }, [mode, isSignedIn, currentUser, navigate]);
}
