import { requireSupabase } from "@/lib/supabase";
import type {
  Attendance,
  Business,
  Expense,
  InventoryItem,
  Profile,
  Service,
  Ticket,
  TicketInventoryUsage,
  TicketItem,
} from "@/lib/groompulse";
import type { Subscription } from "@/lib/plans";

/**
 * Supabase read layer for the api slice hooks. Every fetcher relies on RLS to
 * scope rows to the caller's business, so no business_id filter is passed from
 * the client. These are the Phase 1 replacements for the mock store's arrays;
 * writes (mutations) are wired in a later slice.
 */

export const queryKeys = {
  business: ["business"] as const,
  profiles: ["profiles"] as const,
  services: ["services"] as const,
  inventory: ["inventory"] as const,
  usage: ["usage"] as const,
  tickets: ["tickets"] as const,
  ticketItems: ["ticketItems"] as const,
  attendance: ["attendance"] as const,
  expenses: ["expenses"] as const,
  subscription: ["subscription"] as const,
};

async function selectAll<T>(table: string, orderBy?: { column: string; ascending?: boolean }) {
  let query = requireSupabase().from(table).select("*");
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

/** The single business row for the authed tenant (RLS returns only theirs). */
export async function fetchBusiness(): Promise<Business | null> {
  const { data, error } = await requireSupabase()
    .from("businesses")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Business) ?? null;
}

export const fetchProfiles = () => selectAll<Profile>("profiles", { column: "full_name" });
export const fetchServices = () => selectAll<Service>("services", { column: "name" });
export const fetchInventory = () =>
  selectAll<InventoryItem>("inventory_items", { column: "item_name" });
export const fetchUsage = () => selectAll<TicketInventoryUsage>("ticket_inventory_usage");
export const fetchTickets = () =>
  selectAll<Ticket>("tickets", { column: "created_at", ascending: false });
export const fetchTicketItems = () => selectAll<TicketItem>("ticket_items");
export const fetchAttendance = () =>
  selectAll<Attendance>("attendance", { column: "clock_in_time", ascending: false });
export const fetchExpenses = () =>
  selectAll<Expense>("expenses", { column: "logged_at", ascending: false });

/** The caller's subscription row (RLS returns only their business's). */
export async function fetchSubscription(): Promise<Subscription | null> {
  const { data, error } = await requireSupabase()
    .from("subscriptions")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Subscription) ?? null;
}
