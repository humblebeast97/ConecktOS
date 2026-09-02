import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CircleDollarSign,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Search,
  Users,
} from "lucide-react";
import { BottomNav, BottomNavSpacer, type BottomNavItem } from "@/components/bottom-nav";
import { HeroCard } from "@/components/hero-card";
import { MetricScroller } from "@/components/metric-scroller";
import { SetupRibbon } from "@/components/setup-ribbon";
import { toast } from "sonner";
import { AppShell, EmptyState, MetricCard } from "@/components/app-shell";
import { TeamOnboarding } from "@/components/team-onboarding";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { TicketBuilder } from "@/components/ticket-builder";
import { RouteError } from "@/components/route-error";
import { Label } from "@/components/ui/label";
import { useSubmit } from "@/lib/use-submit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadMore } from "@/components/load-more";
import { usePaginated } from "@/lib/paginate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAttendance, useAuth, useSalon, useServices, useStaff, useTickets } from "@/api";
import { currentGreeting } from "@/lib/greeting";
import { useRoleGuard } from "@/lib/access";
import {
  naira,
  paymentLabel,
  timeOf,
  type Profile,
  type Salon,
  type Service,
  type Ticket,
  type TicketItem,
} from "@/lib/groompulse";
import { isToday } from "@/lib/reports";
import { printHTML } from "@/lib/print-sheet";
import { useIndustryConfig } from "@/config/industry-context";

type ReceptionView = "tickets" | "history";
const RECEPTION_VIEWS: readonly ReceptionView[] = ["tickets", "history"] as const;

export const Route = createFileRoute("/reception")({
  validateSearch: (search: Record<string, unknown>): { view?: ReceptionView } => ({
    view: RECEPTION_VIEWS.includes(search.view as ReceptionView)
      ? (search.view as ReceptionView)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Front Desk · ConecktOS" },
      {
        name: "description",
        content:
          "Open service tickets, assign staff, auto-split commissions, match POS and bank transfer receipts and deduct inventory in one flow.",
      },
      { property: "og:title", content: "Front Desk · ConecktOS" },
      {
        property: "og:description",
        content:
          "Quick service billing, payment matching and live staff status for the front desk.",
      },
    ],
  }),
  component: ReceptionPage,
  errorComponent: RouteError,
});

const RECEPTION_ROLES = ["owner", "manager", "receptionist"] as const;

