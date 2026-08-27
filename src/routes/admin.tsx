import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronsUpDown,
  Circle,
  Clock,
  Flame,
  FileDown,
  Fuel,
  LayoutDashboard,
  Percent,
  Plus,
  RotateCcw,
  Printer,
  Rocket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, MetricCard } from "@/components/app-shell";
import { TeamOnboarding } from "@/components/team-onboarding";
import { InventoryPanel } from "@/components/inventory-panel";
import { ServicesPanel } from "@/components/services-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useStore } from "@/lib/store";
import { useRoleGuard } from "@/lib/access";
import {
  earnsCommission,
  expenseLabel,
  naira,
  paymentLabel,
  timeOf,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/groompulse";
import { buildAudit } from "@/lib/reports";
import { usePaginated } from "@/lib/paginate";
import { LoadMore } from "@/components/load-more";
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
});

const ADMIN_ROLES = ["owner"] as const;

function AdminPage() {
  useRoleGuard(ADMIN_ROLES);
  const config = useIndustryConfig();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();
  const {
    salon,
    profiles,
    staff,
    inventory,
    tickets,
    ticketItems,
    usage,
    attendance,
    expenses,
    addExpense,
  } = useStore();

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
    setAttSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

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

  const {
    items: expensesPage,
    hasMore: hasMoreExpenses,
    loadMore: loadMoreExpenses,
    shown: shownExpenses,
    total: totalExpenses,
  } = usePaginated(expenses, 10);

  return (
    <AppShell
      title={tab === "team" ? "Team & HR" : "Owner Dashboard"}
      subtitle={
        tab === "team"
          ? `${salon.name} · manage the roster and onboard members`
          : `${salon.name} · ${new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}`
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
      <div className="no-print mb-5 flex w-fit items-center gap-1 rounded-full border border-border bg-surface p-1">
        {(
          [
            { key: "overview" as const, label: "Overview", icon: LayoutDashboard },
            { key: "team" as const, label: "Team", icon: Users },
          ]
        ).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate({ to: "/admin", search: { tab: t.key } })}
              aria-pressed={active}
              className={
                active
                  ? "flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-1.5 text-xs font-semibold text-gold-foreground transition-colors"
                  : "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "team" ? <TeamTab /> : null}
      {tab === "overview" ? <OnboardingChecklist /> : null}
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
                    <SortButton label={config.staffTitle} active={attSort.key === "name"} dir={attSort.dir} onClick={() => toggleSort("name")} />
                  </TableHead>
                  <TableHead aria-sort={ariaSort("clock")}>
                    <SortButton label="Clock in" active={attSort.key === "clock"} dir={attSort.dir} onClick={() => toggleSort("clock")} />
                  </TableHead>
                  <TableHead>Geofence</TableHead>
                  <TableHead className="text-right" aria-sort={ariaSort("commission")}>
                    <SortButton label="Commission" active={attSort.key === "commission"} dir={attSort.dir} onClick={() => toggleSort("commission")} align="right" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attRows.map(({ s, att, earned }) => (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="font-medium">
                      {s.full_name}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {Math.round(s.commission_rate * 100)}% rate
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {att ? timeOf(att.clock_in_time) : "—"}
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
                      {naira(earned)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-border md:hidden">
            {attRows.map(({ s, att, earned }) => (
              <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.full_name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {att ? (
                      <>
                        <span>in {timeOf(att.clock_in_time)}</span>
                        <span className={att.status === "late" ? "text-warning" : "text-success"}>
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
                  <p className="text-sm font-semibold tabular-nums text-primary">
                    {naira(earned)}
                  </p>
                </div>
              </li>
            ))}
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
          {/* Desktop / tablet: full table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Category</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Gen. hrs</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesPage.map((e) => (
                  <TableRow key={e.id} className="border-border">
                    <TableCell className="font-medium">{expenseLabel[e.category]}</TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {e.notes || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.generator_hours_run ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {naira(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-border md:hidden">
            {totalExpenses === 0 ? (
              <li className="px-5 py-4 text-sm text-muted-foreground">No expenses logged yet.</li>
            ) : (
              expensesPage.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{expenseLabel[e.category]}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {e.notes || "No notes"}
                      {e.generator_hours_run != null ? ` · ${e.generator_hours_run}h run` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {naira(e.amount)}
                  </span>
                </li>
              ))
            )}
          </ul>

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
  const { profiles, salon } = useStore();
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
  const { resetAll } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <RotateCcw className="size-4" />
          Start new period
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new period?</DialogTitle>
          <DialogDescription>
            Closes out the current period: clears tickets, commissions, expenses and attendance,
            and resets stock on hand to 0. Your team roster, services and inventory item list stay
            in place. Print the end-of-day audit first if you need a record.
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
              toast.success("New period started — figures reset to zero");
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
            placeholder="Diesel top-up — 20 litres"
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
  const { salon, tickets, ticketItems, usage, inventory, expenses } = useStore();
  const [dateStr, setDateStr] = useState(() => toDateInput(new Date()));
  const auditDate = useMemo(() => new Date(`${dateStr}T00:00:00`), [dateStr]);
  const audit = useMemo(
    () => buildAudit({ tickets, ticketItems, usage, inventory, expenses }, auditDate),
    [tickets, ticketItems, usage, inventory, expenses, auditDate],
  );
  const isTodaySelected = toDateInput(new Date()) === dateStr;
  const noActivity =
    audit.gross === 0 && audit.pendingCount === 0 && audit.totalExpenses === 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-11 font-semibold">
          <FileDown className="size-4" />
          Close Day & Audit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>End-of-day audit</DialogTitle>
          <DialogDescription>
            Reconcile revenue, commissions, overheads and stock discrepancies.
          </DialogDescription>
        </DialogHeader>

        <div className="no-print space-y-1.5">
          <Label htmlFor="audit-date">Audit date</Label>
          <Input
            id="audit-date"
            type="date"
            value={dateStr}
            max={toDateInput(new Date())}
            onChange={(e) => setDateStr(e.target.value || toDateInput(new Date()))}
            className="h-11 bg-surface"
          />
        </div>

        <div className="print-sheet rounded-2xl border border-border bg-gradient-surface p-5">
          <p className="font-display text-sm font-bold">{salon.name}</p>
          <p className="text-xs text-muted-foreground">
            {isTodaySelected ? "Daily audit" : "Day audit"} ·{" "}
            {auditDate.toLocaleDateString("en-NG", { dateStyle: "full" })}
          </p>
          {noActivity ? (
            <p className="mt-2 rounded-lg bg-surface px-3 py-1.5 text-xs text-muted-foreground">
              No recorded activity on this date.
            </p>
          ) : null}

          <Section title="Gross revenue">
            <Row label="POS" value={naira(audit.byMethod.pos)} />
            <Row label={paymentLabel.bank_transfer} value={naira(audit.byMethod.bank_transfer)} />
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

        <Button
          variant="outline"
          className="no-print"
          onClick={() => typeof window !== "undefined" && window.print()}
        >
          <Printer className="size-4" />
          Print / save as PDF
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function GeofenceBadge({ att }: { att?: { is_within_geofence: boolean; clock_in_lat: number | null } }) {
  if (!att) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Absent
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={
        att.is_within_geofence
          ? "border-success/40 text-success"
          : att.clock_in_lat === null
            ? "border-warning/40 text-warning"
            : "border-destructive/40 text-destructive"
      }
    >
      {att.is_within_geofence ? "Verified" : att.clock_in_lat === null ? "Unverified" : "Flagged"}
    </Badge>
  );
}

function OnboardingChecklist() {
  const { salon, staff, services, inventory } = useStore();
  const steps = [
    { label: "Complete your business profile", done: salon.latitude != null, to: "/settings" as const },
    { label: "Add your team", done: staff.length > 0, to: "/team" as const },
    { label: "Add your services", done: services.length > 0, to: "/reception" as const },
    { label: "Stock your inventory", done: inventory.length > 0, to: "/admin" as const },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.find((s) => !s.done);

  return (
    <section className="card-lux mb-5 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Getting started</h2>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
      </div>
      <Progress value={(doneCount / steps.length) * 100} className="mt-3 h-2" />
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            {s.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
            {!s.done && s === next ? (
              <Link
                to={s.to}
                className="ml-auto shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Do it →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 font-medium transition-colors hover:text-foreground ${
        align === "right" ? "flex-row-reverse" : ""
      } ${active ? "text-foreground" : ""}`}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-50" />
      )}
    </button>
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className={strong ? "shrink-0 font-display font-bold text-primary" : "shrink-0 font-medium"}>
        {value}
      </span>
    </div>
  );
}
