// ConecktOS domain model — mirrors the planned Supabase schema.
// Currently backed by in-memory mock state (see src/lib/store.tsx).

/** Permission tiers. A person's actual job title is free text (Profile.job_title). */
export type Role = "owner" | "manager" | "receptionist" | "staff";
type AttendanceStatus = "on_time" | "late" | "absent";
export type PaymentMethod = "pos" | "bank_transfer" | "cash";
type TicketStatus = "pending" | "paid";
export type ExpenseCategory = "generator_fuel" | "maintenance" | "supplies" | "rent" | "salary";

type BusinessType = "beauty" | "car_wash" | "tailoring" | "nightlife" | "repair";

/**
 * Payroll reminder cadence on the owner dashboard.
 * 0 = off · 3 or 7 = days before payday · -1 = always visible.
 */
export type PayrollReminderDays = 0 | 3 | 7 | -1;

export interface Salon {
  id: string;
  name: string;
  business_type: BusinessType;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  currency: string;
  open_time: string;
  close_time: string;
  payroll_reminder_days: PayrollReminderDays;
  owner_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  salon_id: string;
  full_name: string;
  role: Role;
  /** Free-text job title, e.g. "Technician", "Stylist", "Server". */
  job_title: string | null;
  commission_rate: number;
  /** Monthly base salary in the business's currency (nullable = commission-only). */
  base_salary: number | null;
  /** Day of month payroll is due (1–31). Null when there's no salary. */
  salary_payday: number | null;
  /** ISO timestamp of the last time this person's salary was marked paid. */
  salary_last_paid_at: string | null;
  /** Payout bank details for tips (direct transfer). */
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  avatar_url: string | null;
}

export interface Attendance {
  id: string;
  staff_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  /** Null when the device's location was unavailable at clock-in. */
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  is_within_geofence: boolean;
  status: AttendanceStatus;
}

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  /** Consumables typically used by this service — powers auto-suggested deductions. */
  suggested_inventory: { inventory_id: string; quantity: number }[];
}

export interface InventoryItem {
  id: string;
  salon_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  reorder_level: number;
}

export interface Ticket {
  id: string;
  salon_id: string;
  client_name: string;
  client_phone: string;
  total_amount: number;
  payment_method: PaymentMethod;
  status: TicketStatus;
  reference: string | null;
  created_by: string;
  created_at: string;
}

export interface TicketItem {
  id: string;
  ticket_id: string;
  service_id: string;
  staff_id: string;
  service_price: number;
  staff_commission_amount: number;
}

export interface TicketInventoryUsage {
  id: string;
  ticket_id: string | null;
  inventory_id: string;
  quantity_used: number;
}

export interface Expense {
  id: string;
  salon_id: string;
  category: ExpenseCategory;
  amount: number;
  generator_hours_run: number | null;
  notes: string;
  logged_at: string;
}

export const SALON_ID = "salon-001";

export const currencyOptions = [
  { code: "NGN", locale: "en-NG", label: "Nigerian Naira (₦)" },
  { code: "GHS", locale: "en-GH", label: "Ghanaian Cedi (₵)" },
  { code: "KES", locale: "en-KE", label: "Kenyan Shilling (KSh)" },
  { code: "ZAR", locale: "en-ZA", label: "South African Rand (R)" },
  { code: "USD", locale: "en-US", label: "US Dollar ($)" },
] as const;

// The active money format, updated from the business's `currency` setting.
let moneyFormat = { locale: "en-NG", currency: "NGN" };

export function setMoneyFormat(currency: string) {
  const opt = currencyOptions.find((c) => c.code === currency);
  moneyFormat = opt ? { locale: opt.locale, currency: opt.code } : moneyFormat;
}

/** Formats an amount in the business's configured currency (defaults to NGN). */
export const naira = (value: number) =>
  new Intl.NumberFormat(moneyFormat.locale, {
    style: "currency",
    currency: moneyFormat.currency,
    maximumFractionDigits: 0,
  }).format(value || 0);

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

/** Great-circle distance in metres between two WGS84 coordinates. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Access-tier labels. For a person's actual job title, use personTitle(). */
export const roleLabel: Record<Role, string> = {
  owner: "Owner / Admin",
  manager: "Manager",
  receptionist: "Front Desk",
  staff: "Floor Staff",
};

