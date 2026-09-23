import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/api";
import { roleLabel } from "@/lib/groompulse";
import {
  clearExpectedRole,
  clearLoginEmail,
  portalFor,
  readExpectedRole,
  roleMatchesTab,
  tabLabel,
} from "@/lib/use-portal-redirect";

export const Route = createFileRoute("/portal")({
  component: PortalEntry,
});

/**
 * Neutral post-sign-in entry point. Sign-in, sign-up, join, the landing page
 * and the PWA boot script all send users here instead of guessing a portal.
 *
 * 1. If the user just signed in from a role tab (Owner / Front desk / Staff),
 *    their account's real role must match that tab. If it doesn't, they are
 *    signed straight back out with an error: owner credentials don't work on
 *    the Staff tab, and so on.
 * 2. Otherwise it forwards each role to its own dashboard.
 *
 * AuthGate protects this route, so a signed-in user without a profile sees
 * onboarding and a signed-out user goes to /login.
 */
function PortalEntry() {
  const { currentUser, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (isLoading || handled.current) return;
    handled.current = true;

    if (!currentUser) {
      navigate({ to: "/login", replace: true });
      return;
    }

    const tab = readExpectedRole();
    clearExpectedRole();
    if (tab && !roleMatchesTab(tab, currentUser.role)) {
      toast.error("Wrong sign-in tab for this account", {
        description: `These are ${roleLabel[currentUser.role]} credentials, so they can't sign in on the ${tabLabel(tab)} tab. Pick the ${tabLabel(currentUser.role)} tab and try again.`,
      });
      // The typed email is kept, so the login screen refills it.
      void Promise.resolve(signOut()).finally(() => navigate({ to: "/login", replace: true }));
      return;
    }

    clearLoginEmail();
    navigate({ to: portalFor(currentUser.role), replace: true });
  }, [currentUser, isLoading, navigate, signOut]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
    </div>
  );
}
