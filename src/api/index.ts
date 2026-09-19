import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { useSupabaseData } from "@/lib/supabase";
import { commissionRoles } from "@/lib/groompulse";
import {
  fetchAttendance,
  fetchBusiness,
  fetchExpenses,
  fetchInventory,
  fetchProfiles,
  fetchServices,
  fetchTicketItems,
  fetchTickets,
  fetchUsage,
  queryKeys,
} from "./queries";

/**
 * Thin API layer. The ONLY interface routes and components should use for
 * app data. Each slice hook groups the reads + mutations for one domain and
 * returns a stable shape.
 *
 * Phase 1 migration (in progress): READ data now comes from Supabase when the
 * app is opted in (VITE_DATA_SOURCE="supabase" + credentials, see
 * src/lib/supabase.ts). Otherwise reads come from the in-memory mock store, so
 * the existing demo is unchanged by default. MUTATIONS still run against the
 * mock store in this slice; they move server-side in a later step. Each read
 * hook now also returns `isLoading`/`error`; existing callers can ignore them.
 *
 * Rule of thumb: if a route needs data, it imports a slice hook from here.
 * Never `useStore` directly outside of this file.
 */

/** Pick the mock array unless Supabase mode is on and its query has resolved. */
function pick<T>(useRemote: boolean, remote: T | undefined, local: T): T {
  return useRemote && remote !== undefined ? remote : local;
}

// Auth now lives in @/lib/auth (switchable mock vs Supabase Auth). Re-exported
// here so callers keep importing it from the single @/api surface.
export { useAuth, useSessionUser } from "@/lib/auth";

export function useBusiness() {
  const { business, updateBusiness } = useStore();
  const q = useQuery({
    queryKey: queryKeys.business,
    queryFn: fetchBusiness,
    enabled: useSupabaseData,
  });
  return {
    business: pick(useSupabaseData, q.data ?? undefined, business),
    updateBusiness,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useStaff() {
  const { staff, profiles, addStaff, removeProfile, updateProfile } = useStore();
  const q = useQuery({
    queryKey: queryKeys.profiles,
    queryFn: fetchProfiles,
    enabled: useSupabaseData,
  });
  const remoteProfiles = pick(useSupabaseData, q.data, profiles);
  const remoteStaff =
    useSupabaseData && q.data ? q.data.filter((p) => commissionRoles.includes(p.role)) : staff;
  return {
    staff: remoteStaff,
    profiles: remoteProfiles,
    addStaff,
    removeProfile,
    updateProfile,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useServices() {
  const { services, addService, updateService, removeService } = useStore();
  const q = useQuery({
    queryKey: queryKeys.services,
    queryFn: fetchServices,
    enabled: useSupabaseData,
  });
  return {
    services: pick(useSupabaseData, q.data, services),
    addService,
    updateService,
    removeService,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useInventory() {
  const {
    inventory,
    usage,
    addInventoryItem,
    addInventoryStock,
    updateInventoryItem,
    removeInventoryItem,
  } = useStore();
  const inventoryQ = useQuery({
    queryKey: queryKeys.inventory,
    queryFn: fetchInventory,
    enabled: useSupabaseData,
  });
  const usageQ = useQuery({
    queryKey: queryKeys.usage,
    queryFn: fetchUsage,
    enabled: useSupabaseData,
  });
  return {
    inventory: pick(useSupabaseData, inventoryQ.data, inventory),
    usage: pick(useSupabaseData, usageQ.data, usage),
    addInventoryItem,
    addInventoryStock,
    updateInventoryItem,
    removeInventoryItem,
    isLoading: inventoryQ.isLoading || usageQ.isLoading,
    error: inventoryQ.error ?? usageQ.error,
  };
}

export function useTickets() {
  const { tickets, ticketItems, createTicket, markPaid } = useStore();
  const ticketsQ = useQuery({
    queryKey: queryKeys.tickets,
    queryFn: fetchTickets,
    enabled: useSupabaseData,
  });
  const itemsQ = useQuery({
    queryKey: queryKeys.ticketItems,
    queryFn: fetchTicketItems,
    enabled: useSupabaseData,
  });
  return {
    tickets: pick(useSupabaseData, ticketsQ.data, tickets),
    ticketItems: pick(useSupabaseData, itemsQ.data, ticketItems),
    createTicket,
    markPaid,
    isLoading: ticketsQ.isLoading || itemsQ.isLoading,
    error: ticketsQ.error ?? itemsQ.error,
  };
}

export function useAttendance() {
  const { attendance, clockIn, clockOut, openAttendanceFor } = useStore();
  const q = useQuery({
    queryKey: queryKeys.attendance,
    queryFn: fetchAttendance,
    enabled: useSupabaseData,
  });
  return {
    attendance: pick(useSupabaseData, q.data, attendance),
    clockIn,
    clockOut,
    openAttendanceFor,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useExpenses() {
  const { expenses, addExpense, voidExpense } = useStore();
  const q = useQuery({
    queryKey: queryKeys.expenses,
    queryFn: fetchExpenses,
    enabled: useSupabaseData,
  });
  return {
    expenses: pick(useSupabaseData, q.data, expenses),
    addExpense,
    voidExpense,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useAdminOps() {
  const { resetAll } = useStore();
  return { resetAll };
}
