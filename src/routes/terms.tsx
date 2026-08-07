import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · ConecktOS" },
      { name: "description", content: "The terms governing your use of ConecktOS." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="relative min-h-dvh">
      <div id="main-content" className="mx-auto max-w-3xl px-5 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: February 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            These terms govern your use of ConecktOS. By creating an account or using the service, you
            agree to them. If you're using ConecktOS on behalf of a business, you confirm you're
            authorised to accept these terms for it.
          </p>

          <Section title="Accounts">
            <p>You're responsible for your account, your team's access, and keeping credentials secure. Owners are responsible for the roles and permissions they grant their staff.</p>
          </Section>

          <Section title="Acceptable use">
            <p>Use ConecktOS lawfully. Don't attempt to breach security, access other businesses' data, or disrupt the service. Location and attendance features must be used with your staff's knowledge and consent.</p>
          </Section>

          <Section title="Payments & tips">
            <p>Tips and payments are processed by Paystack under their terms. ConecktOS facilitates the connection but is not a party to the transaction and does not hold funds. You're responsible for the accuracy of commission rates and payout details you configure.</p>
          </Section>

          <Section title="Your data">
            <p>Your business data remains yours. We process it to provide the service as described in our Privacy Policy. You can export or request deletion at any time.</p>
          </Section>

          <Section title="Availability">
            <p>We work to keep ConecktOS available and reliable but provide it "as is" without warranties. We're not liable for indirect or consequential losses arising from use of the service, to the extent permitted by law.</p>
          </Section>

          <Section title="Termination">
            <p>You may stop using ConecktOS at any time. We may suspend accounts that breach these terms, with notice where practicable.</p>
          </Section>

          <Section title="Governing law">
            <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
          </Section>

          <Section title="Contact">
            <p>Questions? Email <span className="text-foreground">legal@conecktos.app</span>.</p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          See also our{" "}
          <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
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
