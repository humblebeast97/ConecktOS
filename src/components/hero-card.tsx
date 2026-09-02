import type { ReactNode } from "react";

interface Props {
  /** Small label above the big number, e.g. "Today's revenue". */
  eyebrow: string;
  /** The primary number displayed at hero size. */
  amount: string;
  /** Small pill top-right of the card (usually date or status). */
  badge?: string;
  /** One-line caption under the amount (e.g. delta vs yesterday). */
  caption?: ReactNode;
  /** Row of small key/value pairs shown below a divider. */
  metrics?: { label: string; value: string; tone?: "default" | "lime" | "success" }[];
  /** Trailing element (button, action link) rendered on the right of the foot. */
  action?: ReactNode;
}

/**
 * Ink hero card. Solid near-black surface with a violet corner glow so it
 * anchors the top of the screen as the darkest thing in the layout. Used as
 * the first-fold surface on the Owner / Front desk / Staff home views.
 */
export function HeroCard({ eyebrow, amount, badge, caption, metrics, action }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink p-5 text-ink-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-full w-full"
        style={{
          background:
            "radial-gradient(circle at 85% 0%, rgba(143, 114, 255, 0.35), transparent 55%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-ink-foreground/70">{eyebrow}</p>
          {badge ? (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-medium text-ink-foreground/85">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.03em]">
          {amount}
        </p>
        {caption ? <p className="mt-1.5 text-[11px] text-ink-foreground/60">{caption}</p> : null}

        {metrics && metrics.length > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3.5">
            <div className="flex flex-1 gap-6">
              {metrics.map((m) => (
                <div key={m.label}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-foreground/55">
                    {m.label}
                  </p>
                  <p
                    className={
                      m.tone === "lime"
                        ? "mt-0.5 font-display text-sm font-bold text-lime"
                        : m.tone === "success"
                          ? "mt-0.5 font-display text-sm font-bold text-success"
                          : "mt-0.5 font-display text-sm font-bold"
                    }
                  >
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
