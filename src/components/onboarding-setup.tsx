import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/api";

/**
 * Shown by AuthGate when a signed-in user has no workspace profile yet: either a
 * new owner creating their business, or an invited teammate entering their code.
 * On success the `me` profile query refetches and AuthGate renders their portal.
 */
const INVITE_KEY = "conecktos-invite-code";

function readInviteCode() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(INVITE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function OnboardingSetup({ onSignOut }: { onSignOut: () => void | Promise<void> }) {
  const { createOwnerBusiness, acceptInvite } = useOnboarding();
  const pendingCode = readInviteCode();
  const [tab, setTab] = useState<"create" | "join">(pendingCode ? "join" : "create");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [code, setCode] = useState(pendingCode);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const createBusiness = async () => {
    if (!businessName.trim() || !ownerName.trim()) {
      toast.error("Add your business name and your name");
      return;
    }
    setBusy(true);
    try {
      await createOwnerBusiness!(businessName.trim(), ownerName.trim());
      toast.success("Business created. Welcome to ConecktOS");
    } catch (e) {
      toast.error("Could not create the business", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const joinTeam = async () => {
    if (!code.trim() || !fullName.trim()) {
      toast.error("Enter your invite code and your name");
      return;
    }
    setBusy(true);
    try {
      await acceptInvite!(code.trim(), fullName.trim(), null, null, null, null);
      try {
        window.localStorage.removeItem(INVITE_KEY);
      } catch {
        /* ignore */
      }
      toast.success("You're in. Opening your portal");
    } catch (e) {
      toast.error("Could not join with that code", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="glass w-full max-w-md rounded-3xl p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Finish setting up
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">One last step</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is ready. Create your business, or join one with an invite code.
        </p>

        <div
          className="mt-5 grid grid-cols-2 gap-1.5 rounded-full border border-border bg-muted p-1"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "create"}
            onClick={() => setTab("create")}
            className={
              tab === "create"
                ? "rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-ink-foreground"
                : "rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
            }
          >
            Create a business
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "join"}
            onClick={() => setTab("join")}
            className={
              tab === "join"
                ? "rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-ink-foreground"
                : "rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
            }
          >
            Join with a code
          </button>
        </div>

        {tab === "create" ? (
          <div className="mt-5 space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="ob-biz">Business name</Label>
              <Input
                id="ob-biz"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Marina Service Co."
                className="h-11 bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-name">Your name</Label>
              <Input
                id="ob-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Adaeze Okonkwo"
                className="h-11 bg-surface"
              />
            </div>
            <Button onClick={createBusiness} disabled={busy} className="h-11 w-full font-semibold">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create business
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="ob-code">Invite code</Label>
              <Input
                id="ob-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="From your manager"
                className="h-11 bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-fullname">Your name</Label>
              <Input
                id="ob-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Chidi Nwosu"
                className="h-11 bg-surface"
              />
            </div>
            <Button onClick={joinTeam} disabled={busy} className="h-11 w-full font-semibold">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Join team
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-5 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
