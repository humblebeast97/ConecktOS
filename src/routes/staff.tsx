import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  Banknote,
  Clock,
  Copy,
  LogOut,
  MapPin,
  Printer,
  QrCode,
  TrendingUp,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, MetricCard } from "@/components/app-shell";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { RouteError } from "@/components/route-error";
import { Skeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAttendance, useAuth, useSalon, useServices, useStaff, useTickets } from "@/api";
import { haversineMeters, naira, timeOf, type Profile, type Salon } from "@/lib/groompulse";
import { copyText } from "@/lib/clipboard";
import { staffDailyCommission } from "@/lib/reports";
import { printHTML } from "@/lib/print-sheet";
import { useIndustryConfig } from "@/config/industry-context";

// The QR library only renders inside the tip dialog. Load it on demand so it
// stays out of the staff route's initial bundle.
const QRCode = lazy(() => import("react-qr-code"));

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Portal · ConecktOS" },
      {
        name: "description",
        content:
          "Clock in with GPS, track today's commission in real time, review your service history and show your personal tipping QR code.",
      },
      { property: "og:title", content: "Staff Portal · ConecktOS" },
      {
        property: "og:description",
        content: "GPS clock-in, live commissions and a personal tip QR with your bank details.",
      },
    ],
  }),
  component: StaffPortal,
  errorComponent: RouteError,
});

