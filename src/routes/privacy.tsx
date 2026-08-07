import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · ConecktOS" },
      { name: "description", content: "How ConecktOS collects, uses and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="relative min-h-dvh">
      <div id="main-content" role="main" className="mx-auto max-w-3xl px-5 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: February 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            ConecktOS ("we", "us") provides operations software for service businesses. This policy
            explains what we collect, why, and the choices you have. It is written to align with the
            Nigeria Data Protection Act (NDPA) and comparable regimes.
          </p>

          <Section title="Data we collect">
            <ul className="list-disc space-y-1.5 pl-5">
              <li><span className="text-foreground">Account data</span> — name, email and role of each team member.</li>
              <li><span className="text-foreground">Business records</span> — services, tickets, commissions, inventory and expenses you enter.</li>
              <li><span className="text-foreground">Location data</span> — a staff member's device location is read only at the moment they choose to clock in, to verify attendance against your business's geofence. We do not track location continuously or in the background.</li>
              <li><span className="text-foreground">Device data</span> — basic technical information needed to run the app.</li>
            </ul>
          </Section>

          <Section title="How we use it">
            <p>To run the features you enable: attendance, commission splits, inventory, tipping and end-of-day reconciliation. We do not sell your data or use it for advertising.</p>
          </Section>

          <Section title="Location consent">
            <p>Location is only captured when a staff member taps "Clock in" and grants permission. Declining still lets them clock in — the record is simply marked unverified. You can revoke device location permission at any time in your browser or phone settings.</p>
          </Section>

          <Section title="Service providers">
            <p>We use <span className="text-foreground">Supabase</span> for authentication and database hosting, and <span className="text-foreground">Paystack</span> to process tips and payments. Card details are handled entirely by Paystack — ConecktOS never sees or stores them.</p>
          </Section>

          <Section title="Data isolation & retention">
            <p>Each business's data is isolated from every other business. We retain records for as long as your account is active, and delete or anonymise them on request, subject to legal obligations.</p>
          </Section>

          <Section title="Your rights">
            <p>You may access, correct, export or delete your data, and object to certain processing. To exercise these rights, contact us at <span className="text-foreground">privacy@conecktos.app</span>.</p>
          </Section>

          <Section title="Contact">
            <p>Questions about this policy? Email <span className="text-foreground">privacy@conecktos.app</span>.</p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          See also our{" "}
          <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
