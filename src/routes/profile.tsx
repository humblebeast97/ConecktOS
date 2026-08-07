import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import {
  Save,
  Banknote,
  TrendingUp,
  Percent,
  BadgeCheck,
  AlertCircle,
  Building2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, MetricCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { earnsCommission, naira, roleLabel } from "@/lib/groompulse";
import { staffDailyCommission } from "@/lib/reports";

const QRCode = lazy(() => import("react-qr-code"));

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Your profile · ConecktOS" }],
  }),
  component: ProfilePage,
});

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

function ProfilePage() {
  const { currentUser, salon, updateProfile, tickets, ticketItems } = useStore();
  const [name, setName] = useState(currentUser.full_name);
  const isStaff = earnsCommission(currentUser.role);
  const daily = staffDailyCommission(currentUser.id, tickets, ticketItems);
  const payoutLinked = Boolean(currentUser.paystack_subaccount_code);
  const tipUrl = `https://paystack.com/pay/conecktos-tip?subaccount=${currentUser.paystack_subaccount_code ?? "pending"}&staff=${encodeURIComponent(currentUser.full_name)}`;

  const saveName = () => {
    if (!name.trim()) {
      toast.error("Your name can't be empty");
      return;
    }
    updateProfile(currentUser.id, { full_name: name.trim() });
    toast.success("Profile updated");
  };

  return (
    <AppShell title="Your profile" subtitle={roleLabel[currentUser.role]}>
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-gold font-display text-xl font-bold text-gold-foreground">
              {initialsOf(currentUser.full_name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{currentUser.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {roleLabel[currentUser.role]} · {salon.name}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="pf-name">Full name</Label>
              <Input
                id="pf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-surface"
              />
            </div>
            <Button onClick={saveName} className="h-11" disabled={name.trim() === currentUser.full_name}>
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </section>

        {isStaff ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard label="Earned today" value={naira(daily.earned)} icon={Banknote} tone="gold" />
              <MetricCard label="Revenue today" value={naira(daily.revenue)} icon={TrendingUp} />
              <MetricCard
                label="Commission rate"
                value={`${Math.round(currentUser.commission_rate * 100)}%`}
                icon={Percent}
              />
            </div>

            <section className="card-lux rounded-2xl p-5 sm:p-6">
              <h2 className="text-lg font-bold">Payout account</h2>
              <p
                className={
                  payoutLinked
                    ? "mt-2 inline-flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5 text-sm text-success"
                    : "mt-2 inline-flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-1.5 text-sm text-warning"
                }
              >
                {payoutLinked ? <BadgeCheck className="size-4" /> : <AlertCircle className="size-4" />}
                {payoutLinked
                  ? `Linked · ${currentUser.paystack_subaccount_code}`
                  : "Not linked yet — ask your manager to add your Paystack subaccount."}
              </p>
            </section>

            <section className="card-lux rounded-2xl p-5 text-center sm:p-6">
              <h2 className="text-lg font-bold">Your tip QR</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Display or print this so clients can tip you directly.
              </p>
              <div className="mx-auto mt-4 grid size-[184px] w-fit place-items-center rounded-xl bg-white p-3">
                <Suspense fallback={<Loader2 className="size-6 animate-spin text-[#111318]" />}>
                  <QRCode value={tipUrl} size={160} bgColor="#ffffff" fgColor="#111318" />
                </Suspense>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["₦1,000", "₦2,000", "₦5,000", "Custom"].map((amt) => (
                  <span
                    key={amt}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    {amt}
                  </span>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="card-lux rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold">Account</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-3">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium">{roleLabel[currentUser.role]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Business</dt>
                <dd className="font-medium">{salon.name}</dd>
              </div>
            </dl>
            {currentUser.role === "owner" || currentUser.role === "manager" ? (
              <Link
                to="/settings"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Building2 className="size-4" />
                Business settings
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
          </section>
        )}
      </div>
    </AppShell>
  );
}
