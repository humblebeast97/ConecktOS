import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";

export type OnboardingStep = {
  label: string;
  done: boolean;
  to: "/settings" | "/team" | "/reception" | "/admin" | "/staff";
};

export function OnboardingChecklist({
  title = "Getting started",
  steps,
}: {
  title?: string;
  steps: OnboardingStep[];
}) {
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.find((s) => !s.done);

  return (
    <section className="card-lux mb-5 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
      </div>
      <Progress value={(doneCount / steps.length) * 100} className="mt-3 h-2" />
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            {s.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
            {!s.done && s === next ? (
              <Link
                to={s.to}
                className="ml-auto shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Do it →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
