import { useStore } from "@/lib/store";

/**
 * Thin API layer — the ONLY interface routes and components should use for
 * app data. Each slice hook groups the reads + mutations for one domain and
 * returns a stable shape. Today they wrap the in-memory mock store; Phase 1
 * will re-implement them against Supabase (React Query + RPC) without any
 * caller changes.
 *
 * Rule of thumb: if a route needs data, it imports a slice hook from here.
 * Never `useStore` directly outside of this file.
 */

export function useAuth() {
  const { currentUser, signIn } = useStore();
  return { currentUser, signIn };
}

export function useSalon() {
  const { salon, updateSalon } = useStore();
  return { salon, updateSalon };
}

export function useStaff() {
  const { staff, profiles, addStylist, removeProfile, updateProfile } = useStore();
  return { staff, profiles, addStylist, removeProfile, updateProfile };
}

export function useServices() {
  const { services, addService, updateService, removeService } = useStore();
  return { services, addService, updateService, removeService };
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
  return {
    inventory,
    usage,
    addInventoryItem,
    addInventoryStock,
    updateInventoryItem,
    removeInventoryItem,
  };
}

export function useTickets() {
  const { tickets, ticketItems, createTicket, markPaid } = useStore();
  return { tickets, ticketItems, createTicket, markPaid };
}

export function useAttendance() {
  const { attendance, clockIn, clockOut, openAttendanceFor } = useStore();
  return { attendance, clockIn, clockOut, openAttendanceFor };
}

export function useExpenses() {
  const { expenses, addExpense } = useStore();
  return { expenses, addExpense };
}

export function useAdminOps() {
  const { resetAll } = useStore();
  return { resetAll };
}
