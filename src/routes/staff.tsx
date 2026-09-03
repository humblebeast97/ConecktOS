import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Clock,
  Copy,
  Home,
  LogOut,
  MapPin,
  Printer,
  QrCode,
  TrendingUp,
  User,
  Loader2,
} from "lucide-react";
import { BottomNav, BottomNavSpacer, type BottomNavItem } from "@/components/bottom-nav";
import { HeroCard } from "@/components/hero-card";
import { MetricScroller } from "@/components/metric-scroller";
import { SetupRibbon } from "@/components/setup-ribbon";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
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

type StaffView = "today" | "profile";
const STAFF_VIEWS: readonly StaffView[] = ["today", "profile"] as const;

export const Route = createFileRoute("/staff")({
  validateSearch: (search: Record<string, unknown>): { view?: StaffView } => ({
    view: STAFF_VIEWS.includes(search.view as StaffView) ? (search.view as StaffView) : undefined,
  }),
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
  const { view = "today" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tipQrOpen, setTipQrOpen] = useState(false);
  const navItems: BottomNavItem[] = [
    {
      key: "today",
      label: "Today",
      icon: Home,
      onClick: () => navigate({ search: { view: "today" } }),
    },
    { key: "tips", label: "Tip QR", icon: QrCode, onClick: () => setTipQrOpen(true) },
    {
      key: "profile",
      label: "Profile",
      icon: User,
      onClick: () => navigate({ search: { view: "profile" } }),
    },
  ];

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
          description: `You're ${Math.round(distance)}m from ${salon.address_label ?? salon.name}. Get within ${salon.geofence_radius_meters}m and try again.`,
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
    <AppShell>
      <BottomNavSpacer>
        {view === "today" ? (
          <>
            <StaffOnboarding hasBank={Boolean(me.account_number)} hasClockedIn={Boolean(open)} />
            <HeroCard
              eyebrow={
                open
                  ? `On duty since ${timeOf(open.clock_in_time)}${open.is_within_geofence ? "" : " · off-site"}`
                  : "Not clocked in yet"
              }
              amount={naira(daily.earned)}
              badge={new Date().toLocaleDateString("en-NG", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              caption={
                daily.items.length > 0
                  ? `${daily.items.length} ${config.serviceTitle.toLowerCase()} jobs completed today`
                  : "Clock in to start your shift"
              }
              metrics={[
                { label: "Revenue", value: naira(daily.revenue) },
                {
                  label: "Commission",
                  value: `${Math.round(me.commission_rate * 100)}%`,
                  tone: "lime",
                },
              ]}
              action={
                open ? (
                  <Button
                    size="sm"
                    className="h-9 rounded-full bg-lime px-4 text-xs font-bold text-lime-foreground hover:bg-lime/90"
                    onClick={() => {
                      clockOut(me.id);
                      toast.success("Clocked out. Have a great evening!");
                    }}
                  >
                    <LogOut className="size-3.5" />
                    Clock out
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-9 rounded-full bg-lime px-4 text-xs font-bold text-lime-foreground hover:bg-lime/90"
                    disabled={locating}
                    onClick={startClockIn}
                  >
                    {locating ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <MapPin className="size-3.5" />
                    )}
                    {locating ? "Locating..." : "Clock in"}
                  </Button>
                )
              }
            />
            <div className="mt-4">
              <MetricScroller
                items={[
                  {
                    key: "shift",
                    label: "Shift",
                    value: open ? "On duty" : "Off duty",
                    hint: open ? `since ${timeOf(open.clock_in_time)}` : "not clocked in",
                    icon: Clock,
                    tone: open ? "success" : "default",
                  },
                  {
                    key: "revenue",
                    label: "Revenue today",
                    value: naira(daily.revenue),
                    hint: "billed to clients",
                    icon: TrendingUp,
                  },
                  {
                    key: "commission",
                    label: "Commission",
                    value: `${Math.round(me.commission_rate * 100)}%`,
                    hint: "of each job",
                    icon: Banknote,
                    tone: "primary",
                  },
                  {
                    key: "geofence",
                    label: "Geofence",
                    value: open
                      ? open.is_within_geofence
                        ? "Verified"
                        : "Flagged"
                      : `${salon.geofence_radius_meters}m`,
                    hint: open?.is_within_geofence === false ? "off-site" : "within radius",
                    icon: MapPin,
                    tone: open && !open.is_within_geofence ? "danger" : "default",
                  },
                ]}
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
          </>
        ) : null}

        {view === "profile" ? (
          <section className="card-lux space-y-5 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-primary font-display text-lg font-bold text-primary-foreground">
                {me.full_name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-bold">{me.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {salon.name} · commission {Math.round(me.commission_rate * 100)}%
                </p>
              </div>
            </div>

            <div className="grid gap-3 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium">{me.bank_name ?? "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account number</span>
                <span className="font-display tabular-nums font-semibold">
                  {me.account_number ?? "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account name</span>
                <span className="font-medium">{me.account_name ?? me.full_name}</span>
              </div>
            </div>

            {!me.account_number ? (
              <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                Ask your manager to add your bank details from the team roster so clients can tip
                you.
              </p>
            ) : null}
          </section>
        ) : null}

        <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
          <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
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
      </BottomNavSpacer>

      {config.showTipping ? (
        <TipQrDialog open={tipQrOpen} onOpenChange={setTipQrOpen} trigger={false} />
      ) : null}
      <BottomNav items={navItems} activeKey={view === "profile" ? "profile" : "today"} />
    </AppShell>
  );
}

const POSTER_MSG_MAX = 80;
const posterMsgKey = (userId: string) => `conecktos-tip-poster-msg:${userId}`;
const defaultPosterMessage = (firstName: string) => `Tip ${firstName}`;

/** Per-staff poster message, persisted to localStorage. Blank saves as blank
 * so the print falls back to the default automatically. */
function StaffOnboarding({ hasBank, hasClockedIn }: { hasBank: boolean; hasClockedIn: boolean }) {
  const steps = [
    { label: "Add your payout account", done: hasBank, to: "/staff" as const },
    { label: "Clock in for the first time", done: hasClockedIn, to: "/staff" as const },
  ];
  if (steps.every((s) => s.done)) {
    return (
      <SetupRibbon
        storageKey="conecktos-staff-setup-dismissed"
        message="Setup complete. You are all set to earn."
      />
    );
  }
  return <OnboardingChecklist title="Your setup" steps={steps} />;
}

function usePosterMessage(userId: string, fallback: string) {
  const [msg, setMsg] = useState(fallback);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(posterMsgKey(userId));
    setMsg(saved ?? fallback);
  }, [userId, fallback]);
  const save = (next: string) => {
    setMsg(next);
    if (typeof window === "undefined") return;
    if (next.trim()) window.localStorage.setItem(posterMsgKey(userId), next);
    else window.localStorage.removeItem(posterMsgKey(userId));
  };
  return [msg, save] as const;
}

function printTipCard({
  salon,
  me,
  tipUrl,
  message,
}: {
  salon: Salon;
  me: Profile;
  tipUrl: string;
  message: string;
}): void {
  const svg = document.querySelector<SVGElement>('[role="dialog"] svg[viewBox]');
  const qr = svg ? svg.outerHTML.replace(/<svg /, '<svg width="240" height="240" ') : "";
  const first = me.full_name.split(" ")[0];
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  const headline = message.trim() || defaultPosterMessage(first);
  printHTML(
    `${headline} · ${salon.name}`,
    `
      <div style="text-align:center;padding-top:12mm">
        <p style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#666;margin:0 0 24px">${escape(salon.name)}</p>
        <div style="display:inline-block;padding:12px;background:#fff;border:1px solid #ccc;border-radius:8px">${qr}</div>
        <h1 style="margin-top:24px;font-size:24px;white-space:pre-line;letter-spacing:-0.01em">${escape(headline)}</h1>
        <p class="subtitle" style="margin-top:8px">Scan QR code to tip ${escape(first)}</p>
        <p class="footnote" style="margin-top:28px">${escape(tipUrl)}</p>
      </div>
    `,
  );
}

function TipQrDialog({
  open,
  onOpenChange,
  trigger = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
} = {}) {
  const { currentUser } = useAuth();
  const { staff } = useStaff();
  const { salon } = useSalon();
  const me = currentUser.role === "staff" ? currentUser : staff[0];
  const hasBank = Boolean(me.account_number);
  const accountName = me.account_name ?? me.full_name;
  const first = me.full_name.split(" ")[0];
  const [posterMsg, setPosterMsg] = usePosterMessage(me.id, defaultPosterMessage(first));
  const posterLen = posterMsg.length;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger !== false ? (
        <DialogTrigger asChild>
          <Button variant="secondary" className="h-11">
            <QrCode className="size-4" />
            Show My Tip QR
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
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
            <div className="rounded-2xl border border-primary/30 bg-card p-5 text-center">
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

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="poster-msg" className="text-xs font-semibold text-muted-foreground">
                  Poster headline (default: Tip {first})
                </label>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {posterLen} / {POSTER_MSG_MAX}
                </span>
              </div>
              <textarea
                id="poster-msg"
                value={posterMsg}
                onChange={(e) => setPosterMsg(e.target.value.slice(0, POSTER_MSG_MAX))}
                rows={3}
                placeholder={defaultPosterMessage(first)}
                className="w-full resize-y rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {posterMsg !== defaultPosterMessage(first) ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPosterMsg(defaultPosterMessage(first))}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Reset to default
                  </button>
                </div>
              ) : null}
            </div>

            <Button
              variant="outline"
              onClick={() => printTipCard({ salon, me, tipUrl, message: posterMsg })}
            >
              <Printer className="size-4" />
              Print poster
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
