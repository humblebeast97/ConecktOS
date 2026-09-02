import { ChevronDown } from "lucide-react";

/**
 * Footer for lists paginated with usePaginated(): a "Load more" button while
 * more items exist, or a quiet "end of list" divider when the caller opts in.
 */
export function LoadMore({
  hasMore,
  onLoadMore,
  shown,
  total,
}: {
  hasMore: boolean;
  onLoadMore: () => void;
  shown: number;
  total: number;
}) {
  if (hasMore) {
    return (
      <div className="flex items-center justify-between gap-3 px-1 pt-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          Showing {shown} of {total}
        </span>
        <button
          type="button"
          onClick={onLoadMore}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className="size-3.5" />
          Load more
        </button>
      </div>
    );
  }
  return null;
}
