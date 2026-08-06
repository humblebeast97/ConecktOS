import type { Expense, InventoryItem, Ticket, TicketInventoryUsage, TicketItem } from "./groompulse";

const isSameDay = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return (
    d.getDate() === ref.getDate() &&
    d.getMonth() === ref.getMonth() &&
    d.getFullYear() === ref.getFullYear()
  );
};

const isToday = (iso: string) => isSameDay(iso, new Date());

export interface AuditReport {
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
}

export function buildAudit(
  args: {
    tickets: Ticket[];
    ticketItems: TicketItem[];
    usage: TicketInventoryUsage[];
    inventory: InventoryItem[];
    expenses: Expense[];
  },
  /** The day to audit. Defaults to today. */
  date: Date = new Date(),
): AuditReport {
  const todays = args.tickets.filter((t) => isSameDay(t.created_at, date));
  const paid = todays.filter((t) => t.status === "paid");
  const pending = todays.filter((t) => t.status === "pending");
  const paidIds = new Set(paid.map((t) => t.id));

  const byMethod = { pos: 0, bank_transfer: 0, cash: 0 };
  paid.forEach((t) => {
    byMethod[t.payment_method] += t.total_amount;
  });

  const gross = paid.reduce((s, t) => s + t.total_amount, 0);
  const items = args.ticketItems.filter((i) => paidIds.has(i.ticket_id));
  const commissionsPayable = items.reduce((s, i) => s + i.staff_commission_amount, 0);

  const todaysExpenses = args.expenses.filter((e) => isSameDay(e.logged_at, date));
  const fuelExpense = todaysExpenses
    .filter((e) => e.category === "generator_fuel")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpenses = todaysExpenses.reduce((s, e) => s + e.amount, 0);
  const generatorHours = todaysExpenses.reduce((s, e) => s + (e.generator_hours_run ?? 0), 0);

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

  return {
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
  };
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
