import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { RouteError } from "@/components/route-error";
import { FieldError } from "@/components/field-error";
import { useSubmit } from "@/lib/use-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BusinessProfilePanel } from "@/components/business-profile";
import { defaultUserForRole } from "@/lib/store";
import { useAuth } from "@/api";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account · ConecktOS" },
      {
        name: "description",
        content:
          "Create a ConecktOS owner account and set up your business profile: category, location and geofence radius.",
      },
      { property: "og:title", content: "Create your account · ConecktOS" },
      {
        property: "og:description",
        content:
          "Sign up as an owner and configure your business category, location and geofence in one flow.",
      },
    ],
  }),
  component: SignUpPage,
  errorComponent: RouteError,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)", ok: /[a-z]/.test(password) },
    { label: "One number (0–9)", ok: /\d/.test(password) },
    {
      label: "One symbol (!@#$%…)",
      ok: /[^A-Za-z0-9]/.test(password),
    },
  ];
  const passwordStrong = rules.every((r) => r.ok);

  const [submitted, setSubmitted] = useState(false);
  const { isSubmitting: isCreating, submit: submitCreate } = useSubmit();
  const { isSubmitting: isEntering, submit: submitEnter } = useSubmit();
  const nameError = submitted && !fullName.trim() ? "Your full name is required" : null;
  const passwordError =
    submitted && !passwordStrong
      ? "Password must mix upper and lower case, a number and a symbol (8+ chars)"
      : null;

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!fullName.trim() || !passwordStrong) return;
    submitCreate(() => {
      toast.success("Account created. Now set up your business.");
      setStep(2);
    });
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 size-[22rem] rounded-full bg-success/10 blur-3xl" />

      <div id="main-content" role="main" className="relative mx-auto max-w-2xl px-5 py-12">
        <div className="flex items-center gap-3">
          {([1, 2] as const).map((n, i) => (
            <div key={n} className="flex flex-1 items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={
                    step >= n
                      ? "grid size-7 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground"
                      : "grid size-7 shrink-0 place-items-center rounded-full border border-border text-xs font-medium text-muted-foreground"
                  }
                >
                  {step > n ? <Check className="size-3.5" /> : n}
                </span>
                <span
                  className={
                    step >= n
                      ? "text-xs font-semibold"
                      : "text-xs font-medium text-muted-foreground"
                  }
                >
                  {n === 1 ? "Account" : "Business"}
                </span>
              </div>
              {i === 0 ? (
                <span
                  className={`h-0.5 flex-1 rounded-full ${step > 1 ? "bg-primary" : "bg-border"}`}
                />
              ) : null}
            </div>
          ))}
        </div>
        <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">
          {step === 1 ? (
            <>
              Create your <span className="text-gradient-primary">owner account.</span>
            </>
          ) : (
            <>
              Set up your <span className="text-gradient-primary">business.</span>
            </>
          )}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          {step === 1
            ? "One account runs your whole operation. Team, tickets, stock and payouts."
            : "Your category tailors labels, tipping and stock tracking across the app."}
        </p>

        {step === 1 ? (
          <section className="card-lux mt-7 rounded-3xl p-6 sm:p-8">
            <form className="space-y-4" onSubmit={createAccount}>
              <div className="space-y-1.5">
                <Label htmlFor="su-name">
                  Full name <span className="text-primary">*</span>
                </Label>
                <Input
                  id="su-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Adaeze Okonkwo"
                  className="h-11 bg-surface"
                  required
                  aria-invalid={Boolean(nameError)}
                  aria-describedby="su-name-error"
                  minLength={2}
                  maxLength={80}
                />
                <FieldError id="su-name-error" message={nameError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">
                  Email <span className="text-primary">*</span>
                </Label>
                <Input
                  id="su-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.ng"
                  className="h-11 bg-surface"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-password">
                  Password <span className="text-primary">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="su-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8+ chars with a number & symbol"
                    className="h-11 bg-surface pr-11"
                    autoComplete="new-password"
                    aria-describedby="su-password-rules su-password-error"
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
                <ul id="su-password-rules" className="mt-2 grid gap-1 sm:grid-cols-2">
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
                <FieldError id="su-password-error" message={passwordError} />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isCreating}
                className="h-12 w-full text-base font-semibold"
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                {isCreating ? "Creating…" : "Continue to business setup"}
              </Button>
            </form>

            <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-success" />
              Already have an account?{" "}
              <Link to="/" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
              · Joining a team?{" "}
              <Link to="/join" className="text-primary underline-offset-4 hover:underline">
                Staff sign-up
              </Link>
            </p>
          </section>
        ) : (
          <div className="mt-7 space-y-5">
            <BusinessProfilePanel />
            <Button
              size="lg"
              disabled={isEntering}
              className="h-12 w-full text-base font-semibold"
              onClick={() =>
                submitEnter(() => {
                  signIn(defaultUserForRole.owner);
                  navigate({ to: "/admin" });
                  toast.success("You're all set. Welcome to ConecktOS");
                })
              }
            >
              {isEntering ? "Signing you in…" : "Go to Owner Dashboard"}
              {isEntering ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
