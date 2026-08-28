import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, CircleDollarSign, Loader2, Printer, Receipt, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell, MetricCard } from "@/components/app-shell";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAttendance, useSalon, useServices, useStaff, useTickets } from "@/api";
import { useRoleGuard } from "@/lib/access";
import { naira, paymentLabel, timeOf, type Ticket } from "@/lib/groompulse";
import { isToday } from "@/lib/reports";
import { useIndustryConfig } from "@/config/industry-context";

export const Route = createFileRoute("/reception")({
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
  const { staff, profiles } = useStaff();
  const { tickets, ticketItems, markPaid } = useTickets();
  const { attendance } = useAttendance();

  const todays = tickets.filter((t) => isToday(t.created_at));
  const openTickets = todays.filter((t) => t.status === "pending");
  const onDuty = attendance.filter((a) => !a.clock_out_time);

  return (
    <AppShell
      title="Front Desk"
      subtitle={`${todays.length} tickets today · ${onDuty.length} ${config.staffPlural.toLowerCase()} on duty`}
    >
      <OnboardingChecklist
        title="Front desk setup"
        steps={[
          { label: "Confirm today's roster is on duty", done: onDuty.length > 0, to: "/reception" },
          { label: "Bill your first ticket", done: tickets.length > 0, to: "/reception" },
          {
            label: "Match a paid ticket",
            done: tickets.some((t) => t.status === "paid"),
            to: "/reception",
          },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Tickets today"
          value={String(todays.length)}
          hint={`${openTickets.length} awaiting payment`}
          icon={Receipt}
        />
        <MetricCard
          label="Collected"
          value={naira(
            todays.filter((t) => t.status === "paid").reduce((s, t) => s + t.total_amount, 0),
          )}
          hint="Paid tickets only"
          icon={CircleDollarSign}
          tone="gold"
        />
        <MetricCard
          label="On duty"
          value={String(onDuty.length)}
          hint={`Clocked-in ${config.staffPlural.toLowerCase()}`}
          icon={Users}
          tone="success"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <TicketBuilder />

        <div className="space-y-5">
          <section className="card-lux rounded-2xl p-5">
            <h2 className="text-lg font-bold">Payment matcher</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm POS slips and bank alerts against open tickets.
            </p>
            <ul className="mt-4 space-y-3">
              {openTickets.length === 0 ? (
                <li className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  All tickets settled. 🎉
                </li>
              ) : (
                openTickets.map((t) => (
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
                ))
              )}
            </ul>
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
    </AppShell>
  );
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
      <DialogContent className="max-w-sm">
        <DialogHeader className="no-print">
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>Print or save this ticket as a receipt.</DialogDescription>
        </DialogHeader>

        <div className="print-sheet rounded-2xl border border-border bg-gradient-surface p-5">
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
                    <span className="block truncate">{svc?.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {who?.full_name}
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

function MatchRow({ onMatch, id }: { onMatch: (ref: string) => void; id: string }) {
  const [ref, setRef] = useState("");
  const { isSubmitting, submit } = useSubmit();
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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
      <Button
        size="sm"
        className="h-10"
        disabled={isSubmitting}
        onClick={() => submit(() => onMatch(ref.trim() || "MANUAL"))}
      >
        {isSubmitting ? <Loader2 className="size-3 animate-spin" /> : null}
        {isSubmitting ? "Matching…" : "Match"}
      </Button>
    </div>
  );
}
