import { type ReactNode } from "react";
import { appConfig, type IndustryConfig } from "@/config/industryConfigs";

/**
 * ConecktOS uses a single brand + label set. This provider is now a pass-through
 * kept so existing call sites (and the app root) don't need to change.
 */
export function IndustryProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useIndustryConfig(): IndustryConfig {
  return appConfig;
}
