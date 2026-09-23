import { useState } from "react";
import { Clock, Copy, Link2, Loader2, MessageCircle, Share2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useBusiness, useInvites, useOnboarding } from "@/api";
import { useIndustryConfig } from "@/config/industry-context";
import { copyText } from "@/lib/clipboard";
import { roleLabel, type Role } from "@/lib/groompulse";
import { daysLeft, inviteLink, inviteMessage, type Invite } from "@/lib/invites";

/**
 * Where the owner/manager shares invites from. Lists every unused invite with
 * its link, and offers Copy link, Share (native share sheet) and WhatsApp, plus
 * Revoke. The newest invite (just created) is highlighted.
 */
export function InvitesPanel({ highlightCode }: { highlightCode?: string | null }) {
  const { invites, isLoading } = useInvites();
  const { revokeInvite } = useOnboarding();
  const [pendingRevoke, setPendingRevoke] = useState<Invite | null>(null);

  return (
    <section className="card-lux rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-primary" />
        <h3 className="text-base font-bold">Invite links</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Send a link to each new teammate. They open it, create their account and enter their own
        details. Each link works once and expires after 14 days.
      </p>

      {isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading invites…
        </p>
      ) : invites.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No pending invites. Create one above to get a shareable link.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {invites.map((inv) => (
            <InviteRow
              key={inv.id}
              invite={inv}
              highlighted={inv.code === highlightCode}
              onRevoke={() => setPendingRevoke(inv)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        title="Revoke this invite?"
        description={
          pendingRevoke
            ? `The link with code ${pendingRevoke.code} will stop working. Anyone who hasn't joined yet will need a new invite.`
            : ""
        }
        confirmLabel="Revoke"
        destructive
        onConfirm={() => {
          if (!pendingRevoke) return;
          const code = pendingRevoke.code;
          revokeInvite(pendingRevoke.id)
            .then(() => toast.success(`Invite ${code} revoked`))
            .catch((e: unknown) =>
              toast.error("Could not revoke the invite", {
                description: e instanceof Error ? e.message : String(e),
              }),
            );
        }}
      />
    </section>
  );
}

function InviteRow({
  invite,
  highlighted,
  onRevoke,
}: {
  invite: Invite;
  highlighted: boolean;
  onRevoke: () => void;
}) {
  const config = useIndustryConfig();
  const { business } = useBusiness();
  const link = inviteLink(invite.code);
  const message = inviteMessage(invite.code, business.name);
  const days = daysLeft(invite.expires_at);
  const roleName = (r: Role) => (r === "staff" ? config.staffTitle : roleLabel[r]);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    const ok = await copyText(link);
    if (ok) toast.success("Invite link copied");
    else toast.error("Couldn't copy. Long-press the link to copy it instead.");
  };

  const share = async () => {
    try {
      await navigator.share({ title: `Join ${business.name} on ConecktOS`, text: message });
    } catch {
      /* user closed the share sheet */
    }
  };

  return (
    <li
      className={
        highlighted
          ? "rounded-xl border border-primary/60 bg-primary/5 p-3"
          : "rounded-xl border border-border p-3"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {roleName(invite.role)}
            {invite.role === "staff" && invite.preset_commission_rate !== null
              ? ` · ${Math.round(invite.preset_commission_rate * 100)}% commission`
              : ""}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {days === null ? "No expiry" : days === 0 ? "Expires today" : `Expires in ${days}d`}
            <span aria-hidden>·</span>
            <span className="font-mono tracking-wider text-foreground">{invite.code}</span>
          </p>
        </div>
        {highlighted ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            New
          </span>
        ) : null}
      </div>

      <p
        className="mt-2 truncate rounded-lg bg-muted px-2 py-1.5 font-mono text-[11px] text-muted-foreground"
        title={link}
      >
        {link}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" className="h-9 font-semibold" onClick={() => void copy()}>
          <Copy className="size-4" />
          Copy link
        </Button>
        {canNativeShare ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => void share()}
          >
            <Share2 className="size-4" />
            Share
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" className="h-9" asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 text-destructive hover:text-destructive"
          onClick={onRevoke}
        >
          <XCircle className="size-4" />
          Revoke
        </Button>
      </div>
    </li>
  );
}
