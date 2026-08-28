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
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useAttendance, useAuth, useInventory, useTickets } from "@/api";
import { useIndustryConfig } from "@/config/industry-context";
import { personTitle } from "@/lib/groompulse";
import { lowStock } from "@/lib/reports";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function AppShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { currentUser } = useAuth();
  const { inventory } = useInventory();
  const { tickets } = useTickets();
  const { attendance } = useAttendance();
  const config = useIndustryConfig();
  const navigate = useNavigate();

  // Ops notifications — only for owner / manager / front desk.
  const showOps = ["owner", "manager", "receptionist"].includes(currentUser.role);
  const low = showOps ? lowStock(inventory) : [];
  const pending = showOps ? tickets.filter((t) => t.status === "pending") : [];
  const offSite = showOps
    ? attendance.filter((a) => a.clock_out_time === null && !a.is_within_geofence)
    : [];
  const notifications = [
    low.length
      ? {
          icon: Package,
          text: `${low.length} item${low.length > 1 ? "s" : ""} low on stock`,
          to: "/admin" as const,
        }
      : null,
    pending.length
      ? {
          icon: Receipt,
          text: `${pending.length} ticket${pending.length > 1 ? "s" : ""} awaiting payment`,
          to: "/reception" as const,
        }
      : null,
    offSite.length
      ? {
          icon: MapPinOff,
          text: `${offSite.length} off-site clock-in${offSite.length > 1 ? "s" : ""}`,
          to: "/admin" as const,
        }
      : null,
  ].filter(
    (n): n is { icon: typeof Package; text: string; to: "/admin" | "/reception" } => n !== null,
  );

  // Keep the browser tab title in sync with the active industry sub-brand.
  useEffect(() => {
    document.title = `${title} · ${config.appName}`;
  }, [title, config.appName]);

  return (
    <div className="min-h-dvh bg-background pb-10">
      <OfflineBanner />
      <header className="no-print sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-gold text-gold-foreground shadow-gold">
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
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      You're all caught up.
                    </p>
                  ) : (
                    notifications.map((n, i) => (
                      <DropdownMenuItem
                        key={i}
                        onSelect={() => navigate({ to: n.to })}
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
                  <AvatarFallback className="bg-gradient-gold text-[11px] font-semibold text-gold-foreground">
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
                {currentUser.role === "owner" || currentUser.role === "manager" ? (
                  <DropdownMenuItem
                    onSelect={() => navigate({ to: "/settings" })}
                    className="gap-2"
                  >
                    <Settings className="size-4" />
                    Business settings
                  </DropdownMenuItem>
                ) : null}
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
        <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
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
