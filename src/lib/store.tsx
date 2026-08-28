import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SALON_ID,
  haversineMeters,
  setMoneyFormat,
  seedAttendance,
  seedExpenses,
  seedInventory,
  commissionRoles,
  seedProfiles,
  seedSalon,
  seedServices,
  seedTicketItems,
  seedTickets,
  seedUsage,
  type Attendance,
  type Expense,
  type ExpenseCategory,
  type InventoryItem,
  type PaymentMethod,
  type Profile,
  type Role,
  type Salon,
  type Service,
  type Ticket,
  type TicketInventoryUsage,
  type TicketItem,
} from "./groompulse";

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export interface DraftLine {
  service_id: string;
  staff_id: string;
}

export interface DraftUsage {
  inventory_id: string;
  quantity_used: number;
}

interface CreateTicketInput {
  client_name: string;
  client_phone: string;
  payment_method: PaymentMethod;
  status: "pending" | "paid";
  lines: DraftLine[];
  usage: DraftUsage[];
  created_by: string;
}

interface StoreValue {
  salon: Salon;
  profiles: Profile[];
  services: Service[];
  inventory: InventoryItem[];
  tickets: Ticket[];
  ticketItems: TicketItem[];
  usage: TicketInventoryUsage[];
  attendance: Attendance[];
  expenses: Expense[];
  currentUserId: string;
  currentUser: Profile;
  signIn: (userId: string) => void;
  staff: Profile[];
  clockIn: (
    staffId: string,
    coords: { lat: number; lng: number } | null,
  ) => { withinGeofence: boolean; distance: number | null };
  clockOut: (staffId: string) => void;
  openAttendanceFor: (staffId: string) => Attendance | undefined;
  createTicket: (input: CreateTicketInput) => Ticket;
  markPaid: (ticketId: string, reference?: string) => void;
  addExpense: (input: {
    category: ExpenseCategory;
    amount: number;
    generator_hours_run: number | null;
    notes: string;
  }) => void;
  addInventoryStock: (inventoryId: string, delta: number) => void;
  addInventoryItem: (input: {
    item_name: string;
    quantity: number;
    unit: string;
    reorder_level: number;
  }) => void;
  updateInventoryItem: (
    inventoryId: string,
    patch: Partial<Pick<InventoryItem, "item_name" | "quantity" | "unit" | "reorder_level">>,
  ) => void;
  removeInventoryItem: (inventoryId: string) => void;
  addService: (input: { name: string; price: number; duration_minutes: number }) => Service;
  updateService: (
    serviceId: string,
    patch: Partial<Pick<Service, "name" | "price" | "duration_minutes">>,
  ) => void;
  removeService: (serviceId: string) => void;
  addStylist: (input: {
    full_name: string;
    role: Role;
    job_title: string | null;
    commission_rate: number;
    base_salary: number | null;
    salary_payday: number | null;
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
  }) => Profile;
  updateProfile: (
    profileId: string,
    patch: Partial<
      Pick<
        Profile,
        | "full_name"
        | "job_title"
        | "commission_rate"
        | "base_salary"
        | "salary_payday"
        | "salary_last_paid_at"
        | "bank_name"
        | "account_number"
        | "account_name"
      >
    >,
  ) => void;
  removeProfile: (profileId: string) => void;
  updateSalon: (patch: Partial<Salon>) => void;
  /** Clears tickets, commissions, usage, attendance, expenses and zeroes stock on hand. */
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/** localStorage key for the persisted demo state. Bump the suffix to reset all clients. */
const STORE_KEY = "conecktos-store-v9";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<Salon>(seedSalon);
  const [profiles, setProfiles] = useState<Profile[]>(seedProfiles);
  const [inventory, setInventory] = useState<InventoryItem[]>(seedInventory);
  const [services, setServices] = useState<Service[]>(seedServices);
  const [tickets, setTickets] = useState<Ticket[]>(seedTickets);
  const [ticketItems, setTicketItems] = useState<TicketItem[]>(seedTicketItems);
  const [usage, setUsage] = useState<TicketInventoryUsage[]>(seedUsage);
  const [attendance, setAttendance] = useState<Attendance[]>(seedAttendance);
  const [expenses, setExpenses] = useState<Expense[]>(seedExpenses);
  const [currentUserId, setCurrentUserId] = useState<string>("u-owner");
  // Gates persistence until after we've hydrated from localStorage, so the seed
  // state can't overwrite a saved session on first mount.
  const [hydrated, setHydrated] = useState(false);

