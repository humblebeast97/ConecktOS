import { useEffect, useMemo, useState } from "react";

/**
 * Keyset-style "Load more" pagination over an in-memory list.
 *
 * Returns the first `pageSize` items, and grows in `pageSize` chunks each time
 * `loadMore()` is called. If the source list shrinks below the current cap
 * (e.g. after a filter change), the visible count is trimmed back down.
 */
export function usePaginated<T>(list: readonly T[], pageSize = 10) {
  const [visible, setVisible] = useState(pageSize);

  // Shrink when the source shrinks (filter/search narrowed it) so we don't keep
  // an artificially high cap between renders.
  useEffect(() => {
    setVisible((v) => Math.min(Math.max(v, pageSize), Math.max(list.length, pageSize)));
  }, [list.length, pageSize]);

  const items = useMemo(() => list.slice(0, visible), [list, visible]);
  const hasMore = list.length > visible;

  return {
    items,
    hasMore,
    loadMore: () => setVisible((v) => v + pageSize),
    reset: () => setVisible(pageSize),
    total: list.length,
    shown: items.length,
  };
}
