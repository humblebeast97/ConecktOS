import { AlertTriangle, RotateCcw } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/api";
import type { Role } from "@/lib/groompulse";

interface RoleCopy {
  headline: string;
  body: string;
  homeLabel: string;
  homeTo: "/admin" | "/reception" | "/staff" | "/";
}

const COPY: Record<Role, RoleCopy> = {
  owner: {
    headline: "This report didn't load",
    body: "The dashboard hit a snag. Retry once, or head back to the overview.",
    homeLabel: "Back to dashboard",
    homeTo: "/admin",
  },
  manager: {
    headline: "This screen didn't load",
    body: "Something went wrong. Retry, or step back to the front-desk view.",
    homeLabel: "Back to front desk",
    homeTo: "/reception",
  },
  receptionist: {
    headline: "This screen didn't load",
    body: "The front desk stalled. Retry the page, or head back to today's tickets.",
    homeLabel: "Back to tickets",
    homeTo: "/reception",
  },
  staff: {
    headline: "Your screen didn't load",
    body: "Give it another try, or head back to your shift view.",
    homeLabel: "Back to today",
    homeTo: "/staff",
  },
};

const DEFAULT_COPY: RoleCopy = {
  headline: "This screen didn't load",
  body: "Something went wrong rendering this page.",
  homeLabel: "Go home",
  homeTo: "/",
};

/**
 * In-content error card for per-route errorComponent. Copy tailors to the
 * signed-in role so the "go home" fallback lands on their actual portal
 * instead of dumping everyone back at the sign-in screen.
 */
export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const copy = currentUser ? (COPY[currentUser.role] ?? DEFAULT_COPY) : DEFAULT_COPY;
  return (
    <section className="card-lux mx-auto my-10 max-w-lg rounded-2xl p-6 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold">{copy.headline}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{error.message || copy.body}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link to={copy.homeTo}>{copy.homeLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
