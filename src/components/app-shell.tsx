import { Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  ChevronDown,
  LogOut,
  Settings,
  Bell,
  Package,
  Receipt,
  MapPinOff,
  Repeat,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAttendance, useAuth, useInventory, useStaff, useTickets } from "@/api";
import { useIndustryConfig } from "@/config/industry-context";
import { personTitle, roleLabel, type Role } from "@/lib/groompulse";
import { lowStock } from "@/lib/reports";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OfflineBanner } from "@/components/offline-banner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

// Demo-only role switcher targets. Hoisted so the useMemo below has a stable
// identity — otherwise recreating the array each render bypasses memoisation.
const ROLES_FOR_SWITCHER: Role[] = ["owner", "manager", "receptionist", "staff"];
const PORTAL_FOR: Record<Role, "/admin" | "/reception" | "/staff"> = {
  owner: "/admin",
  manager: "/reception",
  receptionist: "/reception",
  staff: "/staff",
};

export function AppShell({
  title,
  subtitle,
  children,
  actions,
}: {
  /** Optional. When omitted the title block is not rendered so the page can
   * provide its own hero surface (e.g. an ink HeroCard). */
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { currentUser, signIn } = useAuth();
  const { profiles } = useStaff();
  const { inventory } = useInventory();
  const { tickets } = useTickets();
  const { attendance } = useAttendance();
  const config = useIndustryConfig();
  const navigate = useNavigate();

  // Ops notifications. Only for owner / manager / front desk.
  const showOps = ["owner", "manager", "receptionist"].includes(currentUser.role);
  const low = showOps ? lowStock(inventory) : [];
  const pending = showOps ? tickets.filter((t) => t.status === "pending") : [];
  const offSite = showOps
    ? attendance.filter((a) => a.clock_out_time === null && !a.is_within_geofence)
    : [];

  // Track per-notification acknowledgement so the badge doesn't scream forever.
  // Signature = `${count}` per source. Once the user opens the menu we store
  // the current count; a fresh incident bumps the count and re-surfaces it.
  type Notif = {
    key: "low" | "pending" | "offsite";
    icon: typeof Package;
    text: string;
    to: "/admin" | "/reception";
    hash?: string;
    count: number;
  };
  const rawNotifs: Notif[] = useMemo(() => {
    const items: (Notif | null)[] = [
      low.length
        ? {
            key: "low",
            icon: Package,
            text: `${low.length} item${low.length > 1 ? "s" : ""} low on stock`,
            to: "/admin",
            hash: "inventory",
            count: low.length,
          }
        : null,
      pending.length
        ? {
            key: "pending",
            icon: Receipt,
            text: `${pending.length} ticket${pending.length > 1 ? "s" : ""} awaiting payment`,
            to: "/reception",
            hash: "pending",
            count: pending.length,
          }
        : null,
      offSite.length
        ? {
            key: "offsite",
            icon: MapPinOff,
            text: `${offSite.length} off-site clock-in${offSite.length > 1 ? "s" : ""}`,
            to: "/admin",
            hash: "attendance",
            count: offSite.length,
          }
        : null,
    ];
    return items.filter((n): n is Notif => n !== null);
  }, [low.length, pending.length, offSite.length]);

  const [ack, setAck] = useState<Record<string, number>>({});
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setAck(JSON.parse(window.localStorage.getItem("conecktos-notif-ack") ?? "{}"));
    } catch {
      /* ignore malformed */
    }
  }, []);
  const persistAck = (next: Record<string, number>) => {
    setAck(next);
    if (typeof window !== "undefined")
      window.localStorage.setItem("conecktos-notif-ack", JSON.stringify(next));
  };
  const notifications = rawNotifs.filter((n) => n.count > (ack[n.key] ?? 0));
  const acknowledgeAll = () => {
    if (rawNotifs.length === 0) return;
    persistAck({
      ...ack,
      ...Object.fromEntries(rawNotifs.map((n) => [n.key, n.count])),
    });
  };
  const acknowledgeOne = (key: string, count: number) => persistAck({ ...ack, [key]: count });

  // Keep the browser tab title in sync with the active industry sub-brand.
  // Skip when no title is provided; the route's own head() meta then wins.
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · ${config.appName}`;
  }, [title, config.appName]);

  // Demo-only role switcher: one representative user per role, so testers /
  // stakeholders can jump between portals without touching code. When Phase 1
  // ships real auth this whole block becomes dev-only or is removed.
  const roleShortcuts = useMemo(
    () =>
      ROLES_FOR_SWITCHER.map((r) => ({ role: r, user: profiles.find((p) => p.role === r) })).filter(
        (s): s is { role: Role; user: (typeof profiles)[number] } => Boolean(s.user),
      ),
    [profiles],
  );

  return (
    <div className="min-h-dvh bg-background pb-10">
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-primary">
              <Sparkles className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-bold tracking-tight">
                {config.appName}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {config.tagline}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {showOps ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Notifications${notifications.length ? ` (${notifications.length})` : ""}`}
                  className="relative grid size-9 place-items-center rounded-full border border-border bg-surface text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Bell className="size-4" />
                  {notifications.length ? (
                    <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                      {notifications.length}
                    </span>
                  ) : null}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="flex items-center justify-between gap-3">
                    <span>Notifications</span>
                    {notifications.length > 0 ? (
                      <button
                        type="button"
                        onClick={acknowledgeAll}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      You're all caught up.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.key}
                        onSelect={() => {
                          acknowledgeOne(n.key, n.count);
                          navigate({ to: n.to, hash: n.hash });
                        }}
                        className="gap-2"
                      >
                        <n.icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{n.text}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2 outline-none transition-colors hover:border-primary/40 focus-visible:ring-1 focus-visible:ring-ring">
                <Avatar className="size-7">
                  {currentUser.avatar_url ? (
                    <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-primary text-[11px] font-semibold text-primary-foreground">
                    {initialsOf(currentUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 flex-col items-start leading-none sm:flex">
                  <span className="max-w-[9rem] truncate text-xs font-semibold">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {personTitle(currentUser)}
                  </span>
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{currentUser.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {personTitle(currentUser)}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/settings" })}
                  className="gap-2"
                >
                  <Settings className="size-4" />
                  {currentUser.role === "owner" || currentUser.role === "manager"
                    ? "Business settings"
                    : "Settings"}
                </DropdownMenuItem>
                {roleShortcuts.length > 1 ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Repeat className="size-3" />
                      Switch role (demo)
                    </DropdownMenuLabel>
                    {roleShortcuts.map(({ role, user }) => {
                      const active = user.id === currentUser.id;
                      return (
                        <DropdownMenuItem
                          key={role}
                          disabled={active}
                          onSelect={() => {
                            signIn(user.id);
                            navigate({ to: PORTAL_FOR[role] });
                          }}
                          className="flex flex-col items-start gap-0"
                        >
                          <span className="text-sm font-medium">{roleLabel[role]}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {user.full_name}
                            {active ? " · current" : ""}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/" })}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {title || actions ? (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            {title ? (
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
            ) : null}
            {actions ? <div className="ml-auto flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "gold" | "success" | "danger";
}) {
  const toneClass =
    tone === "gold"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";

  return (
    <div className="card-lux rounded-2xl p-4 transition-colors hover:border-primary/50 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 shrink-0 ${toneClass}`} />
      </div>
      <p
        className={`mt-3 font-display text-2xl font-bold tracking-tight tabular-nums ${toneClass}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-accent text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
