import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Package, Receipt, MapPinOff, ArrowRight } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { useRoleGuard } from "@/lib/access";
import { lowStock } from "@/lib/reports";
import { naira, timeOf } from "@/lib/groompulse";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [{ title: "Notifications · ConecktOS" }],
  }),
  component: NotificationsPage,
});

const OPS_ROLES = ["owner", "manager", "receptionist"] as const;

function NotificationsPage() {
  useRoleGuard(OPS_ROLES);
  const { inventory, tickets, attendance, profiles } = useStore();

  const low = lowStock(inventory);
  const pending = tickets.filter((t) => t.status === "pending");
  const offSite = attendance.filter((a) => a.clock_out_time === null && !a.is_within_geofence);
  const total = low.length + pending.length + offSite.length;

  return (
    <AppShell
      title="Notifications"
      subtitle={total ? `${total} item${total > 1 ? "s" : ""} need attention` : "All caught up"}
    >
      {total === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="Alerts about low stock, unpaid tickets and off-site clock-ins will appear here."
        />
      ) : (
        <div className="mx-auto max-w-3xl space-y-5">
          {low.length ? (
            <AlertGroup title="Low stock" icon={Package} count={low.length}>
              {low.map((i) => (
                <AlertRow
                  key={i.id}
                  title={i.item_name}
                  detail={`${i.quantity} ${i.unit} left · reorder at ${i.reorder_level}`}
                  to="/admin"
                  action="Restock"
                />
              ))}
            </AlertGroup>
          ) : null}

          {pending.length ? (
            <AlertGroup title="Awaiting payment" icon={Receipt} count={pending.length}>
              {pending.map((t) => (
                <AlertRow
                  key={t.id}
                  title={t.client_name || "Walk-in"}
                  detail={`${naira(t.total_amount)} · opened ${timeOf(t.created_at)}`}
                  to="/reception"
                  action="Match"
                />
              ))}
            </AlertGroup>
          ) : null}

          {offSite.length ? (
            <AlertGroup title="Off-site clock-ins" icon={MapPinOff} count={offSite.length}>
              {offSite.map((a) => {
                const who = profiles.find((p) => p.id === a.staff_id);
                return (
                  <AlertRow
                    key={a.id}
                    title={who?.full_name ?? "Staff"}
                    detail={`Clocked in ${timeOf(a.clock_in_time)} · ${
                      a.clock_in_lat === null ? "location unavailable" : "outside geofence"
                    }`}
                    to="/admin"
                    action="Review"
                  />
                );
              })}
            </AlertGroup>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function AlertGroup({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="card-lux overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Icon className="size-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

function AlertRow({
  title,
  detail,
  to,
  action,
}: {
  title: string;
  detail: string;
  to: "/admin" | "/reception";
  action: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
      >
        {action}
        <ArrowRight className="size-3.5" />
      </Link>
    </li>
  );
}
