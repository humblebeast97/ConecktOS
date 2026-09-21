/**
 * Plan tiers, staff caps and feature flags. Single source of truth for the UI;
 * the server enforces the same caps (see supabase/migrations plan_caps). Caps
 * mirror the landing pricing: Starter 3, Studio 12, Chain unlimited. "Staff"
 * counts non-owner team members.
 */
export type Plan = "starter" | "studio" | "chain";
export type PlanStatus = "trialing" | "active" | "past_due" | "canceled";

export type PlanFeature = "crossBranchReports" | "exportApi" | "multiCurrency";

export interface Subscription {
  business_id: string;
  plan: Plan;
  status: PlanStatus;
  staff_cap: number;
  current_period_end: string | null;
}

export interface PlanLimits {
  label: string;
  /** Non-owner team members allowed. null = unlimited. */
  staffCap: number | null;
  priceMonthly: number;
  features: Record<PlanFeature, boolean>;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: {
    label: "Starter",
    staffCap: 3,
    priceMonthly: 0,
    features: { crossBranchReports: false, exportApi: false, multiCurrency: false },
  },
  studio: {
    label: "Studio",
    staffCap: 12,
    priceMonthly: 15000,
    features: { crossBranchReports: false, exportApi: false, multiCurrency: false },
  },
  chain: {
    label: "Chain",
    staffCap: null,
    priceMonthly: 75000,
    features: { crossBranchReports: true, exportApi: true, multiCurrency: true },
  },
};

/** The next tier up, for upgrade prompts. */
export const NEXT_PLAN: Record<Plan, Plan | null> = {
  starter: "studio",
  studio: "chain",
  chain: null,
};

export function planLabel(plan: Plan): string {
  return PLAN_LIMITS[plan]?.label ?? "Starter";
}

export function planHasFeature(plan: Plan, feature: PlanFeature): boolean {
  return PLAN_LIMITS[plan]?.features[feature] ?? false;
}

/** True when adding another staff member would exceed the plan's cap. */
export function isAtStaffCap(plan: Plan, staffCount: number): boolean {
  const cap = PLAN_LIMITS[plan]?.staffCap ?? null;
  return cap !== null && staffCount >= cap;
}
