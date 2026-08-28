import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/field-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/app-shell";
import { useSubmit } from "@/lib/use-submit";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStaff, useTickets } from "@/api";
import {
  earnsCommission,
  naira,
  personTitle,
  roleGroups,
  roleHint,
  roleLabel,
  type Role,
} from "@/lib/groompulse";
import { useIndustryConfig } from "@/config/industry-context";

const emptyForm = {
  full_name: "",
  job_title: "",
  role: "staff" as Role,
  commission_rate: 50,
  base_salary: "",
  salary_payday: "30",
};

const steps = ["Identity", "Role"] as const;

/** Reusable onboarding wizard + roster. Embedded on /team, /admin and /reception. */
export function TeamOnboarding({ compact = false }: { compact?: boolean }) {
  const config = useIndustryConfig();
  const { profiles, addStylist, removeProfile } = useStaff();
  const { ticketItems } = useTickets();
  const industryRoleLabel = (role: Role) =>
    role === "staff" ? config.staffTitle : roleLabel[role];
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState<"all" | "floor" | "desk">("all");
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const pendingRemove = pendingRemoveId
    ? (profiles.find((p) => p.id === pendingRemoveId) ?? null)
    : null;

  const roster = useMemo(() => {
    if (filter === "floor") return profiles.filter((p) => earnsCommission(p.role));
    if (filter === "desk") return profiles.filter((p) => !earnsCommission(p.role));
    return profiles;
  }, [profiles, filter]);

  const isFloor = earnsCommission(form.role);
  const nameValid = form.full_name.trim().length >= 3;
  const lastStep = 1;
  const [nameTouched, setNameTouched] = useState(false);
  const { isSubmitting, submit: guarded } = useSubmit();
  const nameError = nameTouched && !nameValid ? "Full name must be at least 3 characters" : null;

  const next = () => {
    if (step === 0 && !nameValid) {
      setNameTouched(true);
      return;
    }
    if (step >= lastStep) {
      submit();
      return;
    }
    setStep((s) => s + 1);
  };

  const submit = () => {
    guarded(() => {
      const name = form.full_name.trim();
      const salaryAmount = Number(form.base_salary) || 0;
      const paydayNum = Math.min(31, Math.max(1, Number(form.salary_payday) || 30));
      addStylist({
        full_name: name,
        role: form.role,
        job_title: form.job_title.trim() || null,
        commission_rate: isFloor ? form.commission_rate / 100 : 0,
        base_salary: salaryAmount > 0 ? salaryAmount : null,
        salary_payday: salaryAmount > 0 ? paydayNum : null,
        // Payout details are entered by the staff member during their own sign-up.
        bank_name: null,
        account_number: null,
        account_name: name,
      });
      const bits: string[] = [];
      if (isFloor) bits.push(`${form.commission_rate}% commission`);
      if (salaryAmount > 0) bits.push(`${naira(salaryAmount)}/mo`);
      toast.success(`${name} onboarded`, {
        description: `${industryRoleLabel(form.role)}${bits.length ? ` · ${bits.join(" · ")}` : ""}`,
      });
      setForm(emptyForm);
      setStep(0);
      setNameTouched(false);
    });
  };

  return (
    <div
      className={
        compact
          ? "grid gap-5 lg:grid-cols-2"
          : "grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        className="card-lux h-fit rounded-2xl p-5"
      >
        <div className="flex items-center gap-2">
          {steps.map((label, i) => {
            const shown = i <= lastStep;
            if (!shown) return null;
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => (i <= step || nameValid ? setStep(i) : null)}
                className={
                  active
                    ? "flex flex-1 items-center gap-2 rounded-full bg-gradient-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground"
                    : "flex flex-1 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                <span className="font-display">{done ? "✓" : i + 1}</span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 min-h-[13rem] space-y-4">
          {step === 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full name <span className="text-primary">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  placeholder="e.g. Chidinma Nwosu"
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  onBlur={() => setNameTouched(true)}
                  className="h-11"
                  autoComplete="off"
                  required
                  minLength={3}
                  maxLength={80}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby="full_name-error"
                />
                <p className="text-xs text-muted-foreground">
                  As it should appear on tickets and tip QR codes.
                </p>
                <FieldError id="full_name-error" message={nameError} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Job title</Label>
                <Input
                  id="job_title"
                  value={form.job_title}
                  placeholder="e.g. Technician, Stylist, Server, Tailor"
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  className="h-11"
                  autoComplete="off"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  Anything you like. This is just their title.
                </p>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              {roleGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.roles.map((r) => {
                      const active = form.role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm({ ...form, role: r })}
                          className={
                            active
                              ? "rounded-xl border border-primary/60 bg-primary/10 p-3 text-left"
                              : "rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/40"
                          }
                        >
                          <span className="block text-sm font-semibold">
                            {industryRoleLabel(r)}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                            {roleHint[r]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {isFloor ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Commission split</Label>
                    <span className="font-display text-sm font-bold text-primary">
                      {form.commission_rate}%
                    </span>
                  </div>
                  <Slider
                    value={[form.commission_rate]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setForm({ ...form, commission_rate: v })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.commission_rate === 0
                      ? "No commission per service. Pay is salary-only (set below)."
                      : `On a ${naira(5000)} service they earn ${naira((5000 * form.commission_rate) / 100)}.`}
                  </p>
                </div>
              ) : null}

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="onb-salary">Monthly base salary</Label>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Optional
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <Input
                    id="onb-salary"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={form.base_salary}
                    onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                    placeholder="Amount (₦)"
                    className="h-10"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    value={form.salary_payday}
                    onChange={(e) => setForm({ ...form, salary_payday: e.target.value })}
                    placeholder="Payday (1–31)"
                    className="h-10"
                    aria-label="Payday day of month"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {Number(form.base_salary) > 0
                    ? `Accrues ${naira(Number(form.base_salary))} monthly. Payday: day ${Math.min(
                        31,
                        Math.max(1, Number(form.salary_payday) || 30),
                      )} of the month.`
                    : isFloor
                      ? "Leave blank for commission-only. Fill in for hybrid or salary-only pay."
                      : "Leave blank if unpaid, or set a monthly amount for this role."}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-12"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="h-12 flex-1 font-semibold"
          >
            {step >= lastStep ? (
              isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <UserPlus className="size-5" />
                  Add to team
                </>
              )
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      <section className="card-lux rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold">Roster</h3>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="floor" className="text-xs">
                Floor
              </TabsTrigger>
              <TabsTrigger value="desk" className="text-xs">
                Desk
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {roster.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={UserPlus}
              title={
                filter === "all"
                  ? "No team members yet"
                  : `No ${filter === "floor" ? "floor" : "desk"} roles yet`
              }
              description={
                filter === "all"
                  ? "Add your first team member from the form on the left."
                  : "Switch the filter or add someone with this role from the form."
              }
            />
          </div>
        ) : null}
        <ul className="mt-3 divide-y divide-border">
          {roster.map((p) => {
            const lifetime = ticketItems
              .filter((i) => i.staff_id === p.id)
              .reduce((sum, i) => sum + i.staff_commission_amount, 0);
            const floor = earnsCommission(p.role);
            const ready = !floor || Boolean(p.account_number);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-gold font-display text-sm font-bold text-gold-foreground">
                  {p.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {personTitle(p)}
                    {floor
                      ? ` · ${Math.round(p.commission_rate * 100)}% · earned ${naira(lifetime)}`
                      : ""}
                  </p>
                </div>

                {floor ? (
                  <Badge
                    variant="outline"
                    className={
                      ready ? "border-success/40 text-success" : "border-warning/40 text-warning"
                    }
                  >
                    {ready ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <CircleDashed className="size-3" />
                    )}
                    {ready ? "Payout ready" : "Payout pending"}
                  </Badge>
                ) : null}

                <div className="flex items-center gap-2">
                  {p.role !== "owner" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${p.full_name}`}
                      onClick={() => setPendingRemoveId(p.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemoveId(null)}
        title={pendingRemove ? `Remove ${pendingRemove.full_name}?` : "Remove team member?"}
        description={
          pendingRemove
            ? `${pendingRemove.full_name} will lose access immediately. Past tickets and commissions are kept.`
            : ""
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (!pendingRemove) return;
          removeProfile(pendingRemove.id);
          toast.success(`${pendingRemove.full_name} removed from the team`);
        }}
      />
    </div>
  );
}