export const roleHint: Record<Role, string> = {
  owner: "Full access: reports, payouts, audits",
  manager: "Runs the floor, logs expenses, no payout edits",
  receptionist: "Front desk billing and payment matching",
  staff: "On the floor · clocks in and earns commission",
};

/** Permission tiers that appear on the floor, clock in and earn a commission split. */
export const commissionRoles: Role[] = ["staff"];

export const earnsCommission = (role: Role) => commissionRoles.includes(role);

/** A person's display title: their free-text job title, or the access-tier label. */
export const personTitle = (p: { role: Role; job_title?: string | null }) =>
  p.job_title?.trim() || roleLabel[p.role];

export const roleGroups: { label: string; roles: Role[] }[] = [
  { label: "Floor (earns commission)", roles: ["staff"] },
  { label: "Front desk & management", roles: ["receptionist", "manager", "owner"] },
];

export const paymentLabel: Record<PaymentMethod, string> = {
  pos: "POS",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
};

export const expenseLabel: Record<ExpenseCategory, string> = {
  generator_fuel: "Generator Fuel",
  maintenance: "Maintenance",
  supplies: "Supplies",
  rent: "Rent",
  salary: "Salary",
};

/** How someone earns — derived from their compensation fields. */
export type CompensationType = "commission" | "salary" | "both" | "none";

export function compensationType(p: {
  commission_rate: number;
  base_salary: number | null;
}): CompensationType {
  const hasComm = p.commission_rate > 0;
  const hasSal = (p.base_salary ?? 0) > 0;
  if (hasComm && hasSal) return "both";
  if (hasComm) return "commission";
  if (hasSal) return "salary";
  return "none";
}

export const compensationLabel: Record<CompensationType, string> = {
  commission: "Commission",
  salary: "Salary",
  both: "Both",
  none: "No pay",
};

/** The next monthly payday (Date at midnight) at or after `from`. */
function nextMonthlyPayday(dayOfMonth: number, from: Date): Date {
  const y = from.getFullYear();
  const m = from.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const paydayThis = new Date(y, m, Math.min(dayOfMonth, daysInMonth));
  paydayThis.setHours(0, 0, 0, 0);
  const start = new Date(y, m, from.getDate());
  start.setHours(0, 0, 0, 0);
  if (paydayThis >= start) return paydayThis;
  const nextDays = new Date(y, m + 2, 0).getDate();
  const paydayNext = new Date(y, m + 1, Math.min(dayOfMonth, nextDays));
  paydayNext.setHours(0, 0, 0, 0);
  return paydayNext;
}

/**
 * Days until the next *unpaid* payday. If `lastPaidAt` is on or after the
 * upcoming payday, that cycle is considered already covered — the count rolls
 * to the following month automatically.
 */
export function nextUnpaidPaydayDays(
  dayOfMonth: number,
  lastPaidAt: string | null,
  from: Date = new Date(),
): number {
  const startOfToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  startOfToday.setHours(0, 0, 0, 0);
  let candidate = nextMonthlyPayday(dayOfMonth, from);
  if (lastPaidAt) {
    const paid = new Date(lastPaidAt);
    paid.setHours(0, 0, 0, 0);
    if (paid >= candidate) {
      // This cycle is covered — roll to next month.
      const y = candidate.getFullYear();
      const m = candidate.getMonth() + 1;
      const nextDays = new Date(y, m + 1, 0).getDate();
      candidate = new Date(y, m, Math.min(dayOfMonth, nextDays));
      candidate.setHours(0, 0, 0, 0);
    }
  }
  return Math.round((candidate.getTime() - startOfToday.getTime()) / 86400000);
}

const today = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const seedSalon: Salon = {
  id: SALON_ID,
  name: "Central Studio",
  business_type: "beauty",
  latitude: 6.4318,
  longitude: 3.4271,
  geofence_radius_meters: 50,
  currency: "NGN",
  open_time: "08:00",
  close_time: "20:00",
  payroll_reminder_days: 7,
  owner_id: "u-owner",
  created_at: today(8),
};

