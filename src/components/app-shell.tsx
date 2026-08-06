import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Gauge,
  ConciergeBell,
  Scissors,
  Sparkles,
  UserPlus,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useIndustryConfig } from "@/config/industry-context";
import { roleLabel } from "@/lib/groompulse";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const nav = [
  { to: "/staff", labelKey: "staff", icon: Scissors },
  { to: "/reception", labelKey: "reception", icon: ConciergeBell },
  { to: "/team", labelKey: "team", icon: UserPlus },
  { to: "/admin", labelKey: "owner", icon: Gauge },
] as const;

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
  const { currentUser } = useStore();
  const config = useIndustryConfig();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Keep the browser tab title in sync with the active industry sub-brand.
  useEffect(() => {
    document.title = `${title} · ${config.appName}`;
  }, [title, config.appName]);

  const navLabel = (key: (typeof nav)[number]["labelKey"]) =>
    key === "staff" ? config.staffTitle.split(" / ")[0] : key === "reception" ? "Reception" : key === "team" ? "Team" : "Owner";

  return (
    <div className="min-h-dvh bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
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
            <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 md:flex">
              {nav.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      active
                        ? "flex items-center gap-1.5 rounded-full bg-gradient-gold px-3.5 py-1.5 text-xs font-semibold text-gold-foreground"
                        : "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    }
                  >
                    <item.icon className="size-3.5" />
                    {navLabel(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
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
                    {roleLabel[currentUser.role]}
                  </span>
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{currentUser.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {roleLabel[currentUser.role]}
                  </span>
                </DropdownMenuLabel>
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
        <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {actions}
        </div>
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {nav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-primary"
                  : "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors active:text-foreground"
              }
            >
              {active ? (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />
              ) : null}
              <item.icon className="size-5" />
              {navLabel(item.labelKey)}
            </Link>
          );
        })}
      </nav>
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
      <p className={`mt-3 font-display text-2xl font-bold tracking-tight tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
