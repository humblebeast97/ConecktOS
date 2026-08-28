import { createFileRoute } from "@tanstack/react-router";
import { Copy, Sparkles, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";

export const Route = createFileRoute("/tip")({
  validateSearch: (search: Record<string, unknown>) => ({
    n: typeof search.n === "string" ? search.n : "",
    b: typeof search.b === "string" ? search.b : "",
    a: typeof search.a === "string" ? search.a : "",
    an: typeof search.an === "string" ? search.an : "",
    biz: typeof search.biz === "string" ? search.biz : "",
  }),
  head: () => ({
    meta: [{ title: "Send a tip · ConecktOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TipPage,
});

function TipPage() {
  const { n, b, a, an, biz } = Route.useSearch();
  const firstName = n.split(" ")[0] || "them";
  const accountName = an || n;

  const copy = async () => {
    if (!a) return;
    const ok = await copyText(a);
    if (ok) toast.success("Account number copied");
    else toast.error("Couldn't copy — long-press the number to copy");
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {a ? (
          <div className="card-lux rounded-3xl border border-primary/30 p-6 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-gold text-gold-foreground shadow-gold">
              <HeartHandshake className="size-6" />
            </div>
            {biz ? (
              <p className="mt-4 font-display text-xs uppercase tracking-[0.25em] text-primary">
                {biz}
              </p>
            ) : null}
            <h1 className="mt-2 font-display text-2xl font-bold">Tip {firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Send your tip by bank transfer — any amount is appreciated.
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
              <p className="text-sm text-muted-foreground">{b}</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-display text-2xl font-bold tracking-wider tabular-nums">
                  {a}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  aria-label="Copy account number"
                  className="grid size-11 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground active:scale-95 sm:size-8"
                >
                  <Copy className="size-5 sm:size-4" />
                </button>
              </div>
              <p className="mt-1 text-sm font-medium">{accountName}</p>
            </div>

            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Suggested tip
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {["₦1,000", "₦2,000", "₦5,000"].map((amt) => (
                  <span
                    key={amt}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    {amt}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-5 text-[11px] text-muted-foreground">
              Copy the account number and transfer any amount in your banking app.
            </p>
          </div>
        ) : (
          <div className="card-lux rounded-3xl p-8 text-center">
            <h1 className="font-display text-xl font-bold">Tip link incomplete</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This tip link is missing account details. Ask the staff member to share their QR
              again.
            </p>
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Powered by ConecktOS
        </p>
      </div>
    </div>
  );
}