function StaffPortal() {
  const config = useIndustryConfig();
  const { currentUser } = useAuth();
  const { staff } = useStaff();
  const { salon } = useSalon();
  const { tickets, ticketItems } = useTickets();
  const { services } = useServices();
  const { clockIn, clockOut, openAttendanceFor } = useAttendance();

  // Owners/receptionists previewing this portal see the first staff member's view.
  const me = currentUser.role === "staff" ? currentUser : staff[0];
  const [locating, setLocating] = useState(false);

  const open = openAttendanceFor(me.id);
  const [consentOpen, setConsentOpen] = useState(false);
  const daily = useMemo(
    () => staffDailyCommission(me.id, tickets, ticketItems),
    [me.id, tickets, ticketItems],
  );

  const hasLocationConsent = () =>
    typeof window !== "undefined" &&
    window.localStorage.getItem("conecktos-location-consent") === "granted";

  const startClockIn = () => {
    if (hasLocationConsent()) requestClockIn();
    else setConsentOpen(true);
  };

  const grantAndClockIn = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("conecktos-location-consent", "granted");
    }
    setConsentOpen(false);
    requestClockIn();
  };

  const requestClockIn = () => {
    setLocating(true);
    const evaluate = (coords: { lat: number; lng: number } | null) => {
      setLocating(false);
      // Location is required. We can't confirm you're at the business without it.
      if (!coords) {
        toast.error("Location required to clock in", {
          description: `Turn on location access. We verify you're at ${salon.name}.`,
        });
        return;
      }
      const distance = haversineMeters(coords.lat, coords.lng, salon.latitude, salon.longitude);
      if (distance <= salon.geofence_radius_meters) {
        clockIn(me.id, coords);
        toast.success("Clocked in", {
          description: `Verified ${Math.round(distance)}m from ${salon.name}.`,
        });
      } else {
        // Outside the business's geofence. Block the clock-in.
        toast.error("You're too far to clock in", {
          description: `You're ${Math.round(distance)}m from ${salon.name}. Get within ${salon.geofence_radius_meters}m and try again.`,
        });
      }
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      evaluate(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => evaluate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => evaluate(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <AppShell
      title={`Hey, ${me.full_name.split(" ")[0]}`}
      subtitle={`${salon.name} · commission rate ${Math.round(me.commission_rate * 100)}%`}
      actions={config.showTipping ? <TipQrDialog /> : null}
    >
      <OnboardingChecklist
        title="Your setup"
        steps={[
          { label: "Add your payout account", done: Boolean(me.account_number), to: "/staff" },
          { label: "Clock in for the first time", done: Boolean(open), to: "/staff" },
        ]}
      />
      {/* Clock-in hero. The staff member's primary action, status-tinted. */}
      <section
        className={
          open
            ? open.is_within_geofence
              ? "rounded-2xl border border-success/30 bg-success/10 p-5"
              : "rounded-2xl border border-destructive/30 bg-destructive/10 p-5"
            : "card-lux rounded-2xl p-5"
        }
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            {open ? (
              <>
                <p
                  className={
                    open.is_within_geofence
                      ? "inline-flex items-center gap-2 text-sm font-semibold text-success"
                      : "inline-flex items-center gap-2 text-sm font-semibold text-destructive"
                  }
                >
                  {open.is_within_geofence ? (
                    <MapPin className="size-4" />
                  ) : (
                    <ShieldAlert className="size-4" />
                  )}
                  {open.is_within_geofence
                    ? "Clocked in · within geofence"
                    : "Clocked in · outside geofence"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Since {timeOf(open.clock_in_time)}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">Ready to start your shift?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Clock in with GPS. Matched against {salon.name} within{" "}
                  {salon.geofence_radius_meters}m.
                </p>
              </>
            )}
          </div>
          {open ? (
            <Button
              size="lg"
              variant="outline"
              className="h-14 w-full text-base sm:w-52"
              onClick={() => {
                clockOut(me.id);
                toast.success("Clocked out. Have a great evening!");
              }}
            >
              <LogOut className="size-5" />
              Clock Out
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-14 w-full text-base font-semibold sm:w-52"
              disabled={locating}
              onClick={startClockIn}
            >
              {locating ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <MapPin className="size-5" />
              )}
              {locating ? "Locating…" : "Clock In"}
            </Button>
          )}
        </div>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Earned today"
          value={naira(daily.earned)}
          hint={`${daily.items.length} ${config.serviceTitle.toLowerCase()} jobs completed`}
          icon={Banknote}
          tone="gold"
        />
        <MetricCard
          label="Revenue generated"
          value={naira(daily.revenue)}
          hint="Billed to clients"
          icon={TrendingUp}
        />
        <MetricCard
          label="Shift status"
          value={open ? "On duty" : "Off duty"}
          hint={open ? `Since ${timeOf(open.clock_in_time)}` : "Not clocked in yet"}
          icon={Clock}
          tone={open ? "success" : "default"}
        />
        <MetricCard
          label="Geofence"
          value={
            open
              ? open.is_within_geofence
                ? "Verified"
                : "Flagged"
              : `${salon.geofence_radius_meters}m`
          }
          hint={open?.is_within_geofence === false ? "Outside business radius" : "Within radius"}
          icon={MapPin}
          tone={open && !open.is_within_geofence ? "danger" : "default"}
        />
      </div>

      <section className="card-lux mt-5 rounded-2xl p-5">
        <h2 className="text-lg font-bold">Today's {config.serviceTitle} history</h2>
        <ul className="mt-4 divide-y divide-border">
          {daily.items.length === 0 ? (
            <li className="py-6 text-sm text-muted-foreground">
              No {config.serviceTitle.toLowerCase()} billed to you yet today.
            </li>
          ) : (
            daily.items.map((item) => {
              const service = services.find((s) => s.id === item.service_id);
              const ticket = tickets.find((t) => t.id === item.ticket_id);
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {service?.name ?? (
                        <span className="italic text-muted-foreground">Service removed</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket ? (
                        <>
                          {ticket.client_name} · {timeOf(ticket.created_at)}
                        </>
                      ) : (
                        <span className="italic">Ticket no longer exists</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-primary">
                      {naira(item.staff_commission_amount)}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        ticket?.status === "paid"
                          ? "mt-1 border-success/40 text-success"
                          : "mt-1 border-warning/40 text-warning"
                      }
                    >
                      {ticket?.status === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Use your location to clock in?</DialogTitle>
            <DialogDescription>
              ConecktOS reads your device location once, only when you clock in, to confirm you're
              at {salon.name}. It's never tracked in the background. Clock-in only works on-site -
              within {salon.geofence_radius_meters}m of the business.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button className="h-11 font-semibold" onClick={grantAndClockIn}>
              <MapPin className="size-4" />
              Allow location &amp; clock in
            </Button>
            <Button variant="outline" className="h-11" onClick={() => setConsentOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function printTipCard({
  salon,
  me,
  tipUrl,
}: {
  salon: Salon;
  me: Profile;
  tipUrl: string;
}): void {
  const svg = document.querySelector<SVGElement>('[role="dialog"] svg[viewBox]');
  const qr = svg
    ? svg.outerHTML.replace(/<svg /, '<svg width="240" height="240" ')
    : "";
  const first = me.full_name.split(" ")[0];
  const escape = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  printHTML(
    `Tip ${first} · ${salon.name}`,
    `
      <div style="text-align:center;padding-top:12mm">
        <p style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#666;margin:0 0 24px">${escape(salon.name)}</p>
        <div style="display:inline-block;padding:12px;background:#fff;border:1px solid #ccc;border-radius:8px">${qr}</div>
        <h1 style="margin-top:24px;font-size:22px">Tip ${escape(first)}</h1>
        <p class="subtitle">Scan to tip ${escape(first)} by bank transfer.</p>
        <p class="footnote" style="margin-top:28px">${escape(tipUrl)}</p>
      </div>
    `,
  );
}

function TipQrDialog() {
  const { currentUser } = useAuth();
  const { staff } = useStaff();
  const { salon } = useSalon();
  const me = currentUser.role === "staff" ? currentUser : staff[0];
  const hasBank = Boolean(me.account_number);
  const accountName = me.account_name ?? me.full_name;
  // Encode a link to the public tip page (details in the URL so it works on any
  // device without a backend). Swap to /tip/{id} once real data exists.
  const tipUrl =
    typeof window !== "undefined" && hasBank
      ? `${window.location.origin}/tip?` +
        new URLSearchParams({
          n: me.full_name,
          b: me.bank_name ?? "",
          a: me.account_number ?? "",
          an: accountName,
          biz: salon.name,
        })
          .toString()
          // Router decodes %20 (not "+") back to spaces.
          .replace(/\+/g, "%20")
      : "";

  const copyAccount = async () => {
    if (!me.account_number) return;
    const ok = await copyText(me.account_number);
    if (ok) toast.success("Account number copied");
    else toast.error("Couldn't copy. Long-press to copy manually");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-11">
          <QrCode className="size-4" />
          Show My Tip QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tip {me.full_name.split(" ")[0]}</DialogTitle>
          <DialogDescription>
            {hasBank
              ? "Clients scan or copy your bank details to transfer a tip directly."
              : "No payout account yet. Ask your manager to add your bank details."}
          </DialogDescription>
        </DialogHeader>

        {hasBank ? (
          <>
            <div className="rounded-2xl border border-primary/30 bg-gradient-surface p-5 text-center">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-primary">
                {salon.name}
              </p>
              <div className="mx-auto mt-4 grid size-[168px] w-fit place-items-center rounded-xl bg-white p-3">
                <Suspense fallback={<Skeleton className="size-[144px] bg-black/5" />}>
                  <QRCode value={tipUrl} size={168} bgColor="#ffffff" fgColor="#111318" />
                </Suspense>
              </div>

              <div>
                <p className="mt-4 font-display text-lg font-bold">{me.full_name}</p>
                <div className="mt-2 text-sm">
                  <p className="text-muted-foreground">{me.bank_name}</p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="font-display text-lg font-bold tracking-wider tabular-nums">
                      {me.account_number}
                    </span>
                    <button
                      type="button"
                      onClick={copyAccount}
                      aria-label="Copy account number"
                      className="grid size-11 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground active:scale-95 sm:size-7"
                    >
                      <Copy className="size-5 sm:size-3.5" />
                    </button>
                  </div>
                  <p className="text-muted-foreground">{accountName}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="w-full text-[11px] uppercase tracking-wider text-muted-foreground">
                    Suggested tip
                  </span>
                  {["₦1,000", "₦2,000", "₦5,000"].map((amt) => (
                    <span
                      key={amt}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold"
                    >
                      {amt}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Scan to view details, or copy the account number and transfer.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => printTipCard({ salon, me, tipUrl })}
            >
              <Printer className="size-4" />
              Print mirror card
            </Button>
          </>
        ) : (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-center text-sm text-warning">
            Your bank details aren't set up yet. Ask your manager to add them from the team roster.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
