import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/api";
import { portalFor } from "@/lib/use-portal-redirect";

export const Route = createFileRoute("/portal")({
  component: PortalEntry,
});

/**
 * Neutral post-sign-in entry point. Sign-in, sign-up, join, the landing page
 * and the PWA boot script all send users here instead of guessing a portal.
 * It forwards each role to its own dashboard. This is app-initiated routing,
 * not a denial: a user who opens a portal their role can't use still gets the
 * Access denied screen. AuthGate protects this route, so a signed-in user
 * without a profile sees onboarding and a signed-out user goes to /login.
 */
function PortalEntry() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate({ to: currentUser ? portalFor(currentUser.role) : "/login", replace: true });
  }, [currentUser, isLoading, navigate]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
    </div>
  );
}
