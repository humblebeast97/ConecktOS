import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Fingerprint,
  Gauge,
  ConciergeBell,
  UserRound,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { RouteError } from "@/components/route-error";
import { useSubmit } from "@/lib/use-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultUserForRole } from "@/lib/store";
import { useAuth } from "@/api";
import type { Role } from "@/lib/groompulse";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · ConecktOS" },
      {
        name: "description",
        content:
          "Sign in to ConecktOS to run your business: geofenced clock-ins, commission splits, inventory and end-of-day audits.",
      },
      { property: "og:title", content: "Sign in · ConecktOS" },
      {
        property: "og:description",
        content: "The operating system for Nigerian businesses.",
      },
    ],
  }),
  component: LoginPage,
  errorComponent: RouteError,
});

const roles: {
  role: Role;
  label: string;
  short: string;
  blurb: string;
  icon: typeof Gauge;
  to: string;
}[] = [
  {
    role: "owner",
    label: "Owner / Admin",
    short: "Owner",
    blurb: "Revenue, commissions, expenses, audits",
    icon: Gauge,
    to: "/admin",
  },
  {
    role: "receptionist",
    label: "Front Desk",
    short: "Front desk",
    blurb: "Tickets, payments, inventory usage",
    icon: ConciergeBell,
    to: "/reception",
  },
  {
    role: "staff",
    label: "Staff",
    short: "Staff",
    blurb: "Clock in, commissions, tip QR",
    icon: UserRound,
    to: "/staff",
  },
];

function LoginPage() {
  const [role, setRole] = useState<Role>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isSubmitting, submit } = useSubmit();

  const active = roles.find((r) => r.role === role)!;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 size-[22rem] rounded-full bg-success/10 blur-3xl" />

      <div
        id="main-content"
        role="main"
        className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-16"
      >
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Built for Nigerian Businesses
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            Run your Business like a <span className="text-gradient-primary">luxury operation.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            ConecktOS handles geofenced staff clock-ins, automatic commission splits, consumables
            tracking, overheads and a fraud-proof end-of-day audit. On any phone, tablet or desktop.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            {[
              ["GPS clock-in", "50m geofence"],
              ["Commission", "Auto split per service"],
              ["Tips", "Personal bank-transfer QR"],
              ["Audit", "One-tap Close Day"],
            ].map(([k, v]) => (
              <div key={k} className="card-lux rounded-xl px-4 py-3">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card-lux rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select your role and sign in to continue.
          </p>

          <div
            className="mt-5 grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Select your role"
            onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
              e.preventDefault();
              const idx = roles.findIndex((r) => r.role === role);
              const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
              const next = (idx + dir + roles.length) % roles.length;
              setRole(roles[next].role);
              const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
              btns[next]?.focus();
            }}
          >
            {roles.map((r) => {
              const selected = r.role === role;
              return (
                <button
                  key={r.role}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setRole(r.role)}
                  className={
                    selected
                      ? "flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/70 bg-primary/10 px-2 py-3 text-center transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      : "flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-2 py-3 text-center transition-all hover:border-primary/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  }
                >
                  <span
                    className={
                      selected
                        ? "grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"
                        : "grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-muted-foreground"
                    }
                  >
                    <r.icon className="size-5" />
                  </span>
                  <span className="block w-full truncate text-xs font-semibold">{r.short}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{active.blurb}</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit(() => {
                signIn(defaultUserForRole[role]);
                navigate({ to: active.to });
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.ng"
                autoComplete="email"
                className="h-11 bg-surface"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-11 bg-surface pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="h-12 w-full text-base font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              {isSubmitting ? "Signing in…" : `Enter ${active.label}`}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create an owner account
            </Link>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff or front desk?{" "}
            <Link
              to="/join"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up with your role
            </Link>
          </p>

          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-success" />
            One workspace for your whole team. Owner, front desk and floor staff.
          </p>
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <Link
              to="/privacy"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy
            </Link>
            <span className="mx-2">·</span>
            <Link to="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
              Terms
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
