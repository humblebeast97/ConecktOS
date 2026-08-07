import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Banknote,
  Clock,
  LogOut,
  MapPin,
  Printer,
  QrCode,
  TrendingUp,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { AppShell, MetricCard } from "@/components/app-shell";
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
import { useStore } from "@/lib/store";
import { naira, timeOf } from "@/lib/groompulse";
import { staffDailyCommission } from "@/lib/reports";
import { useIndustryConfig } from "@/config/industry-context";

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
        content: "GPS clock-in, live commissions and personal Paystack tip QR for salon staff.",
      },
    ],
  }),
  component: StaffPortal,
});

function StaffPortal() {
  const config = useIndustryConfig();
  const {
    currentUser,
    staff,
    salon,
    tickets,
    ticketItems,
    services,
    clockIn,
    clockOut,
    openAttendanceFor,
  } = useStore();

  // Owners/receptionists previewing this portal see the first stylist's view.
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

  const clockInWithoutLocation = () => {
    setConsentOpen(false);
    clockIn(me.id, null);
    toast.error("Clocked in without location", {
      description: "Recorded as unverified for the owner to review.",
    });
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
    const finish = (coords: { lat: number; lng: number } | null) => {
      const { withinGeofence, distance } = clockIn(me.id, coords);
      setLocating(false);
      if (coords === null) {
        toast.error("Location unavailable", {
          description: "Clock-in recorded as unverified for the owner to review.",
        });
      } else if (withinGeofence) {
        toast.success("Clocked in", {
          description: `Verified ${Math.round(distance ?? 0)}m from ${salon.name}.`,
        });
      } else {
        toast.warning("Clocked in outside geofence", {
          description: `You are ${Math.round(distance ?? 0)}m away. The owner has been alerted.`,
        });
      }
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // Can't verify location on this device — record honestly as unverified.
      finish(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => finish(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <AppShell
      title={`Hey, ${me.full_name.split(" ")[0]}`}
      subtitle={`${salon.name} · commission rate ${Math.round(me.commission_rate * 100)}%`}
      actions={config.showTipping ? <TipQrDialog /> : null}
    >
      {/* Clock-in hero — the staff member's primary action, status-tinted. */}
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
                  Clock in with GPS — matched against {salon.name} within{" "}
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
              {locating ? <Loader2 className="size-5 animate-spin" /> : <MapPin className="size-5" />}
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
          value={open ? (open.is_within_geofence ? "Verified" : "Flagged") : `${salon.geofence_radius_meters}m`}
          hint={open?.is_within_geofence === false ? "Outside salon radius" : "Salon radius"}
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
                    <p className="truncate text-sm font-semibold">{service?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket?.client_name} · {ticket ? timeOf(ticket.created_at) : ""}
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
              ConecktOS reads your device location once, only when you clock in, to verify you're at{" "}
              {salon.name}. It's never tracked in the background. You can clock in without it — your
              record is simply marked unverified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button className="h-11 font-semibold" onClick={grantAndClockIn}>
              <MapPin className="size-4" />
              Allow location &amp; clock in
            </Button>
            <Button variant="outline" className="h-11" onClick={clockInWithoutLocation}>
              Clock in without location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function TipQrDialog() {
  const { currentUser, staff, salon } = useStore();
  const me = currentUser.role === "staff" ? currentUser : staff[0];
  const tipUrl = `https://paystack.com/pay/conecktos-tip?subaccount=${me.paystack_subaccount_code ?? "pending"}&staff=${encodeURIComponent(me.full_name)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="h-11">
          <QrCode className="size-4" />
          Show My Tip QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader className="no-print">
          <DialogTitle>Tip {me.full_name.split(" ")[0]}</DialogTitle>
          <DialogDescription>
            Clients scan to tip instantly. Funds route to your Paystack subaccount.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/30 bg-gradient-surface p-5 text-center">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-primary">
            {salon.name}
          </p>
          <div className="mx-auto mt-4 w-fit rounded-xl bg-white p-3">
            <QRCode value={tipUrl} size={168} bgColor="#ffffff" fgColor="#111318" />
          </div>
          <p className="mt-4 font-display text-lg font-bold">{me.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {me.paystack_subaccount_code ?? "Subaccount pending"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["₦1,000", "₦2,000", "₦5,000", "Custom"].map((amt) => (
              <span
                key={amt}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold"
              >
                {amt}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Scan with any phone camera · Secured by Paystack
          </p>
        </div>

        <Button
          variant="outline"
          className="no-print"
          onClick={() => typeof window !== "undefined" && window.print()}
        >
          <Printer className="size-4" />
          Print mirror card
        </Button>
      </DialogContent>
    </Dialog>
  );
}