  const currentUser = useMemo(
    () => profiles.find((p) => p.id === currentUserId) ?? profiles[0],
    [profiles, currentUserId],
  );

  const staff = useMemo(() => profiles.filter((p) => commissionRoles.includes(p.role)), [profiles]);

  const openAttendanceFor = useCallback(
    (staffId: string) =>
      attendance.find((a) => a.staff_id === staffId && a.clock_out_time === null),
    [attendance],
  );

  const clockIn = useCallback(
    (staffId: string, coords: { lat: number; lng: number } | null) => {
      const now = new Date();
      const late = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
      // Measure against the business's own location (set by the owner), not the seed.
      const distance = coords
        ? haversineMeters(coords.lat, coords.lng, salon.latitude, salon.longitude)
        : null;
      const withinGeofence = distance !== null && distance <= salon.geofence_radius_meters;
      setAttendance((prev) => [
        {
          id: uid("att"),
          staff_id: staffId,
          clock_in_time: now.toISOString(),
          clock_out_time: null,
          clock_in_lat: coords?.lat ?? null,
          clock_in_lng: coords?.lng ?? null,
          is_within_geofence: withinGeofence,
          status: late ? "late" : "on_time",
        },
        ...prev,
      ]);
      return { withinGeofence, distance };
    },
    [salon],
  );

  const clockOut = useCallback((staffId: string) => {
    setAttendance((prev) =>
      prev.map((a) =>
        a.staff_id === staffId && a.clock_out_time === null
          ? { ...a, clock_out_time: new Date().toISOString() }
          : a,
      ),
    );
  }, []);

  const createTicket = useCallback(
    (input: CreateTicketInput) => {
      const ticketId = uid("tkt");
      const items: TicketItem[] = input.lines.map((line) => {
        const service = services.find((s) => s.id === line.service_id)!;
        const member = profiles.find((p) => p.id === line.staff_id)!;
        return {
          id: uid("ti"),
          ticket_id: ticketId,
          service_id: service.id,
          staff_id: member.id,
          service_price: service.price,
          staff_commission_amount: Math.round(service.price * member.commission_rate),
        };
      });
      const ticket: Ticket = {
        id: ticketId,
        salon_id: SALON_ID,
        client_name: input.client_name,
        client_phone: input.client_phone,
        total_amount: items.reduce((sum, i) => sum + i.service_price, 0),
        payment_method: input.payment_method,
        status: input.status,
        reference: null,
        created_by: input.created_by,
        created_at: new Date().toISOString(),
      };

      setTickets((prev) => [ticket, ...prev]);
      setTicketItems((prev) => [...prev, ...items]);

      if (input.usage.length) {
        setUsage((prev) => [
          ...prev,
          ...input.usage.map((u) => ({ id: uid("usg"), ticket_id: ticketId, ...u })),
        ]);
        setInventory((prev) =>
          prev.map((item) => {
            const used = input.usage.find((u) => u.inventory_id === item.id);
            return used
              ? { ...item, quantity: Math.max(0, item.quantity - used.quantity_used) }
              : item;
          }),
        );
      }
      return ticket;
    },
    [profiles, services],
  );

