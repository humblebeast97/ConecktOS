import { useEffect, useState } from "react";
import type { PaymentMethod } from "@/lib/groompulse";

const KEY = "conecktos-frontdesk-prefs";

export type FrontDeskPrefs = {
  defaultPaymentMethod: PaymentMethod;
};

const DEFAULTS: FrontDeskPrefs = { defaultPaymentMethod: "pos" };

function read(): FrontDeskPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<FrontDeskPrefs>;
    return {
      defaultPaymentMethod:
        parsed.defaultPaymentMethod === "cash" ||
        parsed.defaultPaymentMethod === "bank_transfer" ||
        parsed.defaultPaymentMethod === "pos"
          ? parsed.defaultPaymentMethod
          : DEFAULTS.defaultPaymentMethod,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Per-browser front-desk preferences. Backed by localStorage so the same
 *  device remembers the setting across sessions. Phase 1 will move this to
 *  the user profile so it follows a receptionist to any device. */
export function useFrontDeskPrefs() {
  const [prefs, setPrefs] = useState<FrontDeskPrefs>(() => read());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setPrefs(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (patch: Partial<FrontDeskPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage disabled: keep in-memory state */
      }
      return next;
    });
  };

  return { prefs, update };
}
