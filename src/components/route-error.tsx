import { AlertTriangle, RotateCcw } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/**
 * In-content error card for per-route errorComponent. Shows the message,
 * a retry (re-invalidates the route), and a "back home" escape hatch. Small
 * enough to render inside the app shell so the header + nav stay visible.
 */
export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <section className="card-lux mx-auto my-10 max-w-lg rounded-2xl p-6 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold">This screen didn't load</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {error.message || "Something went wrong rendering this page."}
      </p>
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
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </section>
  );
}
