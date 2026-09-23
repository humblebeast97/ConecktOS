import { useNavigate } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/api";
import { homePortalFor } from "@/lib/access";
import { roleLabel, type Role } from "@/lib/groompulse";

/**
 * Shown when a signed-in user opens a screen their role can't access. We do not
 * auto-redirect: the user sees a clear explanation and chooses to go back to
 * their own dashboard. Paired with the error toast from useRoleGuard.
 */
export function AccessDenied({ allowed }: { allowed: readonly Role[] }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const role = currentUser?.role ?? null;
  const allowedLabels = allowed.map((r) => roleLabel[r]).join(", ");

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="glass w-full max-w-md rounded-3xl p-6 text-center sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldX className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {role ? <>You're signed in as {roleLabel[role]}. </> : null}
          This screen is only available to {allowedLabels}. If you think this is a mistake, contact
          your business owner.
        </p>
        {role ? (
          <Button
            className="mt-6 h-11 w-full font-semibold"
            onClick={() => navigate({ to: homePortalFor(role), replace: true })}
          >
            Go to my dashboard
          </Button>
        ) : null}
      </div>
    </div>
  );
}
