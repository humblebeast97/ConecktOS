import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/api";
import { roleLabel, type Role } from "./groompulse";

/** Where each role lands when they hit a screen they're not allowed to see. */
function homePortalFor(role: Role): string {
  if (role === "owner") return "/admin";
  if (role === "manager" || role === "receptionist") return "/reception";
  return "/staff";
}

/**
 * Client-side role guard for the mock/demo. Pass a *stable* (module-level) list
 * of roles allowed on the screen; anyone else is redirected to their own portal.
 * This is demo-grade RBAC — real enforcement lands with server auth + RLS.
 */
export function useRoleGuard(allowed: readonly Role[]) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && !allowed.includes(currentUser.role)) {
      toast.error("You don't have access to that screen", {
        description: `Signed in as ${roleLabel[currentUser.role]}. Redirected to your own portal.`,
      });
      navigate({ to: homePortalFor(currentUser.role), replace: true });
    }
  }, [currentUser, allowed, navigate]);
}
