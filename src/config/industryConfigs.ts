// Single-brand configuration. ConecktOS ships one theme and one label set;
// the previous multi-industry theming system was removed to reduce surface area.

export interface IndustryConfig {
  /** Brand name shown in headers, nav and browser tab titles. */
  appName: string;
  /** Short descriptor shown under the app name. */
  tagline: string;
  staffTitle: string;
  staffPlural: string;
  workstationTitle: string;
  serviceTitle: string;
  clientAssetLabel: string;
  inventoryUnitLabel: string;
  /** Label for the headline power/fuel overhead KPI. */
  powerCostLabel: string;
  showTipping: boolean;
  showInventory: boolean;
}

export const appConfig: IndustryConfig = {
  appName: "ConecktOS",
  tagline: "Service Business OS",
  staffTitle: "Staff",
  staffPlural: "Staff",
  workstationTitle: "Station",
  serviceTitle: "Service",
  clientAssetLabel: "Customer name",
  inventoryUnitLabel: "Inventory items",
  powerCostLabel: "Power & fuel",
  showTipping: true,
  showInventory: true,
};

/** Kept for backward compatibility; always returns the single app config. */
export function getIndustryConfig(): IndustryConfig {
  return appConfig;
}