function ReceptionPage() {
  useRoleGuard(RECEPTION_ROLES);
  const config = useIndustryConfig();
  const { currentUser } = useAuth();
  const { staff, profiles } = useStaff();
  const { tickets, ticketItems, markPaid } = useTickets();
  const { attendance } = useAttendance();

  const todays = tickets.filter((t) => isToday(t.created_at));
  const openTickets = todays.filter((t) => t.status === "pending");
  const onDuty = attendance.filter((a) => !a.clock_out_time);

  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | "paid" | "pending">("all");
  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    const digitsOnly = q.replace(/\D/g, "");
    return tickets
      .filter((t) => {
        if (historyStatus !== "all" && t.status !== historyStatus) return false;
        if (!q) return true;
        if (t.client_name.toLowerCase().includes(q)) return true;
        if (digitsOnly && t.client_phone.replace(/\D/g, "").includes(digitsOnly)) return true;
        if (t.reference?.toLowerCase().includes(q)) return true;
        return false;
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [tickets, historyQuery, historyStatus]);
  const {
    items: historyPage,
    hasMore: hasMoreHistory,
    loadMore: loadMoreHistory,
    shown: shownHistory,
    total: totalHistory,
  } = usePaginated(filteredHistory, 8);

  const firstName = currentUser.full_name.split(" ")[0];
  const { view = "tickets" } = Route.useSearch();
  const navigate = useNavigate();
  const goToView = (v: ReceptionView) =>
    navigate({ to: "/reception", search: { view: v } });
  const navItems: BottomNavItem[] = [
    { key: "tickets", label: "Tickets", icon: Receipt, onClick: () => goToView("tickets") },
    { key: "history", label: "History", icon: Search, onClick: () => goToView("history") },
  ];

  const scrollToBuilder = () => {
    if (view !== "tickets") goToView("tickets");
    setTimeout(() => {
      const el = document.getElementById("ticket-builder");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <AppShell>
      <BottomNavSpacer>
      {view === "tickets" ? (
      <>
      <FrontDeskOnboarding
        billedAny={tickets.length > 0}
        matchedAny={tickets.some((t) => t.status === "paid")}
      />
      <HeroCard
        eyebrow={openTickets.length > 0 ? "Open at the desk" : "Front desk"}
        amount={
          openTickets.length > 0
            ? `${openTickets.length} ${openTickets.length === 1 ? "ticket" : "tickets"}`
            : "All clear"
        }
        badge={new Date().toLocaleDateString("en-NG", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
        caption={
          openTickets.length > 0
            ? `${naira(openTickets.reduce((s, t) => s + t.total_amount, 0))} waiting on payment`
            : "No open tickets"
        }
        metrics={[
          {
            label: "Paid today",
            value: String(todays.filter((t) => t.status === "paid").length),
          },
          {
            label: "Collected",
            value: naira(
              todays.filter((t) => t.status === "paid").reduce((s, t) => s + t.total_amount, 0),
            ),
            tone: "lime",
          },
        ]}
      />
      <div className="mt-4">
        <MetricScroller
          items={[
            {
              key: "onduty",
              label: "On duty",
              value: `${onDuty.length} / ${staff.length}`,
              hint: `clocked-in ${config.staffPlural.toLowerCase()}`,
              icon: Users,
              tone: "success",
            },
            {
              key: "tickets-today",
              label: "Tickets today",
              value: String(todays.length),
              hint: "billed so far",
              icon: Receipt,
            },
            {
              key: "waiting",
              label: "Awaiting",
              value: String(openTickets.length),
              hint: openTickets.length > 0 ? "needs matching" : "all settled",
              icon: CircleDollarSign,
              tone: openTickets.length > 0 ? "warning" : "success",
            },
          ]}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div id="ticket-builder" className="scroll-mt-20">
          <TicketBuilder />
        </div>

        <div className="space-y-5">
          <section className="card-lux rounded-2xl p-5">
            <h2 className="text-lg font-bold">Payment matcher</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm POS slips and bank alerts against open tickets.
            </p>
            {openTickets.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={BadgeCheck}
                  title="All tickets settled"
                  description="No open tickets waiting on a POS slip or transfer alert."
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {openTickets.map((t) => (
                  <li key={t.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{t.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {paymentLabel[t.payment_method]} · {timeOf(t.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-display text-sm font-bold tabular-nums">
                          {naira(t.total_amount)}
                        </span>
                        <ReceiptDialog ticket={t} />
                      </div>
                    </div>
                    <MatchRow
                      id={`match-${t.id}`}
                      onMatch={(ref) => {
                        markPaid(t.id, ref);
                        toast.success(`Ticket for ${t.client_name} marked paid`);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-lux rounded-2xl p-5">
            <h2 className="text-lg font-bold">{config.staffPlural} on duty</h2>
            <ul className="mt-4 space-y-2">
              {staff.map((s) => {
                const att = onDuty.find((a) => a.staff_id === s.id);
                const earned = ticketItems
                  .filter((i) => i.staff_id === s.id && todays.some((t) => t.id === i.ticket_id))
                  .reduce((sum, i) => sum + i.staff_commission_amount, 0);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {att ? `In at ${timeOf(att.clock_in_time)}` : "Not clocked in"} ·{" "}
                        {naira(earned)}
                      </p>
                    </div>
                    {att ? (
                      <Badge
                        variant="outline"
                        className={
                          att.is_within_geofence
                            ? "border-success/40 text-success"
                            : "border-destructive/40 text-destructive"
                        }
                      >
                        <BadgeCheck className="size-3" />
                        {att.is_within_geofence ? "On site" : "Off site"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Off
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Front desk HR</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Walk-in hires: onboard a {config.staffTitle.toLowerCase()} or desk role without leaving
            reception.
          </p>
        </div>
        <TeamOnboarding compact />
      </section>
      </>
      ) : null}

      {view === "history" ? (
      <section className="card-lux overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <div>
            <h2 className="text-lg font-bold">Ticket history</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every billed ticket, newest first. Search by client, phone or payment ref.
            </p>
          </div>
          <Receipt className="size-4 text-muted-foreground" />
        </div>
        <div className="grid gap-2 px-5 pb-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Search name, phone, ref"
              aria-label="Search tickets"
              className="h-10 bg-surface pl-9 text-sm"
            />
          </div>
          <Select
            value={historyStatus}
            onValueChange={(v) => setHistoryStatus(v as "all" | "paid" | "pending")}
          >
            <SelectTrigger className="h-10 bg-surface text-sm" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tickets.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={Receipt}
              title="No tickets yet"
              description="Bill your first ticket from the Quick service billing card above."
            />
          </div>
        ) : totalHistory === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No tickets match this search.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {historyPage.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.client_name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {paymentLabel[t.payment_method]} · {timeOf(t.created_at)}
                      {t.reference ? ` · ref ${t.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        t.status === "paid"
                          ? "border-success/40 text-success"
                          : "border-warning/40 text-warning"
                      }
                    >
                      {t.status === "paid" ? "Paid" : "Pending"}
                    </Badge>
                    <span className="font-display text-sm font-bold tabular-nums">
                      {naira(t.total_amount)}
                    </span>
                    <ReceiptDialog ticket={t} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-4">
              <LoadMore
                hasMore={hasMoreHistory}
                onLoadMore={loadMoreHistory}
                shown={shownHistory}
                total={totalHistory}
              />
            </div>
          </>
        )}
      </section>
      ) : null}
      </BottomNavSpacer>

      <BottomNav
        items={navItems}
        activeKey={view}
        fab={{
          label: "New ticket",
          icon: Plus,
          tone: "primary",
          onClick: scrollToBuilder,
        }}
      />
    </AppShell>
  );
}

function FrontDeskOnboarding({ billedAny, matchedAny }: { billedAny: boolean; matchedAny: boolean }) {
  const steps = [
    { label: "Bill your first ticket", done: billedAny, to: "/reception" as const },
    { label: "Match a paid ticket", done: matchedAny, to: "/reception" as const },
  ];
  if (steps.every((s) => s.done)) {
    return (
      <SetupRibbon
        storageKey="conecktos-front-desk-setup-dismissed"
        message="Front desk setup complete. Ready to bill."
      />
    );
  }
  return <OnboardingChecklist title="Front desk setup" steps={steps} />;
}

function ReceiptDialog({ ticket }: { ticket: Ticket }) {
  const { salon } = useSalon();
  const { ticketItems } = useTickets();
  const { services } = useServices();
  const { staff } = useStaff();
  const items = ticketItems.filter((i) => i.ticket_id === ticket.id);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={`Receipt for ${ticket.client_name || "walk-in"}`}
        >
          <Receipt className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>Print or save this ticket as a receipt.</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-display text-base font-bold">{salon.name}</p>
          <p className="text-xs text-muted-foreground">
            Receipt ·{" "}
            {new Date(ticket.created_at).toLocaleString("en-NG", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>

          <div className="mt-3 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{ticket.client_name || "Walk-in"}</span>
            </div>
            {ticket.client_phone ? (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{ticket.client_phone}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
            {items.map((it) => {
              const svc = services.find((s) => s.id === it.service_id);
              const who = staff.find((s) => s.id === it.staff_id);
              return (
                <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">
                      {svc?.name ?? (
                        <span className="italic text-muted-foreground">Service removed</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {who?.full_name ?? <span className="italic">Team member removed</span>}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {naira(it.service_price)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">
              {paymentLabel[ticket.payment_method]} ·{" "}
              {ticket.status === "paid" ? "Paid" : "Pending"}
            </span>
            <span className="font-display text-lg font-bold tabular-nums text-primary">
              {naira(ticket.total_amount)}
            </span>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Thank you for your patronage.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            printHTML(
              `${salon.name} · Receipt`,
              renderReceiptHTML({ salon, ticket, items, services, staff }),
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

function renderReceiptHTML({
  salon,
  ticket,
  items,
  services,
  staff,
}: {
  salon: Salon;
  ticket: Ticket;
  items: TicketItem[];
  services: Service[];
  staff: Profile[];
}): string {
  const when = new Date(ticket.created_at).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const escape = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const lines = items
    .map((it) => {
      const svc = services.find((s) => s.id === it.service_id);
      const who = staff.find((s) => s.id === it.staff_id);
      return `<tr>
        <td class="label">
          <div>${escape(svc?.name ?? "Service removed")}</div>
          <div style="font-size:11px;color:#666">${escape(who?.full_name ?? "Team member removed")}</div>
        </td>
        <td class="value">${naira(it.service_price)}</td>
      </tr>`;
    })
    .join("");
  return `
    <h1>${escape(salon.name)}</h1>
    <p class="subtitle">Receipt · ${escape(when)}</p>
    <table>
      <tbody>
        <tr><th colspan="2">Client</th></tr>
        <tr><td class="label">Name</td><td class="value">${escape(ticket.client_name || "Walk-in")}</td></tr>
        ${ticket.client_phone ? `<tr><td class="label">Phone</td><td class="value">${escape(ticket.client_phone)}</td></tr>` : ""}
        <tr><th colspan="2">Items</th></tr>
        ${lines}
        <tr><th colspan="2">${escape(paymentLabel[ticket.payment_method])} · ${ticket.status === "paid" ? "Paid" : "Pending"}</th></tr>
        <tr class="strong"><td class="label">Total</td><td class="value">${naira(ticket.total_amount)}</td></tr>
      </tbody>
    </table>
    <p class="footnote" style="text-align:center">Thank you for your patronage.</p>
  `;
}

function MatchRow({ onMatch, id }: { onMatch: (ref: string) => void; id: string }) {
  const [ref, setRef] = useState("");
  const { isSubmitting, submit } = useSubmit();
  return (
    <form
      className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit(() => onMatch(ref.trim() || "MANUAL"));
      }}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="sr-only">
          Payment reference
        </Label>
        <Input
          id={id}
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="POS / transfer ref"
          className="h-10 bg-background text-xs"
          maxLength={40}
        />
      </div>
      <Button type="submit" size="sm" className="h-10" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-3 animate-spin" /> : null}
        {isSubmitting ? "Matching…" : "Match"}
      </Button>
    </form>
  );
}
