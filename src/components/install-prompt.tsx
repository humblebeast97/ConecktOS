import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Chrome / Edge / Samsung Internet fire `beforeinstallprompt` on eligible
 * PWAs. We stash the event, then show a friendly install chip once the user
 * has visited a few times (VISIT_THRESHOLD). Dismissing hides it forever
 * (per browser localStorage). Safari doesn't fire the event so the chip
 * never appears there — iOS users use the share sheet instead.
 */
const VISIT_KEY = "conecktos-visit-count";
const DISMISS_KEY = "conecktos-install-dismissed";
const VISIT_THRESHOLD = 3;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Count visits so we don't prompt on the first landing.
    const raw = window.localStorage.getItem(VISIT_KEY);
    const count = (raw ? parseInt(raw, 10) : 0) + 1;
    window.localStorage.setItem(VISIT_KEY, String(count));
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";

    const onPrompt = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setEvent(bip);
      if (!dismissed && count >= VISIT_THRESHOLD) setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !event) return null;

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") window.localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted" && typeof window !== "undefined") {
        window.localStorage.setItem(DISMISS_KEY, "1");
      }
    } finally {
      setVisible(false);
      setEvent(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install ConecktOS"
      className="fixed inset-x-4 bottom-32 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg shadow-black/10 sm:bottom-6"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Download className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install ConecktOS</p>
        <p className="text-xs text-muted-foreground">Faster launch. Works offline.</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
