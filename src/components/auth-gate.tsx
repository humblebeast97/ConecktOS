import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/**
 * Route-level auth gate for Supabase mode. It guarantees that protected portal
 * bodies only ever render once a real profile is loaded, so those components can
 * keep dereferencing `currentUser` directly. In the default mock mode this is a
 * pure pass-through and changes nothing.
 *
 * Protected areas: /admin, /reception, /staff, /settings. Everything else
 * (landing, /login, /signup, /join, /privacy, /terms, /tip) is public.
 */
const PROTECTED_PREFIXES = ["/admin", "/reception", "/staff", "/settings"];

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-6 text-center">{children}</div>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { mode, isSignedIn, isLoading, currentUser, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  useEffect(() => {
    if (mode !== "supabase") return;
    if (isProtected && !isLoading && !isSignedIn) {
      navigate({ to: "/login", replace: true });
    }
  }, [mode, isProtected, isLoading, isSignedIn, navigate]);

  if (mode !== "supabase") return <>{children}</>;

  if (isProtected) {
    if (isLoading || !isSignedIn) {
      return (
        <FullScreen>
          <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
        </FullScreen>
      );
    }
    if (!currentUser) {
      return (
        <FullScreen>
          <div className="max-w-sm space-y-3">
            <h1 className="font-display text-xl font-bold">We couldn&apos;t load your profile</h1>
            <p className="text-sm text-muted-foreground">
              Your account is signed in but has no workspace profile yet. Ask your admin to add you,
              or sign out and try a different account.
            </p>
            <Button onClick={() => void signOut?.()} className="font-semibold">
              Sign out
            </Button>
          </div>
        </FullScreen>
      );
    }
  }

  return <>{children}</>;
}
