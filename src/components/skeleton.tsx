import { cn } from "@/lib/utils";

/**
 * Placeholder block for loading states — a subtle pulsing surface that matches
 * the app's card tone in both themes. Size + rounding come from the caller
 * (className), so it fits table cells, avatars, hero areas etc.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-surface/60", className)} />
  );
}
