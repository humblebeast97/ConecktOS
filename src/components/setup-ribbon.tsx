import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

interface Props {
  /** Unique per-role id so each role's dismissal is tracked separately. */
  storageKey: string;
  message: string;
}

/**
 * One-line green ribbon that replaces a completed onboarding checklist so
 * finished setup does not keep taking up half the first fold. Dismissal is
 * persisted per user in localStorage.
 */
export function SetupRibbon({ storageKey, message }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(() => false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (dismissed) return null;

  // Text uses the page foreground so it flips near-white in dark mode and
  // near-black in light mode — always legible on the translucent mint fill.
  // The check icon keeps the semantic success tone for at-a-glance meaning.
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-full border border-success/25 bg-success/15 px-4 py-2 text-xs font-medium text-foreground"
    >
      <span className="inline-flex items-center gap-2 truncate">
        <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "1");
        }}
        aria-label="Dismiss setup notice"
        className="text-foreground/60 hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
