import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { getMySalonProfile } from "@/lib/salon.functions";
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
 * Loads the current business's `business_type` from the database (falling back to
 * the local salon profile when nobody is signed in) and exposes the matching
 * industry label dictionary to the whole app.
 */
export function IndustryProvider({ children }: { children: ReactNode }) {
  const { salon, updateSalon } = useStore();
  const fetchProfile = useServerFn(getMySalonProfile);

  const { data } = useQuery({
    queryKey: ["salon-profile"],
    queryFn: () => fetchProfile(),
    retry: false,
    staleTime: 60_000,
  });

  const remoteType = data?.business_type as BusinessType | undefined;

  useEffect(() => {
    if (remoteType && remoteType !== salon.business_type) {
      updateSalon({ business_type: remoteType });
    }
  }, [remoteType, salon.business_type, updateSalon]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onPlatformRoute = PLATFORM_ROUTES.has(pathname);

  const businessType = (remoteType ?? salon.business_type ?? "beauty") as BusinessType;
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
