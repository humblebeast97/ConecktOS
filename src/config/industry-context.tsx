import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  defaultConfig,
  getIndustryConfig,
  type BusinessType,
  type IndustryConfig,
} from "@/config/industryConfigs";

/** Routes that represent the ConecktOS platform itself, not a specific business. */
const PLATFORM_ROUTES = new Set(["/", "/signup", "/join"]);

interface IndustryValue {
  businessType: BusinessType;
  config: IndustryConfig;
}

const IndustryContext = createContext<IndustryValue | null>(null);

/**
 * Reads the current business's `business_type` from the local store and exposes
 * the matching industry label dictionary to the whole app.
 */
export function IndustryProvider({ children }: { children: ReactNode }) {
  const { salon } = useStore();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onPlatformRoute = PLATFORM_ROUTES.has(pathname);

  const businessType = (salon.business_type ?? "beauty") as BusinessType;
  // Platform routes (landing / auth) present the ConecktOS root brand, not any
  // one business's industry theme.
  const config = onPlatformRoute ? defaultConfig : getIndustryConfig(businessType);

  // Paint the whole document with the active industry's accent theme.
  useEffect(() => {
    const el = document.documentElement;
    const themeClasses = [
      "theme-default",
      "theme-beauty",
      "theme-carwash",
      "theme-tailoring",
      "theme-nightlife",
      "theme-repair",
    ];
    el.classList.remove(...themeClasses);
    el.classList.add(config.accentClass);
  }, [config.accentClass]);

  return (
    <IndustryContext.Provider value={{ businessType, config }}>
      {children}
    </IndustryContext.Provider>
  );
}

export function useIndustry(): IndustryValue {
  const ctx = useContext(IndustryContext);
  if (!ctx) throw new Error("useIndustry must be used inside <IndustryProvider>");
  return ctx;
}

/** Convenience accessor for just the label dictionary. */
export function useIndustryConfig(): IndustryConfig {
  return useIndustry().config;
}
