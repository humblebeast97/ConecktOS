import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
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
};

const steps = ["Identity", "Role"] as const;

/** Reusable onboarding wizard + roster. Embedded on /team, /admin and /reception. */
export function TeamOnboarding({ compact = false }: { compact?: boolean }) {
  const config = useIndustryConfig();
  const { profiles, ticketItems, addStylist, removeProfile } = useStore();
  const industryRoleLabel = (role: Role) =>
    role === "staff" ? config.staffTitle : roleLabel[role];
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState<"all" | "floor" | "desk">("all");

  const roster = useMemo(() => {
    if (filter === "floor") return profiles.filter((p) => earnsCommission(p.role));
    if (filter === "desk") return profiles.filter((p) => !earnsCommission(p.role));
    return profiles;
  }, [profiles, filter]);

  const isFloor = earnsCommission(form.role);
  const nameValid = form.full_name.trim().length >= 3;
  const lastStep = 1;

  const next = () => {
    if (step === 0 && !nameValid) {
      toast.error("Enter the team member's full name");
      return;
    }
    if (step >= lastStep) {
      submit();
      return;
    }
    setStep((s) => s + 1);
  };

  const submit = () => {
    const name = form.full_name.trim();
    addStylist({
      full_name: name,
      role: form.role,
      job_title: form.job_title.trim() || null,
      commission_rate: isFloor ? form.commission_rate / 100 : 0,
      // Payout details are entered by the staff member during their own sign-up.
      bank_name: null,
      account_number: null,
      account_name: name,
    });
    toast.success(`${name} onboarded`, {
      description: isFloor
        ? `${industryRoleLabel(form.role)} · ${form.commission_rate}% commission`
        : `${industryRoleLabel(form.role)} access granted`,
    });
    setForm(emptyForm);
    setStep(0);
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
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  placeholder="e.g. Chidinma Nwosu"
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="h-11"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  As it should appear on tickets and tip QR codes.
                </p>
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
                />
                <p className="text-xs text-muted-foreground">
                  Anything you like — this is just their title.
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
                    On a {naira(5000)} service they earn{" "}
                    {naira((5000 * form.commission_rate) / 100)}.
                  </p>
                </div>
              ) : null}
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
          <Button type="submit" size="lg" className="h-12 flex-1 font-semibold">
            {step >= lastStep ? (
              <>
                <UserPlus className="size-5" />
                Add to team
              </>
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
          <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {filter === "all"
              ? "No team members yet — add your first one above."
              : `No ${filter === "floor" ? "floor" : "desk"} roles yet.`}
          </p>
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
                      onClick={() => {
                        removeProfile(p.id);
                        toast.success(`${p.full_name} removed from the team`);
                      }}
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
    </div>
  );
}
