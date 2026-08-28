import { useMemo } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useExpenses, useSalon, useStaff } from "@/api";
import { naira, nextUnpaidPaydayDays } from "@/lib/groompulse";
import { useSubmit } from "@/lib/use-submit";

/**
 * Owner-dashboard card that surfaces upcoming (or overdue) monthly payroll.
 * Reads each staff member's base_salary + salary_payday + salary_last_paid_at,
 * hides itself when cadence is Off or nobody is due, and lets the owner mark
 * every entry paid — which logs a Salary expense per person and rolls each
 * paid cursor forward so the next cycle picks up automatically.
 */
export function PayrollReminderCard() {
  const { salon } = useSalon();
  const { staff, updateProfile } = useStaff();
  const { addExpense } = useExpenses();
  const { isSubmitting, submit } = useSubmit();
  const cadence = salon.payroll_reminder_days ?? 7;

  const dueList = useMemo(
    () =>
      staff
        .filter((s) => (s.base_salary ?? 0) > 0 && s.salary_payday != null)
        .map((s) => ({
          id: s.id,
          name: s.full_name,
          amount: s.base_salary ?? 0,
          payday: s.salary_payday!,
          days: nextUnpaidPaydayDays(s.salary_payday!, s.salary_last_paid_at),
        }))
        .sort((a, b) => a.days - b.days),
    [staff],
  );

  if (cadence === 0 || dueList.length === 0) return null;
  const soonest = dueList[0].days;
  const showAlways = cadence === -1;
  if (!showAlways && soonest > cadence) return null;

  const total = dueList.reduce((s, r) => s + r.amount, 0);
  const overdue = soonest <= 0;

  const markAllPaid = () =>
    submit(() => {
      const now = new Date().toISOString();
      dueList.forEach((row) => {
        addExpense({
          category: "salary",
          amount: row.amount,
          generator_hours_run: null,
          notes: `Salary · ${row.name}`,
        });
        updateProfile(row.id, { salary_last_paid_at: now });
      });
      toast.success("Payroll paid & rolled forward", {
        description: `${dueList.length} salary entries logged; next payday in about a month.`,
      });
    });

  return (
    <section
      className={
        overdue
          ? "mb-5 rounded-2xl border border-warning/40 bg-warning/10 p-5"
          : "mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Clock className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold">
              {overdue
                ? "Payroll overdue"
                : soonest === 1
                  ? "Payroll due tomorrow"
                  : `Payroll due in ${soonest} days`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dueList.length} staff · reminder{" "}
              {showAlways ? "always on" : `set to ${cadence} days`}
            </p>
          </div>
        </div>
        <span className="font-display text-lg font-bold tabular-nums text-primary">
          {naira(total)}
        </span>
      </div>
      <ul className="mt-4 divide-y divide-border border-t border-border">
        {dueList.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              {row.name}
              <span className="ml-2 text-xs text-muted-foreground">
                payday {row.payday} · {row.days === 0 ? "today" : `in ${row.days}d`}
              </span>
            </span>
            <span className="tabular-nums text-primary">{naira(row.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button onClick={markAllPaid} disabled={isSubmitting}>
          {isSubmitting ? "Marking…" : "Mark all paid"}
        </Button>
      </div>
    </section>
  );
}
