export type BusinessType =
  | "beauty"
  | "car_wash"
  | "tailoring"
  | "nightlife"
  | "repair";

export interface IndustryConfig {
  /** Coneckt sub-brand shown in headers, nav and browser tab titles. */
  appName: string;
  /** Short descriptor shown under the app name. */
  tagline: string;
  /** Brand accent hex for this industry's theme. */
  primaryColor: string;
  /** CSS class that applies this industry's color theme. */
  accentClass: string;
  staffTitle: string;
  staffPlural: string;
  workstationTitle: string;
  serviceTitle: string;
  clientAssetLabel: string;
  inventoryUnitLabel: string;
  /** Label for the headline power/fuel overhead KPI, per industry. */
  powerCostLabel: string;
  showTipping: boolean;
  showInventory: boolean;
}

export const industryConfigs: Record<BusinessType, IndustryConfig> = {
  beauty: {
    appName: "GroomConeckt",
    tagline: "Salon & Barbershop Management",
    primaryColor: "#D4AF37",
    accentClass: "theme-beauty",
    staffTitle: "Barber / Stylist",
    staffPlural: "Barbers & Stylists",
    workstationTitle: "Chair / Station",
    serviceTitle: "Haircut / Treatment",
    clientAssetLabel: "Client Name",
    inventoryUnitLabel: "Consumable Items (Dyes, Creams)",
    powerCostLabel: "Generator fuel",
    showTipping: true,
    showInventory: true,
  },
  car_wash: {
    appName: "WashConeckt",
    tagline: "Car Wash & Detailing OS",
    primaryColor: "#0066FF",
    accentClass: "theme-carwash",
    staffTitle: "Washer / Detailer",
    staffPlural: "Washers",
    workstationTitle: "Wash Bay",
    serviceTitle: "Wash / Polish Type",
    clientAssetLabel: "Vehicle Plate Number",
    inventoryUnitLabel: "Chemicals & Soaps (Liters)",
    powerCostLabel: "Water & power",
    showTipping: true,
    showInventory: true,
  },
  tailoring: {
    appName: "StitchConeckt",
    tagline: "Tailoring & Fashion House OS",
    primaryColor: "#8B5CF6",
    accentClass: "theme-tailoring",
    staffTitle: "Tailor / Seamstress",
    staffPlural: "Tailors",
    workstationTitle: "Sewing Station",
    serviceTitle: "Garment / Style",
    clientAssetLabel: "Customer & Style Reference",
    inventoryUnitLabel: "Fabrics, Threads & Zippers",
    powerCostLabel: "Power & utilities",
    showTipping: false,
    showInventory: true,
  },
  nightlife: {
    appName: "NightConeckt",
    tagline: "Lounge & Nightclub Operations",
    primaryColor: "#F43F5E",
    accentClass: "theme-nightlife",
    staffTitle: "Server / Bartender",
    staffPlural: "Floor Staff & Bartenders",
    workstationTitle: "Table / Bar Area",
    serviceTitle: "Bottle / Shisha / Service",
    clientAssetLabel: "Guest Name / Tab",
    inventoryUnitLabel: "Bottles, Mixers & Shisha Charcoal",
    powerCostLabel: "Generator fuel",
    showTipping: true,
    showInventory: true,
  },
  repair: {
    appName: "FixConeckt",
    tagline: "Electronics Repair Plaza OS",
    primaryColor: "#F59E0B",
    accentClass: "theme-repair",
    staffTitle: "Technician",
    staffPlural: "Technicians",
    workstationTitle: "Repair Bench",
    serviceTitle: "Repair Type",
    clientAssetLabel: "Device Serial / IMEI",
    inventoryUnitLabel: "Spare Parts (Screens, Batteries)",
    powerCostLabel: "Power & tools",
    showTipping: true,
    showInventory: true,
  },
};

/**
 * ConecktOS root platform config — used on the landing page, auth flows and
 * global admin, i.e. anywhere no specific business industry is in context.
 */
export const defaultConfig: IndustryConfig = {
  appName: "ConecktOS",
  tagline: "Service Business Operating System",
  primaryColor: "#0EA5E9",
  accentClass: "theme-default",
  staffTitle: "Team Member",
  staffPlural: "Team",
  workstationTitle: "Station",
  serviceTitle: "Service",
  clientAssetLabel: "Customer Name",
  inventoryUnitLabel: "Inventory Items",
  powerCostLabel: "Power & fuel",
  showTipping: true,
  showInventory: true,
};

export function getIndustryConfig(businessType: string): IndustryConfig {
  return industryConfigs[businessType as BusinessType] ?? defaultConfig;
}
