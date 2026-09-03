import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  ConciergeBell,
  Eye,
  EyeOff,
  Loader2,
  UserRound,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { RouteError } from "@/components/route-error";
import { FieldError } from "@/components/field-error";
import { useSubmit } from "@/lib/use-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useStaff } from "@/api";
import { commissionRoles, roleHint, roleLabel } from "@/lib/groompulse";
import type { Role } from "@/lib/groompulse";
import { useIndustryConfig } from "@/config/industry-context";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Team sign-up · ConecktOS" },
      {
        name: "description",
        content:
          "Onboarded staff create their own ConecktOS login here. Front desk gets the billing portal, floor staff get GPS clock-in and commissions.",
      },
      { property: "og:title", content: "Team sign-up · ConecktOS" },
      {
        property: "og:description",
        content: "Staff and front-desk sign-up: create your login and go straight to your portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JoinPage,
  errorComponent: RouteError,
});

/** Team roles an onboarded member can self-register as (owner accounts use /signup). */
const teamRoles: Role[] = ["receptionist", "manager", ...commissionRoles];

const portalFor = (role: Role) =>
  role === "receptionist" || role === "manager" ? "/reception" : "/staff";

function JoinPage() {
  const navigate = useNavigate();
  const config = useIndustryConfig();
  const { signIn } = useAuth();
  const { addStylist } = useStaff();

  const [role, setRole] = useState<Role>("staff");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)", ok: /[a-z]/.test(password) },
    { label: "One number (0–9)", ok: /\d/.test(password) },
    { label: "One symbol (!@#$%…)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordStrong = rules.every((r) => r.ok);

  const isFrontDesk = role === "receptionist" || role === "manager";
  const roleTitle = isFrontDesk ? roleLabel[role] : config.staffTitle;

  const [submitted, setSubmitted] = useState(false);
  const { isSubmitting, submit } = useSubmit();
  const nameError = submitted && !fullName.trim() ? "Your full name is required" : null;
  const passwordError =
    submitted && !passwordStrong
      ? "Password must mix upper and lower case, a number and a symbol (8+ chars)"
      : null;
  const accountNumberError =
    submitted && !isFrontDesk && accountNumber.trim() && !/^\d{10}$/.test(accountNumber.trim())
      ? "Account number must be exactly 10 digits"
      : null;

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!fullName.trim() || !passwordStrong || accountNumberError) return;
    submit(() => {
      const member = addStylist({
        full_name: fullName.trim(),
        role,
        job_title: jobTitle.trim() || null,
        commission_rate: isFrontDesk ? 0 : 0.5,
        base_salary: null,
        salary_payday: null,
        bank_name: isFrontDesk ? null : bankName.trim() || null,
        account_number: isFrontDesk ? null : accountNumber.trim() || null,
        account_name: isFrontDesk ? null : accountName.trim() || fullName.trim(),
      });
      toast.success(`Welcome aboard. Opening your ${roleTitle} portal.`);
      signIn(member.id);
      navigate({ to: portalFor(role) });
    });
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 size-[22rem] rounded-full bg-success/10 blur-3xl" />

      <div id="main-content" role="main" className="relative mx-auto max-w-2xl px-5 py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Team sign-up
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
          Create your <span className="text-gradient-primary">team login.</span>
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Already onboarded by your owner or manager? Pick your role and set a password. You will
          land straight in the right portal.
        </p>

        <section className="card-lux mt-7 rounded-3xl p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your role
          </h2>
          <div
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Your role"
            onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
              e.preventDefault();
              const idx = teamRoles.indexOf(role);
              const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
              const next = (idx + dir + teamRoles.length) % teamRoles.length;
              setRole(teamRoles[next]);
              const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
              btns[next]?.focus();
            }}
          >
            {teamRoles.map((r) => {
              const selected = r === role;
              const Icon = r === "receptionist" || r === "manager" ? ConciergeBell : UserRound;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setRole(r)}
                  className={
                    selected
                      ? "flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-primary/70 bg-primary/10 px-3 py-3 text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[5rem] sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:px-2 sm:text-center"
                      : "flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-left transition-all hover:border-primary/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[5rem] sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:px-2 sm:text-center"
                  }
                >
                  <span
                    className={
                      selected
                        ? "grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"
                        : "grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-muted-foreground"
                    }
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold sm:w-full sm:flex-none sm:truncate sm:text-xs">
                    {roleLabel[r]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{roleHint[role]}</p>

          <form className="mt-6 space-y-4" onSubmit={createAccount}>
            <div className="space-y-1.5">
              <Label htmlFor="jn-name">
                Full name <span className="text-primary">*</span>
              </Label>
              <Input
                id="jn-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Chidi Nwosu"
                className="h-11 bg-surface"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={Boolean(nameError)}
                aria-describedby="jn-name-error"
              />
              <FieldError id="jn-name-error" message={nameError} />
            </div>
            {!isFrontDesk ? (
              <div className="space-y-1.5">
                <Label htmlFor="jn-title">Job title</Label>
                <Input
                  id="jn-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Technician, Stylist, Server"
                  className="h-11 bg-surface"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="jn-email">
                Email <span className="text-primary">*</span>
              </Label>
              <Input
                id="jn-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.ng"
                className="h-11 bg-surface"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jn-invite">Business / invite code (optional)</Label>
              <Input
                id="jn-invite"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Ask your manager if unsure"
                className="h-11 bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jn-password">
                Password <span className="text-primary">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="jn-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ chars with a number & symbol"
                  className="h-11 bg-surface pr-11"
                  autoComplete="new-password"
                  aria-describedby="jn-password-rules jn-password-error"
                  aria-invalid={Boolean(passwordError)}
                  required
                  minLength={8}
                  maxLength={128}
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
              <ul id="jn-password-rules" className="mt-2 grid gap-1 sm:grid-cols-2">
                {rules.map((r) => (
                  <li
                    key={r.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      r.ok ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {r.ok ? (
                      <Check className="size-3.5 shrink-0" />
                    ) : (
                      <Circle className="size-3.5 shrink-0" />
                    )}
                    {r.label}
                  </li>
                ))}
              </ul>
              <FieldError id="jn-password-error" message={passwordError} />
            </div>

            {!isFrontDesk ? (
              <div className="space-y-3 rounded-2xl border border-border bg-surface/50 p-4">
                <p className="text-sm font-semibold">
                  Payout details{" "}
                  <span className="font-normal text-muted-foreground">
                    . Where your tips are sent
                  </span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="jn-bank">Bank name</Label>
                    <Input
                      id="jn-bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. GTBank"
                      className="h-11 bg-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="jn-acct">Account number</Label>
                    <Input
                      id="jn-acct"
                      inputMode="numeric"
                      pattern="\d{10}"
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) =>
                        setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="10-digit NUBAN"
                      className="h-11 bg-surface"
                      aria-invalid={Boolean(accountNumberError)}
                      aria-describedby="jn-acct-error"
                    />
                    <FieldError id="jn-acct-error" message={accountNumberError} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="jn-acctname">Account name</Label>
                    <Input
                      id="jn-acctname"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Defaults to your full name"
                      className="h-11 bg-surface"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can leave this blank and add it later. But your tip QR won't work until it's
                  set.
                </p>
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="h-12 w-full text-base font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {isSubmitting
                ? "Creating…"
                : `Create account and open ${isFrontDesk ? "front desk" : "my"} portal`}
              {isSubmitting ? null : <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-success" />
            Own the business?{" "}
            <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
              Create an owner account
            </Link>
            · Already registered?{" "}
            <Link to="/" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
