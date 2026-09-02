import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

export interface BottomNavItem {
  key: string;
  label: string;
  icon: ComponentType<LucideProps>;
  onClick: () => void;
}

interface Props {
  items: BottomNavItem[];
  activeKey: string;
  /** Optional center floating action button. Rendered between the middle two items. */
  fab?: {
    label: string;
    icon: ComponentType<LucideProps>;
    onClick: () => void;
    tone?: "primary" | "lime";
  };
}

/**
 * Sticky bottom navigation for the three role portals. Ink pill wraps the
 * active tab. Optional center FAB floats above the bar for the portal's
 * primary action (owner: Close day; front desk: New ticket).
 *
 * When rendered, wrap the surrounding page in `pb-28` so the last content
 * card doesn't sit under the bar. Uses `env(safe-area-inset-bottom)` to keep
 * clear of the iOS home indicator.
 */
export function BottomNav({ items, activeKey, fab }: Props) {
  // If a FAB is present, split items into left and right halves around it.
  const half = Math.ceil(items.length / 2);
  const left = fab ? items.slice(0, half) : items;
  const right = fab ? items.slice(half) : [];

  return (
    <nav
      aria-label="Portal sections"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="relative flex items-center justify-around gap-1 rounded-3xl border border-border bg-card p-2 shadow-lg shadow-black/5">
          {left.map((item) => (
            <NavButton key={item.key} item={item} active={item.key === activeKey} />
          ))}
          {fab ? <Fab {...fab} /> : null}
          {right.map((item) => (
            <NavButton key={item.key} item={item} active={item.key === activeKey} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({ item, active }: { item: BottomNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "flex flex-1 flex-col items-center gap-0.5 rounded-2xl bg-ink px-2 py-2 text-[10px] font-semibold text-ink-foreground"
          : "flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      <Icon className="size-4" strokeWidth={1.8} />
      {item.label}
    </button>
  );
}

function Fab({
  label,
  icon: Icon,
  onClick,
  tone = "primary",
}: NonNullable<Props["fab"]>) {
  const styles =
    tone === "lime"
      ? "bg-lime text-lime-foreground shadow-lime-500/40"
      : "bg-primary text-primary-foreground shadow-primary/40";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`-my-4 grid size-12 shrink-0 place-items-center rounded-full shadow-lg ${styles}`}
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  );
}

/** Convenience wrapper: any layout that renders a BottomNav should also wrap
 * its main content in `<BottomNavSpacer>` so the last card isn't hidden. */
export function BottomNavSpacer({ children }: { children: ReactNode }) {
  return <div className="pb-28">{children}</div>;
}
