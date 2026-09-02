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
 * Sticky bottom navigation. Active tab wears an ink pill. Optional center FAB
 * for the portal's primary action (owner: Close day; front desk: New ticket).
 * Wrap the page in `<BottomNavSpacer>` so the last card is not hidden behind
 * the bar.
 */
export function BottomNav({ items, activeKey, fab }: Props) {
  const half = Math.ceil(items.length / 2);
  const left = fab ? items.slice(0, half) : items;
  const right = fab ? items.slice(half) : [];

  return (
    <nav
      aria-label="Portal sections"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="glass relative flex items-center justify-around gap-1 rounded-3xl p-2">
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

function Fab({ label, icon: Icon, onClick, tone = "primary" }: NonNullable<Props["fab"]>) {
  const styles =
    tone === "lime" ? "bg-lime text-lime-foreground" : "bg-primary text-primary-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`-my-4 grid size-12 shrink-0 place-items-center rounded-full shadow-lg shadow-primary/30 ${styles}`}
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  );
}

/** Bottom padding so the last card is not obscured by the fixed nav bar. */
export function BottomNavSpacer({ children }: { children: ReactNode }) {
  return <div className="pb-28">{children}</div>;
}
