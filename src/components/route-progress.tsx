import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * A 2px indeterminate bar that appears at the very top of the page while
 * the router is loading a new route. Silent today (mock store is
 * synchronous), correct the moment routes start suspending on real data
 * in Phase 1. Includes a 120ms grace period so instant transitions don't
 * flicker.
 */
export function RouteProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 120);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20"
    >
      <div className="h-full w-1/3 animate-[route-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}
