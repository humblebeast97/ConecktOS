import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Percent, Users } from "lucide-react";
import { AppShell, MetricCard } from "@/components/app-shell";
import { TeamOnboarding } from "@/components/team-onboarding";
import { useStore } from "@/lib/store";
import { useRoleGuard } from "@/lib/access";
import { earnsCommission } from "@/lib/groompulse";
import { useIndustryConfig } from "@/config/industry-context";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team & HR Onboarding · ConecktOS" },
      {
        name: "description",
        content:
          "Onboard stylists, barbers, nail techs, receptionists and managers with a guided 3-step wizard: commission splits, Paystack tip subaccounts and payout readiness.",
      },
      { property: "og:title", content: "Team & HR Onboarding · ConecktOS" },
      {
        property: "og:description",
        content:
          "Guided onboarding for every salon role — commission splits and Paystack tip subaccounts in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

const TEAM_ROLES = ["owner", "manager"] as const;

function TeamPage() {
  useRoleGuard(TEAM_ROLES);
  const config = useIndustryConfig();
  const { profiles, salon } = useStore();
  const floor = profiles.filter((p) => earnsCommission(p.role));
  const pendingPayouts = floor.filter((p) => !p.paystack_subaccount_code).length;

  return (
    <AppShell
      title="Team & HR"
      subtitle={`${salon.name} · ${floor.length} on the floor · ${profiles.length - floor.length} at the desk`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Team size"
          value={String(profiles.length)}
          hint={`${floor.length} commission earners`}
          icon={Users}
        />
        <MetricCard
          label="Avg. commission"
          value={`${Math.round(
            (floor.reduce((s, p) => s + p.commission_rate, 0) / Math.max(1, floor.length)) *
              100,
          )}%`}
          hint="Across floor roles"
          icon={Percent}
          tone="gold"
        />
        <MetricCard
          label="Payout setup"
          value={pendingPayouts === 0 ? "Complete" : `${pendingPayouts} pending`}
          hint={config.showTipping ? "Paystack tip subaccounts" : "Paystack payout subaccounts"}
          icon={BadgeCheck}
          tone={pendingPayouts === 0 ? "success" : "danger"}
        />
      </div>

      <div className="mt-5">
        <TeamOnboarding />
      </div>
    </AppShell>
  );
}
