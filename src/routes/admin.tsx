import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  FileDown,
  Fuel,
  LayoutDashboard,
  Lock,
  Percent,
  Plus,
  RotateCcw,
  Printer,
  Search,
  Rocket,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, MetricCard } from "@/components/app-shell";
import { TeamOnboarding } from "@/components/team-onboarding";
import { InventoryPanel } from "@/components/inventory-panel";
import { ServicesPanel } from "@/components/services-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAdminOps,
  useAttendance,
  useAuth,
  useExpenses,
  useInventory,
  useSalon,
  useServices,
  useStaff,
  useTickets,
} from "@/api";
import { useRoleGuard } from "@/lib/access";
import {
  compensationLabel,
  compensationType,
  earnsCommission,
  EXPENSE_VOID_WINDOW_MS,
  expenseLabel,
  naira,
  paymentLabel,
  timeOf,
  type Expense,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/groompulse";
import { buildAudit } from "@/lib/reports";
import { usePaginated } from "@/lib/paginate";
import { LoadMore } from "@/components/load-more";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { SortButton } from "@/components/sort-button";
import { GeofenceBadge } from "@/components/geofence-badge";
import { PayrollReminderCard } from "@/components/payroll-reminder-card";
import { currentGreeting } from "@/lib/greeting";
import { printHTML } from "@/lib/print-sheet";
import { RouteError } from "@/components/route-error";
import { useIndustryConfig } from "@/config/industry-context";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { tab?: "overview" | "team" } => ({
    tab: search.tab === "team" ? "team" : search.tab === "overview" ? "overview" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Owner Dashboard · ConecktOS" },
      {
        name: "description",
        content:
          "Track revenue, staff commissions, attendance, low stock and the end-of-day audit.",
      },
      { property: "og:title", content: "Owner Dashboard · ConecktOS" },
      {
        property: "og:description",
        content: "Revenue, commissions, expenses and end-of-day audit for business owners.",
      },
    ],
  }),
  component: AdminPage,
  errorComponent: RouteError,
});

const ADMIN_ROLES = ["owner"] as const;

