import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api";
import { roleLabel, type Role } from "./groompulse";

/** Where each role's own portal lives. Used by the access-denied screen's
 * "Go to my dashboard" action (the user chooses to leave; we never auto-bounce). */
export function homePortalFor(role: Role): "/admin" | "/reception" | "/staff" {
  if (role === "owner") return "/admin";
  if (role === "manager" || role === "receptionist") return "/reception";
  return "/staff";
}

/**
 * Client-side role gate for the mock/demo. Pass a *stable* (module-level) list
 * of roles allowed on the screen. Returns whether the signed-in user is allowed.
 * When they are not, it raises an error toast once and the caller renders the
 * <AccessDenied> screen instead of the protected content. It does NOT redirect,
 * so the user sees a clear "access denied" message rather than being silently
 * bounced. Demo-grade RBAC; real enforcement is server auth + RLS.
 */
export function useRoleGuard(allowed: readonly Role[]): boolean {
  const { currentUser } = useAuth();
  const denied = currentUser ? !allowed.includes(currentUser.role) : false;
  const notified = useRef(false);

  useEffect(() => {
    if (denied && currentUser && !notified.current) {
      notified.current = true;
      toast.error("Access denied", {
        description: `This screen isn't available for your role (${roleLabel[currentUser.role]}).`,
      });
    }
    if (!denied) notified.current = false;
  }, [denied, currentUser]);

  return !denied;
}
