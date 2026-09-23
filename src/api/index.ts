import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { useSupabaseData } from "@/lib/supabase";
import { commissionRoles } from "@/lib/groompulse";
import { useSupabaseMutations } from "./mutations";
import {
  fetchAttendance,
  fetchBusiness,
  fetchExpenses,
  fetchInventory,
  fetchProfiles,
  fetchServices,
  fetchPendingInvites,
  fetchSubscription,
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
 * Phase 1 migration: when opted into Supabase (VITE_DATA_SOURCE="supabase" +
 * credentials, see src/lib/supabase.ts) READS come from Supabase (useQuery) and
 * WRITES go through the server-authoritative mutation layer (src/api/mutations).
 * Otherwise both come from the in-memory mock store, so the demo is unchanged by
 * default. Read hooks also return `isLoading`/`error`; callers may ignore them.
 *
 * Rule of thumb: if a route needs data, it imports a slice hook from here.
 * Never `useStore` directly outside of this file.
 */

export { useAuth, useSessionUser } from "@/lib/auth";

/** Pick the mock array unless Supabase mode is on and its query has resolved. */
function pick<T>(useRemote: boolean, remote: T | undefined, local: T): T {
  return useRemote && remote !== undefined ? remote : local;
}

export function useBusiness() {
  const { business, updateBusiness } = useStore();
  const m = useSupabaseMutations();
  const q = useQuery({
    queryKey: queryKeys.business,
    queryFn: fetchBusiness,
    enabled: useSupabaseData,
  });
  return {
    business: pick(useSupabaseData, q.data ?? undefined, business),
    updateBusiness: useSupabaseData ? m.updateBusiness : updateBusiness,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useStaff() {
  const { staff, profiles, addStaff, removeProfile, updateProfile } = useStore();
  const m = useSupabaseMutations();
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
    addStaff: useSupabaseData ? m.addStaff : addStaff,
    removeProfile: useSupabaseData ? m.removeProfile : removeProfile,
    updateProfile: useSupabaseData ? m.updateProfile : updateProfile,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useServices() {
  const { services, addService, updateService, removeService } = useStore();
  const m = useSupabaseMutations();
  const q = useQuery({
    queryKey: queryKeys.services,
    queryFn: fetchServices,
    enabled: useSupabaseData,
  });
  return {
    services: pick(useSupabaseData, q.data, services),
    addService: useSupabaseData ? m.addService : addService,
    updateService: useSupabaseData ? m.updateService : updateService,
    removeService: useSupabaseData ? m.removeService : removeService,
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
  const m = useSupabaseMutations();
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
    addInventoryItem: useSupabaseData ? m.addInventoryItem : addInventoryItem,
    addInventoryStock: useSupabaseData ? m.addInventoryStock : addInventoryStock,
    updateInventoryItem: useSupabaseData ? m.updateInventoryItem : updateInventoryItem,
    removeInventoryItem: useSupabaseData ? m.removeInventoryItem : removeInventoryItem,
    isLoading: inventoryQ.isLoading || usageQ.isLoading,
    error: inventoryQ.error ?? usageQ.error,
  };
}

export function useTickets() {
  const { tickets, ticketItems, createTicket, markPaid } = useStore();
  const m = useSupabaseMutations();
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
    createTicket: useSupabaseData ? m.createTicket : createTicket,
    markPaid: useSupabaseData ? m.markPaid : markPaid,
    isLoading: ticketsQ.isLoading || itemsQ.isLoading,
    error: ticketsQ.error ?? itemsQ.error,
  };
}

export function useAttendance() {
  const { attendance, clockIn, clockOut } = useStore();
  const m = useSupabaseMutations();
  const q = useQuery({
    queryKey: queryKeys.attendance,
    queryFn: fetchAttendance,
    enabled: useSupabaseData,
  });
  const rows = pick(useSupabaseData, q.data, attendance);
  // Derived from the resolved rows so it is correct in both modes (the mock
  // store's version closed over mock state only).
  const openAttendanceFor = (staffId: string) =>
    rows.find((a) => a.staff_id === staffId && a.clock_out_time === null);
  return {
    attendance: rows,
    clockIn: useSupabaseData ? m.clockIn : clockIn,
    clockOut: useSupabaseData ? m.clockOut : clockOut,
    openAttendanceFor,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useExpenses() {
  const { expenses, addExpense, voidExpense } = useStore();
  const m = useSupabaseMutations();
  const q = useQuery({
    queryKey: queryKeys.expenses,
    queryFn: fetchExpenses,
    enabled: useSupabaseData,
  });
  return {
    expenses: pick(useSupabaseData, q.data, expenses),
    addExpense: useSupabaseData ? m.addExpense : addExpense,
    voidExpense: useSupabaseData ? m.voidExpense : voidExpense,
    isLoading: q.isLoading,
    error: q.error,
  };
}

export function useAdminOps() {
  const { resetAll } = useStore();
  const m = useSupabaseMutations();
  return {
    resetAll: useSupabaseData ? m.resetAll : resetAll,
    // Supabase-only server ops; components call these behind a mode check.
    recordPayrollPayment: m.recordPayrollPayment,
    closeDay: m.closeDay,
  };
}

/** The current business's subscription (plan + staff cap). Null in mock mode or
 * while loading. Reads only; plan changes come from billing (a later slice). */
export function useSubscription() {
  const q = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: fetchSubscription,
    enabled: useSupabaseData,
  });
  return { subscription: useSupabaseData ? (q.data ?? null) : null, isLoading: q.isLoading };
}

/** Onboarding writes (Supabase only): bootstrap a business, or generate/accept
 * an invite. Callers await these and navigate on success. */
export function useOnboarding() {
  const m = useSupabaseMutations();
  return {
    createOwnerBusiness: m.createOwnerBusiness,
    acceptInvite: m.acceptInvite,
    createInvite: m.createInvite,
    revokeInvite: m.revokeInvite,
  };
}

/** Pending invites the owner/manager can share or revoke (Supabase only). */
export function useInvites() {
  const q = useQuery({
    queryKey: queryKeys.invites,
    queryFn: fetchPendingInvites,
    enabled: useSupabaseData,
  });
  return { invites: q.data ?? [], isLoading: q.isLoading };
}