  const markPaid = useCallback((ticketId: string, reference?: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: "paid", reference: reference ?? t.reference } : t,
      ),
    );
  }, []);

  const addExpense = useCallback<StoreValue["addExpense"]>((input) => {
    setExpenses((prev) => [
      {
        id: uid("exp"),
        salon_id: SALON_ID,
        logged_at: new Date().toISOString(),
        ...input,
      },
      ...prev,
    ]);
  }, []);

  const addInventoryStock = useCallback((inventoryId: string, delta: number) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.id === inventoryId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i,
      ),
    );
  }, []);

  const addInventoryItem = useCallback<StoreValue["addInventoryItem"]>((input) => {
    setInventory((prev) => [...prev, { id: uid("inv"), salon_id: SALON_ID, ...input }]);
  }, []);

  const updateInventoryItem = useCallback<StoreValue["updateInventoryItem"]>(
    (inventoryId, patch) => {
      setInventory((prev) => prev.map((i) => (i.id === inventoryId ? { ...i, ...patch } : i)));
    },
    [],
  );

  const removeInventoryItem = useCallback<StoreValue["removeInventoryItem"]>((inventoryId) => {
    setInventory((prev) => prev.filter((i) => i.id !== inventoryId));
  }, []);

  const addService = useCallback<StoreValue["addService"]>((input) => {
    const service: Service = {
      id: uid("svc"),
      salon_id: SALON_ID,
      suggested_inventory: [],
      ...input,
    };
    setServices((prev) => [...prev, service]);
    return service;
  }, []);

  const updateService = useCallback<StoreValue["updateService"]>((serviceId, patch) => {
    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, ...patch } : s)));
  }, []);

  const removeService = useCallback<StoreValue["removeService"]>((serviceId) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  }, []);

  const addStylist = useCallback<StoreValue["addStylist"]>((input) => {
    const profile: Profile = {
      id: uid("u"),
      salon_id: SALON_ID,
      avatar_url: null,
      salary_last_paid_at: null,
      ...input,
    };
    setProfiles((prev) => [...prev, profile]);
    return profile;
  }, []);

  const updateProfile = useCallback<StoreValue["updateProfile"]>((profileId, patch) => {
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, ...patch } : p)));
  }, []);

  const removeProfile = useCallback<StoreValue["removeProfile"]>((profileId) => {
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    setCurrentUserId((cur) => (cur === profileId ? "u-owner" : cur));
  }, []);

  const updateSalon = useCallback<StoreValue["updateSalon"]>((patch) => {
    setSalon((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetAll = useCallback(() => {
    setTickets([]);
    setTicketItems([]);
    setUsage([]);
    setAttendance([]);
    setExpenses([]);
    setInventory((prev) => prev.map((i) => ({ ...i, quantity: 0 })));
  }, []);

  // Keep the money formatter in sync with the business's currency setting.
  useEffect(() => {
    setMoneyFormat(salon.currency);
  }, [salon.currency]);

  // Hydrate once from localStorage after mount (kept out of the initial render to
  // avoid SSR hydration mismatches).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.salon) setSalon(s.salon);
        if (s.profiles) setProfiles(s.profiles);
        if (s.inventory) setInventory(s.inventory);
        if (s.services) setServices(s.services);
        if (s.tickets) setTickets(s.tickets);
        if (s.ticketItems) setTicketItems(s.ticketItems);
        if (s.usage) setUsage(s.usage);
        if (s.attendance) setAttendance(s.attendance);
        if (s.expenses) setExpenses(s.expenses);
        if (s.currentUserId) setCurrentUserId(s.currentUserId);
      }
    } catch {
      // Corrupt/blocked storage. Fall back to seed state.
    }
    setHydrated(true);
  }, []);

  // Persist on every change, once hydrated.
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    try {
      window.localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          salon,
          profiles,
          inventory,
          services,
          tickets,
          ticketItems,
          usage,
          attendance,
          expenses,
          currentUserId,
        }),
      );
    } catch {
      // Storage full/blocked. Ignore.
    }
  }, [
    hydrated,
    salon,
    profiles,
    inventory,
    services,
    tickets,
    ticketItems,
    usage,
    attendance,
    expenses,
    currentUserId,
  ]);

  const value: StoreValue = {
    salon,
    profiles,
    services,
    inventory,
    tickets,
    ticketItems,
    usage,
    attendance,
    expenses,
    currentUserId,
    currentUser,
    signIn: setCurrentUserId,
    staff,
    clockIn,
    clockOut,
    openAttendanceFor,
    createTicket,
    markPaid,
    addExpense,
    addInventoryStock,
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    addService,
    updateService,
    removeService,
    addStylist,
    updateProfile,
    removeProfile,
    updateSalon,
    resetAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export const defaultUserForRole: Record<Role, string> = {
  owner: "u-owner",
  manager: "u-owner",
  receptionist: "u-recep",
  staff: "u-staff-1",
};
