import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ConciergeBell,
  Eye,
  EyeOff,
  Gauge,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
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
        content: "The Operating System for Modern Service Brands.",
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
  const [remember, setRemember] = useState(true);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isSubmitting, submit } = useSubmit();

  const active = roles.find((r) => r.role === role)!;

  // Real OAuth ships with Phase 1 (Supabase Auth). Until then the buttons
  // wire into the same demo sign-in flow so the design is testable and the
  // portals reachable, but a toast tells the user this is a stub.
  const oauthSignIn = (provider: "Google" | "Apple") => {
    toast(`${provider} sign-in ships with Phase 1`, {
      description: "Signing you in as the demo account for now.",
    });
    submit(() => {
      signIn(defaultUserForRole[role]);
      navigate({ to: active.to });
    });
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        id="main-content"
        role="main"
        className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-16"
      >
        <section className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            The Operating System for Modern Service Brands
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Total command of your floor, staff, and{" "}
            <span className="text-gradient-primary">revenue.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Stop revenue leaks and daily guesswork. ConecktOS automates GPS-verified clock-ins,
            instant commission splits, consumables tracking, and end-of-day register audits across
            all your devices.
          </p>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-success" />
            No install, no card, no per-seat fee to start.
          </p>
        </section>

        <section className="glass order-1 rounded-3xl p-6 sm:p-8 lg:order-2">
          <h2 className="font-display text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to run your day.</p>

          {/* Role chips: demo helper. Removed once Supabase invites give each
           * user their role at sign-up. */}
          <div
            className="mt-5 grid grid-cols-3 gap-1.5 rounded-full border border-border bg-muted p-1"
            role="radiogroup"
            aria-label="Sign in as"
            onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
              e.preventDefault();
              const idx = roles.findIndex((r) => r.role === role);
              const dir = e.key === "ArrowRight" ? 1 : -1;
              const next = (idx + dir + roles.length) % roles.length;
              setRole(roles[next].role);
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
                  onClick={() => setRole(r.role)}
                  className={
                    selected
                      ? "flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-ink-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      : "flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  }
                >
                  <r.icon className="size-3.5" />
                  {r.short}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => oauthSignIn("Google")}
              disabled={isSubmitting}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <GoogleIcon />
              <span className="flex-1">Continue with Google</span>
              <span className="text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
            </button>
            <button
              type="button"
              onClick={() => oauthSignIn("Apple")}
              disabled={isSubmitting}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <AppleIcon />
              <span className="flex-1">Continue with Apple</span>
              <span className="text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>

          <div className="my-5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            className="space-y-3.5"
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
                  placeholder="Enter password"
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

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-3.5 rounded border-border accent-primary"
                />
                Remember me
              </label>
              <Link
                to="/"
                className="font-semibold text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Password reset ships with Phase 1.");
                }}
              >
                Forgot?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="h-12 w-full text-base font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              to="/signup"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Create an owner account
            </Link>
          </p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Staff or front desk?{" "}
            <Link
              to="/join"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign up with your role
            </Link>
          </p>

          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3 shrink-0 text-success" />
            One workspace for your whole team.
          </p>
          <p className="mt-3 border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.4-1.13 2.6-2.36 3.42v2.85h3.82c2.23-2.06 3.59-5.1 3.59-8.51z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.92l-3.82-2.85c-1.06.72-2.43 1.14-4.12 1.14-3.16 0-5.84-2.13-6.8-5H1.28v3.06C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.37A7.19 7.19 0 0 1 4.82 12c0-.83.13-1.62.38-2.37V6.57H1.28C.47 8.19 0 10.03 0 12s.47 3.81 1.28 5.43l3.92-3.06z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.36.62 4.6 1.83l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.57l3.92 3.06C6.16 6.88 8.84 4.75 12 4.75z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-foreground" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
