import type { Role } from "@/lib/groompulse";

/** A row of public.invites, as the owner/manager sees it. */
export interface Invite {
  id: string;
  business_id: string;
  code: string;
  role: Role;
  preset_commission_rate: number | null;
  email: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
  expires_at: string | null;
}

/** The link a teammate opens to join: /join with the code pre-filled. */
export function inviteLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join?code=${encodeURIComponent(code)}`;
}

/** Message used by Share / WhatsApp. Plain text, works in any chat app. */
export function inviteMessage(code: string, businessName: string): string {
  return `You're invited to join ${businessName} on ConecktOS. Create your account here: ${inviteLink(code)} (invite code ${code})`;
}

/** Whole days until the invite expires (0 = under half a day left), or null if
 * it never does. Rounded, not ceiled, so a fresh 14-day invite reads 14 even if
 * the device clock is a little behind the server's. */
export function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}
