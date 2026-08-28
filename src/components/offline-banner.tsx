import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Small banner that appears at the top of the app shell whenever
 * `navigator.onLine` is false. Since the mock store already writes to
 * localStorage, the reassurance is honest: changes save locally and
 * will sync once real backend endpoints exist (Phase 1).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print flex items-center justify-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-2 text-xs font-medium text-warning"
    >
      <WifiOff className="size-3.5" />
      You're offline — changes save locally and will sync when you're back.
    </div>
  );
}
