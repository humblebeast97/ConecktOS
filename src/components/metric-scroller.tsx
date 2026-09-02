import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

interface MetricTile {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<LucideProps>;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}

/**
 * Horizontal-scroll strip of small metric tiles. Replaces the tall stacked
 * MetricCard grid on mobile so the secondary numbers stay glanceable without
 * pushing everything else below the fold.
 */
export function MetricScroller({ items }: { items: MetricTile[] }) {
  return (
    <div
      className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style>{`.metric-scroller::-webkit-scrollbar { display: none; }`}</style>
      {items.map((item) => {
        const Icon = item.icon;
        const valueColor =
          item.tone === "primary"
            ? "text-primary"
            : item.tone === "success"
              ? "text-success"
              : item.tone === "warning"
                ? "text-warning"
                : item.tone === "danger"
                  ? "text-destructive"
                  : "text-foreground";
        return (
          <div
            key={item.key}
            className="glass min-w-[9.5rem] shrink-0 snap-start rounded-2xl p-3.5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {item.label}
              </p>
              {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
            </div>
            <p
              className={`mt-1 font-display text-[17px] font-bold leading-tight tracking-tight tabular-nums ${valueColor}`}
            >
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{item.hint}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
