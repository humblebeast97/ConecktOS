import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, MetricCard, EmptyState } from "@/components/app-shell";
import { TeamOnboarding } from "@/components/team-onboarding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore, type DraftLine } from "@/lib/store";
import { useRoleGuard } from "@/lib/access";
import { naira, paymentLabel, timeOf, type PaymentMethod, type Ticket } from "@/lib/groompulse";
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
        content: "Quick service billing, payment matching and live staff status for the front desk.",
      },
    ],
  }),
  component: ReceptionPage,
});

const RECEPTION_ROLES = ["owner", "manager", "receptionist"] as const;

function ReceptionPage() {
  useRoleGuard(RECEPTION_ROLES);
  const config = useIndustryConfig();
  const {
    services,
    staff,
    inventory,
    tickets,
    ticketItems,
    attendance,
    profiles,
    currentUser,
    createTicket,
    markPaid,
  } = useStore();

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [lookup, setLookup] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    services[0] && staff[0] ? [{ service_id: services[0].id, staff_id: staff[0].id }] : [],
  );
  const [method, setMethod] = useState<PaymentMethod>("pos");
  const [skipUsage, setSkipUsage] = useState<string[]>([]);

  const clients = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; visits: number; spend: number; last: string }
    >();
    tickets.forEach((t) => {
      const key = (t.client_phone || t.client_name).toLowerCase().trim();
      if (!key) return;
      const prev = map.get(key);
      map.set(key, {
        name: t.client_name,
        phone: t.client_phone,
        visits: (prev?.visits ?? 0) + 1,
        spend: (prev?.spend ?? 0) + t.total_amount,
        last: prev && prev.last > t.created_at ? prev.last : t.created_at,
      });
    });
    return [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [tickets]);

  const q = lookup.trim().toLowerCase();
  const matches = q
    ? clients
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
        )
        .slice(0, 5)
    : clients.slice(0, 4);

  const selected = clients.find(
    (c) =>
      c.name.toLowerCase() === clientName.trim().toLowerCase() ||
      (!!clientPhone.trim() && c.phone.replace(/\s/g, "") === clientPhone.replace(/\s/g, "")),
  );


  const suggestedUsage = useMemo(() => {
    const map = new Map<string, number>();
    lines.forEach((line) => {
      const service = services.find((s) => s.id === line.service_id);
      service?.suggested_inventory.forEach((s) => {
        map.set(s.inventory_id, (map.get(s.inventory_id) ?? 0) + s.quantity);
      });
    });
    return [...map.entries()].map(([inventory_id, quantity_used]) => ({
      inventory_id,
      quantity_used,
    }));
  }, [lines, services]);

  const preview = lines.map((line) => {
    const service = services.find((s) => s.id === line.service_id);
    const member = profiles.find((p) => p.id === line.staff_id);
    if (!service || !member) {
      return { ...line, price: 0, commission: 0, serviceName: "—", staffName: "—" };
    }
    return {
      ...line,
      price: service.price,
      commission: Math.round(service.price * member.commission_rate),
      serviceName: service.name,
      staffName: member.full_name,
    };
  });
  const total = preview.reduce((s, p) => s + p.price, 0);
  const commissionTotal = preview.reduce((s, p) => s + p.commission, 0);

  const todays = tickets.filter((t) => isToday(t.created_at));
  const openTickets = todays.filter((t) => t.status === "pending");
  const onDuty = attendance.filter((a) => !a.clock_out_time);

  const submit = (status: "pending" | "paid") => {
    if (!clientName.trim()) {
      toast.error(`${config.clientAssetLabel} is required`);
      return;
    }
    if (lines.length === 0) {
      toast.error(`Add at least one ${config.serviceTitle.toLowerCase()} to the ticket`);
      return;
    }
    const usage = suggestedUsage.filter((u) => !skipUsage.includes(u.inventory_id));
    createTicket({
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      payment_method: method,
      status,
      lines,
      usage,
      created_by: currentUser.id,
    });
    toast.success(status === "paid" ? "Ticket billed & paid" : "Ticket opened", {
      description: `${naira(total)} · ${usage.length} consumable(s) deducted`,
    });
    setClientName("");
    setClientPhone("");
    setLookup("");

    setLines(
      services[0] && staff[0] ? [{ service_id: services[0].id, staff_id: staff[0].id }] : [],
    );
    setSkipUsage([]);
  };

  return (
    <AppShell
      title="Front Desk"
      subtitle={`${todays.length} tickets today · ${onDuty.length} ${config.staffPlural.toLowerCase()} on duty`}
    >
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
        <section className="card-lux rounded-2xl p-5">
          <h2 className="text-lg font-bold">Quick {config.serviceTitle.toLowerCase()} billing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Commission splits are calculated automatically from each {config.staffTitle.toLowerCase()} rate.
          </p>

          {services.length === 0 || staff.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={Package}
                title={
                  services.length === 0
                    ? `No ${config.serviceTitle.toLowerCase()} set up yet`
                    : `No ${config.staffPlural.toLowerCase()} yet`
                }
                description={
                  services.length === 0
                    ? "An owner needs to add services before you can bill a ticket."
                    : "Add a team member before billing so commissions can be assigned."
                }
              />
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-border bg-surface p-3">
            <Label htmlFor="lookup" className="text-xs text-muted-foreground">
              Find an existing client
            </Label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lookup"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="Search by phone or name"
                className="h-11 bg-background pl-9"
              />
            </div>
            {clients.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                No clients yet — the first ticket you bill starts the client book.
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-2">
                  {matches.length === 0 ? (
                    <li className="text-xs text-muted-foreground">
                      No match for “{lookup}”. Type the details below to add a new client.
                    </li>
                  ) : (
                    matches.map((c) => (
                      <li key={c.phone || c.name}>
                        <button
                          type="button"
                          onClick={() => {
                            setClientName(c.name);
                            setClientPhone(c.phone);
                            setLookup("");
                            toast.success(`${c.name} loaded`, {
                              description: `${c.visits} visit(s) · ${naira(c.spend)} lifetime`,
                            });
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left hover:border-primary/50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{c.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {c.phone || "No phone"} · last {timeOf(c.last)}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {c.visits} visit{c.visits === 1 ? "" : "s"}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                {lookup.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      const isPhone = /^[\d+\s-]+$/.test(lookup.trim());
                      if (isPhone) setClientPhone(lookup.trim());
                      else setClientName(lookup.trim());
                      setLookup("");
                    }}
                  >
                    <UserPlus className="size-4" />
                    Add “{lookup.trim()}” as new client
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {selected ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-primary/40 text-primary">
                Returning client
              </Badge>
              {selected.visits} visit{selected.visits === 1 ? "" : "s"} · {naira(selected.spend)}{" "}
              lifetime spend
            </p>
          ) : clientName.trim() ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">New client</Badge>
              Will be saved to the client book on billing.
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">

            <div className="space-y-1.5">
              <Label htmlFor="client">
                {config.clientAssetLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client"
                required
                aria-required="true"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={config.clientAssetLabel}
                className="h-11 bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="0803 000 0000"
                className="h-11 bg-surface"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
              >
                <Select
                  value={line.service_id}
                  onValueChange={(v) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, service_id: v } : l)),
                    )
                  }
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {naira(s.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={line.staff_id}
                  onValueChange={(v) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === idx ? { ...l, staff_id: v } : l)),
                    )
                  }
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} · {Math.round(s.commission_rate * 100)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove this service line"
                  className="justify-self-end text-muted-foreground hover:text-destructive"
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!services[0] || !staff[0]}
              onClick={() =>
                setLines((prev) =>
                  services[0] && staff[0]
                    ? [...prev, { service_id: services[0].id, staff_id: staff[0].id }]
                    : prev,
                )
              }
            >
              <Plus className="size-4" />
              Add {config.serviceTitle.toLowerCase()}
            </Button>
          </div>

          {config.showInventory && suggestedUsage.length > 0 ? (
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Package className="size-4 text-primary" />
                Consumables to deduct
              </p>
              <div className="mt-3 space-y-2">
                {suggestedUsage.map((u) => {
                  const item = inventory.find((i) => i.id === u.inventory_id);
                  const checked = !skipUsage.includes(u.inventory_id);
                  return (
                    <label
                      key={u.inventory_id}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setSkipUsage((prev) =>
                            v ? prev.filter((id) => id !== u.inventory_id) : [...prev, u.inventory_id],
                          )
                        }
                      />
                      <span className="text-foreground">{item?.item_name}</span>
                      <span>
                        −{u.quantity_used} {item?.unit}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ticket total</span>
              <span className="font-display text-xl font-bold text-primary">{naira(total)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{config.staffPlural} commissions payable</span>
              <span>{naira(commissionTotal)}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["pos", "bank_transfer", "cash"] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  aria-pressed={method === m}
                  className={
                    method === m
                      ? "cursor-pointer rounded-xl border-2 border-primary/70 bg-primary/10 px-2 py-2.5 text-xs font-semibold text-primary transition-colors"
                      : "cursor-pointer rounded-xl border border-border px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  }
                >
                  {paymentLabel[m]}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="h-12" onClick={() => submit("pending")}>
                Open ticket
              </Button>
              <Button className="h-12 font-semibold" onClick={() => submit("paid")}>
                <CheckCircle2 className="size-4" />
                Bill and mark paid
              </Button>
            </div>
          </div>
        </section>

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
                    <MatchRow onMatch={(ref) => {
                      markPaid(t.id, ref);
                      toast.success(`Ticket for ${t.client_name} marked paid`);
                    }} />
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
                  .filter(
                    (i) =>
                      i.staff_id === s.id &&
                      todays.some((t) => t.id === i.ticket_id),
                  )
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
          <p className="mt-1 text-sm text-muted-foreground">Walk-in hires: onboard a {config.staffTitle.toLowerCase()} or desk role without leaving reception.</p>
        </div>
        <TeamOnboarding compact />
      </section>
    </AppShell>
  );
}

function ReceiptDialog({ ticket }: { ticket: Ticket }) {
  const { salon, ticketItems, services, staff } = useStore();
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
                  <span className="shrink-0 font-medium tabular-nums">{naira(it.service_price)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">
              {paymentLabel[ticket.payment_method]} · {ticket.status === "paid" ? "Paid" : "Pending"}
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

function MatchRow({ onMatch }: { onMatch: (ref: string) => void }) {
  const [ref, setRef] = useState("");
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <Input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="POS / transfer ref"
        className="h-10 bg-background text-xs"
      />
      <Button size="sm" className="h-10" onClick={() => onMatch(ref || "MANUAL")}>
        Match
      </Button>
    </div>
  );
}