function AdminPage() {
  useRoleGuard(ADMIN_ROLES);
  const config = useIndustryConfig();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();
  const { salon } = useSalon();
  const { staff, profiles } = useStaff();
  const { inventory, usage } = useInventory();
  const { tickets, ticketItems } = useTickets();
  const { attendance } = useAttendance();
  const { expenses, addExpense, voidExpense } = useExpenses();
  const { currentUser } = useAuth();

  const audit = useMemo(
    () => buildAudit({ tickets, ticketItems, usage, inventory, expenses }),
    [tickets, ticketItems, usage, inventory, expenses],
  );
  const offsiteAlerts = attendance.filter((a) => !a.is_within_geofence);

  const [attSort, setAttSort] = useState<{
    key: "name" | "clock" | "commission";
    dir: "asc" | "desc";
  }>({ key: "commission", dir: "desc" });

  const toggleSort = (key: "name" | "clock" | "commission") =>
    setAttSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  const ariaSort = (key: "name" | "clock" | "commission") =>
    attSort.key === key ? (attSort.dir === "asc" ? "ascending" : "descending") : "none";

  const attRows = useMemo(() => {
    const rows = staff.map((s) => ({
      s,
      att: attendance.find((a) => a.staff_id === s.id),
      earned: ticketItems
        .filter((i) => i.staff_id === s.id)
        .reduce((sum, i) => sum + i.staff_commission_amount, 0),
    }));
    const dir = attSort.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      if (attSort.key === "name") return a.s.full_name.localeCompare(b.s.full_name) * dir;
      if (attSort.key === "clock") {
        const at = a.att ? new Date(a.att.clock_in_time).getTime() : Infinity;
        const bt = b.att ? new Date(b.att.clock_in_time).getTime() : Infinity;
        return (at - bt) * dir;
      }
      return (a.earned - b.earned) * dir;
    });
  }, [staff, attendance, ticketItems, attSort]);

  const [expenseQuery, setExpenseQuery] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<"all" | ExpenseCategory>("all");
  const filteredExpenses = useMemo(() => {
    const q = expenseQuery.trim().toLowerCase();
    return expenses.filter((e) => {
      if (expenseCategory !== "all" && e.category !== expenseCategory) return false;
      if (!q) return true;
      const haystack = `${expenseLabel[e.category]} ${e.notes ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [expenses, expenseQuery, expenseCategory]);
  const {
    items: expensesPage,
    hasMore: hasMoreExpenses,
    loadMore: loadMoreExpenses,
    shown: shownExpenses,
    total: totalExpenses,
  } = usePaginated(filteredExpenses, 10);

  return (
    <AppShell
      title={tab === "team" ? "Team & HR" : `${currentGreeting()}, ${salon.name}`}
      subtitle={
        tab === "team"
          ? `${salon.name} · manage the roster and onboard members`
          : new Date().toLocaleDateString("en-NG", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })
      }
      actions={
        tab === "overview" ? (
          <>
            <ResetAllDialog />
            <CloseDayDialog />
          </>
        ) : null
      }
    >
      <div className="mb-5 flex w-fit items-center gap-1 rounded-full border border-border bg-surface p-1">
        {[
          { key: "overview" as const, label: "Overview", icon: LayoutDashboard },
          { key: "team" as const, label: "Team", icon: Users },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate({ to: "/admin", search: { tab: t.key } })}
              aria-pressed={active}
              className={
                active
                  ? "flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-1.5 text-xs font-semibold text-gold-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  : "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              }
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "team" ? <TeamTab /> : null}
      {tab === "overview" ? <OwnerOnboarding /> : null}
      {tab === "overview" ? <PayrollReminderCard /> : null}
      {tab === "overview" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Gross revenue"
              value={naira(audit.gross)}
              hint={`${naira(audit.pendingAmount)} still pending`}
              icon={TrendingUp}
              tone="gold"
            />
            <MetricCard
              label="Commissions payable"
              value={naira(audit.commissionsPayable)}
              hint={`${audit.billedServices} billed ${config.serviceTitle.toLowerCase()} jobs`}
              icon={Wallet}
            />
            <MetricCard
              label={config.powerCostLabel}
              value={naira(audit.fuelExpense)}
              hint={`${audit.generatorHours}h run · ${naira(audit.overheadPerService)}/service`}
              icon={Fuel}
              tone={audit.fuelExpense > 0 ? "danger" : "default"}
            />
            <MetricCard
              label="Net position"
              value={naira(audit.netPosition)}
              hint="Revenue − commissions − expenses"
              icon={Banknote}
              tone={audit.netPosition >= 0 ? "success" : "danger"}
            />
          </div>

          <section className="card-lux mt-5 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Revenue by method</h2>
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {naira(audit.gross)} total
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["pos", "bank_transfer", "cash"] as PaymentMethod[]).map((m) => {
                const val = audit.byMethod[m];
                const pct = audit.gross > 0 ? Math.round((val / audit.gross) * 100) : 0;
                return (
                  <div key={m} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{paymentLabel[m]}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                    </div>
                    <p className="mt-1 font-display text-lg font-bold tabular-nums">{naira(val)}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-gradient-gold transition-[width] duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {(offsiteAlerts.length > 0 || audit.discrepancies.length > 0) && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {offsiteAlerts.length > 0 ? (
                <AlertCard
                  title={`${offsiteAlerts.length} off-site clock-in${offsiteAlerts.length > 1 ? "s" : ""}`}
                  body={offsiteAlerts
                    .map((a) => profiles.find((p) => p.id === a.staff_id)?.full_name)
                    .join(", ")}
                />
              ) : null}
              {audit.discrepancies.length > 0 ? (
                <AlertCard
                  title="Inventory discrepancy"
                  body={audit.discrepancies
                    .map((d) => `${d.quantity} ${d.unit} ${d.item} used with no billed ticket`)
                    .join(" · ")}
                />
              ) : null}
            </div>
          )}

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section className="card-lux overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-3 p-5 pb-3">
                <h2 className="text-lg font-bold">{config.staffPlural} attendance & earnings</h2>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              {/* Desktop / tablet: full table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead aria-sort={ariaSort("name")}>
                        <SortButton
                          label={config.staffTitle}
                          active={attSort.key === "name"}
                          dir={attSort.dir}
                          onClick={() => toggleSort("name")}
                        />
                      </TableHead>
                      <TableHead aria-sort={ariaSort("clock")}>
                        <SortButton
                          label="Clock in"
                          active={attSort.key === "clock"}
                          dir={attSort.dir}
                          onClick={() => toggleSort("clock")}
                        />
                      </TableHead>
                      <TableHead>Geofence</TableHead>
                      <TableHead className="text-right" aria-sort={ariaSort("commission")}>
                        <SortButton
                          label="Commission"
                          active={attSort.key === "commission"}
                          dir={attSort.dir}
                          onClick={() => toggleSort("commission")}
                          align="right"
                        />
                      </TableHead>
                      <TableHead className="text-right">Salary (monthly)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attRows.map(({ s, att, earned }) => {
                      const comp = compensationType(s);
                      return (
                        <TableRow key={s.id} className="border-border">
                          <TableCell className="font-medium">
                            {s.full_name}
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-[1px] text-[10px] font-medium">
                                <span className="size-1.5 rounded-full bg-current opacity-60" />
                                {compensationLabel[comp]}
                              </span>
                              {comp !== "salary" ? (
                                <span>{Math.round(s.commission_rate * 100)}% rate</span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {att ? timeOf(att.clock_in_time) : "-"}
                            {att ? (
                              <span
                                className={
                                  att.status === "late"
                                    ? "block text-xs text-warning"
                                    : "block text-xs text-success"
                                }
                              >
                                {att.status === "late" ? "Late" : "On time"}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <GeofenceBadge att={att} />
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-primary">
                            {comp === "salary" ? "-" : naira(earned)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {s.base_salary ? (
                              naira(s.base_salary)
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: stacked cards */}
              <ul className="divide-y divide-border md:hidden">
                {attRows.map(({ s, att, earned }) => {
                  const comp = compensationType(s);
                  return (
                    <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{s.full_name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {att ? (
                            <>
                              <span>in {timeOf(att.clock_in_time)}</span>
                              <span
                                className={att.status === "late" ? "text-warning" : "text-success"}
                              >
                                ({att.status === "late" ? "late" : "on time"})
                              </span>
                            </>
                          ) : (
                            <span>not clocked in</span>
                          )}
                        </p>
                        <div className="mt-1.5">
                          <GeofenceBadge att={att} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {comp !== "salary" ? (
                          <p className="text-sm font-semibold tabular-nums text-primary">
                            {naira(earned)}
                          </p>
                        ) : null}
                        {s.base_salary ? (
                          <p className="text-xs tabular-nums text-muted-foreground">
                            +{naira(s.base_salary)}/mo
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="space-y-5">
              {config.showInventory ? <InventoryPanel /> : null}
              <ServicesPanel />
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <ExpenseForm onSubmit={addExpense} />

            <section className="card-lux overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-3 p-5 pb-3">
                <h2 className="text-lg font-bold">Expense log</h2>
                <Flame className="size-4 text-muted-foreground" />
              </div>
              <div className="grid gap-2 px-5 pb-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={expenseQuery}
                    onChange={(e) => setExpenseQuery(e.target.value)}
                    placeholder="Search notes or category"
                    aria-label="Search expenses"
                    className="h-10 bg-surface pl-9 text-sm"
                  />
                </div>
                <Select
                  value={expenseCategory}
                  onValueChange={(v) => setExpenseCategory(v as "all" | ExpenseCategory)}
                >
                  <SelectTrigger
                    className="h-10 bg-surface text-sm"
                    aria-label="Filter by category"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {(Object.keys(expenseLabel) as ExpenseCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {expenseLabel[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {expenses.length > 0 && totalExpenses === 0 ? (
                <p className="px-5 pb-3 text-xs text-muted-foreground">
                  No expenses match this filter.
                </p>
              ) : null}
              {totalExpenses === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">
                  No expenses logged yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {expensesPage.map((e) => (
                    <ExpenseRow
                      key={e.id}
                      expense={e}
                      canVoid={
                        currentUser.role === "owner" || e.logged_by === currentUser.id
                      }
                      voiderName={
                        e.voided_by
                          ? profiles.find((p) => p.id === e.voided_by)?.full_name ?? "Someone"
                          : null
                      }
                      onVoid={(reason) => {
                        voidExpense(e.id, reason);
                        toast.success("Expense voided", {
                          description: `${expenseLabel[e.category]} · ${naira(e.amount)}`,
                        });
                      }}
                    />
                  ))}
                </ul>
              )}

              {totalExpenses > 0 ? (
                <div className="px-5 pb-4">
                  <LoadMore
                    hasMore={hasMoreExpenses}
                    onLoadMore={loadMoreExpenses}
                    shown={shownExpenses}
                    total={totalExpenses}
                  />
                </div>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function TeamTab() {
  const { profiles } = useStaff();
  const { salon } = useSalon();
  const floor = profiles.filter((p) => earnsCommission(p.role));
  const pendingPayouts = floor.filter((p) => !p.account_number).length;

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">
          {salon.name} · {floor.length} on the floor · {profiles.length - floor.length} at the desk
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Team size"
          value={String(profiles.length)}
          hint={`${floor.length} commission earners`}
          icon={Users}
        />
        <MetricCard
          label="Avg. commission"
          value={`${Math.round(
            (floor.reduce((s, p) => s + p.commission_rate, 0) / Math.max(1, floor.length)) * 100,
          )}%`}
          hint="Across floor roles"
          icon={Percent}
          tone="gold"
        />
        <MetricCard
          label="Payout setup"
          value={pendingPayouts === 0 ? "Complete" : `${pendingPayouts} pending`}
          hint="Bank payout details"
          icon={BadgeCheck}
          tone={pendingPayouts === 0 ? "success" : "danger"}
        />
      </div>
      <div className="mt-5">
        <TeamOnboarding />
      </div>
    </div>
  );
}

function ResetAllDialog() {
  const { resetAll } = useAdminOps();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <RotateCcw className="size-4" />
          Start new period
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a new period?</DialogTitle>
          <DialogDescription>
            Closes out the current period: clears tickets, commissions, expenses and attendance, and
            resets stock on hand to 0. Your team roster, services and inventory item list stay in
            place. Print the end-of-day audit first if you need a record.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              resetAll();
              setOpen(false);
              toast.success("New period started. Figures reset to zero");
            }}
          >
            <RotateCcw className="size-4" />
            Start new period
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AlertCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-destructive">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function ExpenseForm({
  onSubmit,
}: {
  onSubmit: (input: {
    category: ExpenseCategory;
    amount: number;
    generator_hours_run: number | null;
    notes: string;
  }) => void;
}) {
  const [category, setCategory] = useState<ExpenseCategory>("generator_fuel");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <section className="card-lux rounded-2xl p-5">
      <h2 className="text-lg font-bold">Log expense</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Diesel, maintenance and supplies feed the overhead-per-service calculation.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(amount);
          if (!value) {
            toast.error("Enter an amount");
            return;
          }
          onSubmit({
            category,
            amount: value,
            generator_hours_run: category === "generator_fuel" && hours ? Number(hours) : null,
            notes: notes.trim(),
          });
          toast.success("Expense logged");
          setAmount("");
          setHours("");
          setNotes("");
        }}
      >
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
            <SelectTrigger className="h-11 bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(expenseLabel) as ExpenseCategory[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {expenseLabel[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="18000"
              className="h-11 bg-surface"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours">Generator hours</Label>
            <Input
              id="hours"
              inputMode="decimal"
              value={hours}
              disabled={category !== "generator_fuel"}
              onChange={(e) => setHours(e.target.value)}
              placeholder="6"
              className="h-11 bg-surface"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Diesel top-up. 20 litres"
            className="h-11 bg-surface"
          />
        </div>
        <Button type="submit" className="h-12 w-full font-semibold">
          <Plus className="size-4" />
          Log expense
        </Button>
      </form>
    </section>
  );
}

const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function CloseDayDialog() {
  const { salon } = useSalon();
  const { tickets, ticketItems } = useTickets();
  const { inventory, usage } = useInventory();
  const { expenses } = useExpenses();
  const today = toDateInput(new Date());
  const [fromStr, setFromStr] = useState(today);
  const [toStr, setToStr] = useState(today);
  // Auto-swap when the user picks a To that predates From so the range stays valid.
  const [fromDate, toDate] = useMemo(() => {
    const a = new Date(`${fromStr}T00:00:00`);
    const b = new Date(`${toStr}T00:00:00`);
    return a <= b ? [a, b] : [b, a];
  }, [fromStr, toStr]);

  const audit = useMemo(
    () =>
      buildAudit(
        { tickets, ticketItems, usage, inventory, expenses },
        { from: fromDate, to: toDate },
      ),
    [tickets, ticketItems, usage, inventory, expenses, fromDate, toDate],
  );
  const isSingleDay = fromStr === toStr;
  const isToday = isSingleDay && fromStr === today;
  const rangeDays =
    Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const overCap = rangeDays > 366;
  const noActivity = audit.gross === 0 && audit.pendingCount === 0 && audit.totalExpenses === 0;

  const heading = isToday ? "Daily audit" : isSingleDay ? "Day audit" : "Period audit";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-11 font-semibold">
          <FileDown className="size-4" />
          Close Day & Audit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>End of period audit</DialogTitle>
          <DialogDescription>
            Reconcile revenue, commissions, overheads and stock across any period up to a year.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-gradient-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-sm font-bold">{salon.name}</p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {formatRange(fromDate, toDate)}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <SummaryMetric label="Gross" value={naira(audit.gross)} tone="gold" />
            <SummaryMetric
              label="Payouts"
              value={naira(audit.commissionsPayable + audit.totalExpenses)}
            />
            <SummaryMetric label="Net" value={naira(audit.netPosition)} tone="good" />
          </div>
          {noActivity ? (
            <p className="mt-3 rounded-lg bg-surface px-3 py-1.5 text-xs text-muted-foreground">
              No recorded activity in this period.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="audit-from">From</Label>
            <Input
              id="audit-from"
              type="date"
              value={fromStr}
              max={today}
              onChange={(e) => setFromStr(e.target.value || today)}
              className="h-11 bg-surface"
            />
          </div>
          <div className="mb-5 h-px w-3 bg-border" />
          <div className="space-y-1.5">
            <Label htmlFor="audit-to">To</Label>
            <Input
              id="audit-to"
              type="date"
              value={toStr}
              max={today}
              onChange={(e) => setToStr(e.target.value || today)}
              className="h-11 bg-surface"
            />
          </div>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {rangeDays} {rangeDays === 1 ? "day" : "days"}
          </span>
          {overCap ? <span className="text-primary">Max range: 12 months</span> : null}
        </div>

        <details className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground">
            View full breakdown
          </summary>
          <div className="mt-2 space-y-3">
            <Section title="Gross revenue">
              <Row label="POS" value={naira(audit.byMethod.pos)} />
              <Row
                label={paymentLabel.bank_transfer}
                value={naira(audit.byMethod.bank_transfer)}
              />
              <Row label="Cash" value={naira(audit.byMethod.cash)} />
              <Row label="Total collected" value={naira(audit.gross)} strong />
              <Row
                label="Unsettled tickets"
                value={`${audit.pendingCount} · ${naira(audit.pendingAmount)}`}
              />
            </Section>

            <Section title="Payouts & overheads">
              <Row label="Staff commissions payable" value={naira(audit.commissionsPayable)} />
              <Row label="Generator / fuel" value={naira(audit.fuelExpense)} />
              <Row label="All expenses" value={naira(audit.totalExpenses)} />
              <Row
                label="Generator overhead per billed service"
                value={naira(audit.overheadPerService)}
              />
              <Row label="Net position" value={naira(audit.netPosition)} strong />
            </Section>

            <Section title="Anti-fraud checks">
              {audit.discrepancies.length === 0 ? (
                <p className="text-xs text-success">
                  No stock movement without a matching billed ticket.
                </p>
              ) : (
                audit.discrepancies.map((d, i) => (
                  <p key={i} className="text-xs text-destructive">
                    ⚠ {d.quantity} {d.unit} of {d.item} consumed with no billed service ticket.
                  </p>
                ))
              )}
            </Section>
          </div>
        </details>

        <Button
          variant="outline"
          onClick={() =>
            printHTML(
              `${salon.name} · ${heading}`,
              renderAuditHTML({ salon, audit, heading }),
            )
          }
        >
          <Printer className="size-4" />
          Print / save as PDF
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function OwnerOnboarding() {
  const { salon } = useSalon();
  const { staff } = useStaff();
  const { services } = useServices();
  const { inventory } = useInventory();
  return (
    <OnboardingChecklist
      title="Owner setup"
      steps={[
        { label: "Complete your business profile", done: salon.latitude != null, to: "/settings" },
        { label: "Add your team", done: staff.length > 0, to: "/team" },
        { label: "Add your services", done: services.length > 0, to: "/reception" },
        { label: "Stock your inventory", done: inventory.length > 0, to: "/admin" },
      ]}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="audit-section mt-5 border-t border-border pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

/** Tick every N ms so time-sensitive UI (countdown chips) stays fresh. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function ExpenseRow({
  expense,
  canVoid,
  voiderName,
  onVoid,
}: {
  expense: Expense;
  canVoid: boolean;
  voiderName: string | null;
  onVoid: (reason: string) => void;
}) {
  const now = useNow(1000);
  const isVoided = Boolean(expense.voided_at);
  const loggedAt = new Date(expense.logged_at).getTime();
  const remaining = Math.max(0, loggedAt + EXPENSE_VOID_WINDOW_MS - now);
  const withinWindow = remaining > 0;
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  const timer = withinWindow
    ? `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`
    : null;

  return (
    <li
      className={`px-5 py-3.5 ${isVoided ? "bg-destructive/[0.04]" : ""}`}
      aria-label={isVoided ? "Voided expense" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${isVoided ? "text-muted-foreground line-through decoration-destructive/60" : ""}`}
          >
            {expenseLabel[expense.category]}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {expense.notes || "No notes"}
            {expense.generator_hours_run != null ? ` · ${expense.generator_hours_run}h run` : ""}
          </p>
          {isVoided ? (
            <p className="mt-1 text-xs text-destructive">
              Voided by {voiderName ?? "Someone"}
              {expense.void_reason ? ` · ${expense.void_reason}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`shrink-0 text-sm font-semibold tabular-nums ${isVoided ? "text-muted-foreground line-through decoration-destructive/60" : ""}`}
          >
            {naira(expense.amount)}
          </span>
          {isVoided ? (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
              Voided
            </span>
          ) : canVoid && withinWindow ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-full border-border px-3 text-xs text-muted-foreground hover:border-destructive/60 hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Undo2 className="size-3" />
              Void
              <span className="tabular-nums text-[10px] text-muted-foreground/80">{timer}</span>
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Lock className="size-2.5" />
              Locked
            </span>
          )}
        </div>
      </div>

      {confirming ? (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <Input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, e.g. typo)"
            className="h-9 bg-surface text-xs"
            maxLength={80}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 text-xs"
            onClick={() => {
              setConfirming(false);
              setReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-9 text-xs"
            onClick={() => {
              onVoid(reason);
              setConfirming(false);
              setReason("");
            }}
          >
            Confirm void
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span
        className={strong ? "shrink-0 font-display font-bold text-primary" : "shrink-0 font-medium"}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold" | "good";
}) {
  const color =
    tone === "gold" ? "text-primary" : tone === "good" ? "text-success" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-display text-base font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function formatRange(from: Date, to: Date): string {
  const same = from.toDateString() === to.toDateString();
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  if (same) return from.toLocaleDateString("en-NG", opts);
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromFmt: Intl.DateTimeFormatOptions = sameYear
    ? { day: "2-digit", month: "short" }
    : opts;
  return `${from.toLocaleDateString("en-NG", fromFmt)} to ${to.toLocaleDateString("en-NG", opts)}`;
}

function renderAuditHTML({
  salon,
  audit,
  heading,
}: {
  salon: { name: string };
  audit: ReturnType<typeof buildAudit>;
  heading: string;
}): string {
  const row = (label: string, value: string, strong = false) =>
    `<tr${strong ? ' class="strong"' : ""}><td class="label">${label}</td><td class="value">${value}</td></tr>`;
  const section = (title: string) => `<tr><th colspan="2">${title}</th></tr>`;
  const discrepancies = audit.discrepancies.length
    ? audit.discrepancies
        .map(
          (d) =>
            `<p class="footnote">⚠ ${d.quantity} ${d.unit} of ${d.item} consumed with no billed service ticket.</p>`,
        )
        .join("")
    : `<p class="footnote">No stock movement without a matching billed ticket.</p>`;

  const rangeLabel = formatRange(audit.from, audit.to);
  const rangeDays =
    Math.round((audit.to.getTime() - audit.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalPages = audit.monthly.length ? 2 : 1;

  const page1 = `
    <section class="page">
      <h1>${salon.name}</h1>
      <p class="subtitle">${heading} · ${rangeLabel}${totalPages === 1 ? "" : ` · ${rangeDays} days`}</p>
      <table>
        <tbody>
          ${section("Gross revenue")}
          ${row("POS", naira(audit.byMethod.pos))}
          ${row(paymentLabel.bank_transfer, naira(audit.byMethod.bank_transfer))}
          ${row("Cash", naira(audit.byMethod.cash))}
          ${row("Total collected", naira(audit.gross), true)}
          ${row("Unsettled tickets", `${audit.pendingCount} · ${naira(audit.pendingAmount)}`)}
          ${section("Payouts & overheads")}
          ${row("Staff commissions payable", naira(audit.commissionsPayable))}
          ${row("Generator / fuel", naira(audit.fuelExpense))}
          ${row("All expenses", naira(audit.totalExpenses))}
          ${row("Generator overhead per billed service", naira(audit.overheadPerService))}
          ${row("Net position", naira(audit.netPosition), true)}
          ${section("Anti-fraud checks")}
        </tbody>
      </table>
      ${discrepancies}
      <p class="pagemark">Page 1 of ${totalPages}</p>
    </section>
  `;

  const page2 = audit.monthly.length
    ? `
    <section class="page break">
      <h1>${salon.name}</h1>
      <p class="subtitle">Monthly breakdown · ${rangeLabel}</p>
      <table class="months">
        <thead>
          <tr>
            <th class="l">Month</th>
            <th class="v">Gross</th>
            <th class="v">Payouts</th>
            <th class="v">Net</th>
          </tr>
        </thead>
        <tbody>
          ${audit.monthly
            .map(
              (m) => `<tr>
              <td class="l">${m.label}</td>
              <td class="v">${naira(m.gross)}</td>
              <td class="v">${naira(m.payouts)}</td>
              <td class="v">${naira(m.net)}</td>
            </tr>`,
            )
            .join("")}
          <tr class="total">
            <td class="l">Total</td>
            <td class="v">${naira(audit.gross)}</td>
            <td class="v">${naira(audit.commissionsPayable + audit.totalExpenses)}</td>
            <td class="v">${naira(audit.netPosition)}</td>
          </tr>
        </tbody>
      </table>
      <p class="pagemark">Page 2 of ${totalPages}</p>
    </section>
  `
    : "";

  return page1 + page2;
}