export const seedProfiles: Profile[] = [
  {
    id: "u-owner",
    salon_id: SALON_ID,
    full_name: "Adaeze Okonkwo",
    role: "owner",
    job_title: null,
    commission_rate: 0,
    base_salary: null,
    salary_payday: null,
    salary_last_paid_at: null,
    bank_name: null,
    account_number: null,
    account_name: null,
    avatar_url: null,
  },
  {
    id: "u-recep",
    salon_id: SALON_ID,
    full_name: "Blessing Eze",
    role: "receptionist",
    job_title: null,
    commission_rate: 0,
    base_salary: null,
    salary_payday: null,
    salary_last_paid_at: null,
    bank_name: null,
    account_number: null,
    account_name: null,
    avatar_url: null,
  },
  {
    id: "u-staff-1",
    salon_id: SALON_ID,
    full_name: "Tunde Bakare",
    role: "staff",
    job_title: null,
    commission_rate: 0.5,
    base_salary: null,
    salary_payday: null,
    salary_last_paid_at: null,
    bank_name: "GTBank",
    account_number: "0123456789",
    account_name: "Tunde Bakare",
    avatar_url: null,
  },
  {
    id: "u-staff-2",
    salon_id: SALON_ID,
    full_name: "Chidinma Nwosu",
    role: "staff",
    job_title: null,
    commission_rate: 0.5,
    base_salary: null,
    salary_payday: null,
    salary_last_paid_at: null,
    bank_name: "Access Bank",
    account_number: "0234567890",
    account_name: "Chidinma Nwosu",
    avatar_url: null,
  },
  {
    id: "u-staff-3",
    salon_id: SALON_ID,
    full_name: "Musa Ibrahim",
    role: "staff",
    job_title: null,
    commission_rate: 0.5,
    base_salary: null,
    salary_payday: null,
    salary_last_paid_at: null,
    bank_name: "Zenith Bank",
    account_number: "0345678901",
    account_name: "Musa Ibrahim",
    avatar_url: null,
  },
];

export const seedInventory: InventoryItem[] = [
  {
    id: "inv-1",
    salon_id: SALON_ID,
    item_name: "Consumable A",
    quantity: 0,
    unit: "bottles",
    reorder_level: 6,
  },
  {
    id: "inv-2",
    salon_id: SALON_ID,
    item_name: "Cleaning Solution (1L)",
    quantity: 0,
    unit: "bottles",
    reorder_level: 4,
  },
  {
    id: "inv-3",
    salon_id: SALON_ID,
    item_name: "Refill Kit",
    quantity: 0,
    unit: "packs",
    reorder_level: 5,
  },
  {
    id: "inv-4",
    salon_id: SALON_ID,
    item_name: "Disposable Gloves",
    quantity: 0,
    unit: "boxes",
    reorder_level: 6,
  },
  {
    id: "inv-5",
    salon_id: SALON_ID,
    item_name: "Spare Parts",
    quantity: 0,
    unit: "pcs",
    reorder_level: 3,
  },
];

export const seedServices: Service[] = [
  {
    id: "svc-1",
    salon_id: SALON_ID,
    name: "Basic Service",
    price: 5000,
    duration_minutes: 40,
    suggested_inventory: [{ inventory_id: "inv-5", quantity: 0.2 }],
  },
  {
    id: "svc-2",
    salon_id: SALON_ID,
    name: "Standard Service",
    price: 15000,
    duration_minutes: 90,
    suggested_inventory: [{ inventory_id: "inv-1", quantity: 1 }],
  },
  {
    id: "svc-3",
    salon_id: SALON_ID,
    name: "Express Service",
    price: 7000,
    duration_minutes: 45,
    suggested_inventory: [{ inventory_id: "inv-2", quantity: 0.5 }],
  },
  {
    id: "svc-4",
    salon_id: SALON_ID,
    name: "Premium Service",
    price: 18000,
    duration_minutes: 120,
    suggested_inventory: [{ inventory_id: "inv-3", quantity: 1 }],
  },
  {
    id: "svc-5",
    salon_id: SALON_ID,
    name: "Deluxe Service",
    price: 9000,
    duration_minutes: 60,
    suggested_inventory: [{ inventory_id: "inv-4", quantity: 0.5 }],
  },
  {
    id: "svc-6",
    salon_id: SALON_ID,
    name: "Add-on Service",
    price: 3500,
    duration_minutes: 25,
    suggested_inventory: [],
  },
];

export const seedAttendance: Attendance[] = [];

export const seedTickets: Ticket[] = [];

export const seedTicketItems: TicketItem[] = [];

export const seedUsage: TicketInventoryUsage[] = [];

export const seedExpenses: Expense[] = [];
