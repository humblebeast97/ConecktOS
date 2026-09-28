// Shared helpers for the security suite (npm run test:security).
//
// These tests hit the real Supabase project named in .env, signed in as the
// dev test accounts, and check that the database itself enforces each rule
// (RLS policies, column grants, SECURITY DEFINER role checks). They go around
// the UI on purpose: a rule that only the UI enforces is not a rule.
//
// They are designed to leave no data behind. Each permission is proven either
// by a refusal, or by a request that passes the permission check and is then
// stopped by a later validation, so nothing is written. The few tests that do
// write (adding a service / inventory item) delete what they created.

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = process.env.CONECKTOS_TEST_PASSWORD;

if (!URL || !KEY || !PASSWORD) {
  throw new Error(
    "Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY or CONECKTOS_TEST_PASSWORD in .env",
  );
}

export const ACCOUNTS = {
  owner: "test.owner@conecktos.dev",
  manager: "test.manager@conecktos.dev",
  receptionist: "test.reception@conecktos.dev",
  staff: "test.staff@conecktos.dev",
};

const sessions = new Map();

/** Sign in once per role and return a client bound to that session. */
export async function as(role) {
  if (!sessions.has(role)) {
    const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: ACCOUNTS[role], password: PASSWORD }),
    });
    const body = await res.json();
    if (!res.ok)
      throw new Error(`Sign-in failed for ${role}: ${body.error_description ?? res.status}`);
    sessions.set(role, { token: body.access_token, userId: body.user.id });
  }
  const { token, userId } = sessions.get(role);
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const send = async (method, path, body, prefer = "return=representation") => {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      method,
      headers: { ...headers, Prefer: prefer },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data, message: data?.message ?? null };
  };

  return {
    userId,
    select: (path) => send("GET", path),
    insert: (table, row) => send("POST", table, row),
    update: (path, patch) => send("PATCH", path, patch),
    remove: (path) => send("DELETE", path),
    rpc: (fn, args) => send("POST", `rpc/${fn}`, args ?? {}),
  };
}

/** True when a write was blocked: an error status, or a success that touched no rows. */
export function blocked(res) {
  if (!res.ok) return true;
  return Array.isArray(res.data) && res.data.length === 0;
}
