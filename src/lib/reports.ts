import type {
  Expense,
  InventoryItem,
  Ticket,
  TicketInventoryUsage,
  TicketItem,
} from "./groompulse";

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};
const endOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
};
const inRange = (iso: string, from: Date, to: Date) => {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

const isToday = (iso: string) => {
  const now = new Date();
  return inRange(iso, startOfDay(now), endOfDay(now));
};

export interface AuditRange {
  from: Date;
  to: Date;
}

export interface MonthlyBreakdownRow {
  key: string; // YYYY-MM
  label: string; // e.g. "March 2026"
  gross: number;
  payouts: number;
  net: number;
}

export interface AuditReport {
  from: Date;
  to: Date;
  gross: number;
  byMethod: { pos: number; bank_transfer: number; cash: number };
  pendingAmount: number;
  pendingCount: number;
  commissionsPayable: number;
  fuelExpense: number;
  totalExpenses: number;
  generatorHours: number;
  billedServices: number;
  overheadPerService: number;
  netPosition: number;
  discrepancies: { item: string; quantity: number; unit: string }[];
  monthly: MonthlyBreakdownRow[];
}

/**
 * Roll ticket + expense data into an audit for a date range (inclusive).
 * Defaults to today when only a single date or nothing is supplied.
 */
export function buildAudit(
  args: {
    tickets: Ticket[];
    ticketItems: TicketItem[];
    usage: TicketInventoryUsage[];
    inventory: InventoryItem[];
    expenses: Expense[];
  },
  range?: Date | AuditRange,
): AuditReport {
  const now = new Date();
  const from = startOfDay(
    range instanceof Date ? range : range?.from ?? now,
  );
  const to = endOfDay(
    range instanceof Date ? range : range?.to ?? range?.from ?? now,
  );

  const inWindow = args.tickets.filter((t) => inRange(t.created_at, from, to));
  const paid = inWindow.filter((t) => t.status === "paid");
  const pending = inWindow.filter((t) => t.status === "pending");
  const paidIds = new Set(paid.map((t) => t.id));

  const byMethod = { pos: 0, bank_transfer: 0, cash: 0 };
  paid.forEach((t) => {
    byMethod[t.payment_method] += t.total_amount;
  });

  const gross = paid.reduce((s, t) => s + t.total_amount, 0);
  const items = args.ticketItems.filter((i) => paidIds.has(i.ticket_id));
  const commissionsPayable = items.reduce((s, i) => s + i.staff_commission_amount, 0);

  // Voided expenses stay in the log for the audit trail, but never count
  // toward totals, generator overhead, or net position.
  const rangeExpenses = args.expenses.filter(
    (e) => !e.voided_at && inRange(e.logged_at, from, to),
  );
  const fuelExpense = rangeExpenses
    .filter((e) => e.category === "generator_fuel")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpenses = rangeExpenses.reduce((s, e) => s + e.amount, 0);
  const generatorHours = rangeExpenses.reduce((s, e) => s + (e.generator_hours_run ?? 0), 0);

  const billedServices = items.length;

  const discrepancies = args.usage
    .filter((u) => !u.ticket_id)
    .map((u) => {
      const item = args.inventory.find((i) => i.id === u.inventory_id);
      return {
        item: item?.item_name ?? "Unknown item",
        quantity: u.quantity_used,
        unit: item?.unit ?? "units",
      };
    });

  const monthly = buildMonthlyBreakdown({
    paid,
    items,
    expenses: rangeExpenses,
    from,
    to,
  });

  return {
    from,
    to,
    gross,
    byMethod,
    pendingAmount: pending.reduce((s, t) => s + t.total_amount, 0),
    pendingCount: pending.length,
    commissionsPayable,
    fuelExpense,
    totalExpenses,
    generatorHours,
    billedServices,
    overheadPerService: billedServices ? Math.round(fuelExpense / billedServices) : 0,
    netPosition: gross - commissionsPayable - totalExpenses,
    discrepancies,
    monthly,
  };
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthlyBreakdown({
  paid,
  items,
  expenses,
  from,
  to,
}: {
  paid: Ticket[];
  items: TicketItem[];
  expenses: Expense[];
  from: Date;
  to: Date;
}): MonthlyBreakdownRow[] {
  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
    return [];
  }
  const buckets = new Map<string, { gross: number; commissions: number; expenses: number }>();
  // Seed a bucket for every calendar month the range touches so empty months
  // still appear in the breakdown (readers care that a zero month happened).
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const stop = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= stop) {
    const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(k, { gross: 0, commissions: 0, expenses: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const seed = (k: string) => {
    if (!buckets.has(k)) buckets.set(k, { gross: 0, commissions: 0, expenses: 0 });
    return buckets.get(k)!;
  };
  const ticketMonth = new Map<string, string>();
  paid.forEach((t) => {
    const k = monthKey(t.created_at);
    ticketMonth.set(t.id, k);
    seed(k).gross += t.total_amount;
  });
  items.forEach((i) => {
    const k = ticketMonth.get(i.ticket_id);
    if (k) seed(k).commissions += i.staff_commission_amount;
  });
  expenses.forEach((e) => {
    seed(monthKey(e.logged_at)).expenses += e.amount;
  });
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-NG", {
        month: "long",
        year: "numeric",
      });
      const payouts = v.commissions + v.expenses;
      return { key, label, gross: v.gross, payouts, net: v.gross - payouts };
    });
}

export function staffDailyCommission(
  staffId: string,
  tickets: Ticket[],
  ticketItems: TicketItem[],
) {
  const todaysIds = new Set(tickets.filter((t) => isToday(t.created_at)).map((t) => t.id));
  const mine = ticketItems.filter((i) => i.staff_id === staffId && todaysIds.has(i.ticket_id));
  return {
    items: mine,
    earned: mine.reduce((s, i) => s + i.staff_commission_amount, 0),
    revenue: mine.reduce((s, i) => s + i.service_price, 0),
  };
}

export const lowStock = (inventory: InventoryItem[]) =>
  inventory.filter((i) => i.quantity <= i.reorder_level);

export { isToday };
