// Seed a throwaway LOCAL Supabase (CI or `supabase start`) with one business and
// the four test accounts, using the app's real onboarding flow:
//   owner signs up -> create_owner_business -> invites -> each member signs up
//   and accepts their invite.
// Then adds a service, an inventory item and a paid ticket so every test has
// data to probe.
//
// Refuses to run against anything but localhost, so it can never touch the
// real project.

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = process.env.CONECKTOS_TEST_PASSWORD;

if (!URL || !KEY || !PASSWORD) throw new Error("Missing Supabase URL, key or test password");
const host = new globalThis.URL(URL).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) {
  throw new Error(`Refusing to seed ${host}: the seed only runs against a local Supabase`);
}

async function call(path, { method = "POST", token, body } = {}) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token ?? KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return data;
}

async function signUp(email) {
  const data = await call("/auth/v1/signup", { body: { email, password: PASSWORD } });
  const token = data.access_token ?? data.session?.access_token;
  if (!token) throw new Error(`No session for ${email}; enable autoconfirm for local auth`);
  return token;
}

const owner = await signUp("test.owner@conecktos.dev");
await call("/rest/v1/rpc/create_owner_business", {
  token: owner,
  body: { p_business_name: "My Business", p_owner_name: "Test Owner" },
});
// Studio plan so the team (4 members) fits under the staff cap.
await call("/rest/v1/subscriptions?plan=eq.starter", {
  method: "PATCH",
  token: owner,
  body: { plan: "studio" },
});

const members = [
  { email: "test.manager@conecktos.dev", name: "Test Manager", role: "manager", rate: 0 },
  { email: "test.reception@conecktos.dev", name: "Test Reception", role: "receptionist", rate: 0 },
  { email: "test.staff@conecktos.dev", name: "Test Staff", role: "staff", rate: 0.5 },
  { email: "test.colleague@conecktos.dev", name: "Test Colleague", role: "staff", rate: 0.4 },
];

for (const m of members) {
  const code = await call("/rest/v1/rpc/create_invite", {
    token: owner,
    body: { p_role: m.role, p_commission_rate: m.rate, p_email: null },
  });
  const token = await signUp(m.email);
  await call("/rest/v1/rpc/accept_invite", {
    token,
    body: {
      p_code: code,
      p_full_name: m.name,
      p_job_title: null,
      p_bank_name: null,
      p_account_number: null,
      p_account_name: null,
    },
  });
  if (m.email === "test.reception@conecktos.dev") m.token = token;
}

const serviceId = await call("/rest/v1/rpc/add_service", {
  token: owner,
  body: { p_name: "Wash & style", p_price: 5000, p_duration_minutes: 60 },
});
const itemId = await call("/rest/v1/rpc/add_inventory_item", {
  token: owner,
  body: { p_item_name: "Shampoo", p_quantity: 10, p_unit: "ml", p_reorder_level: 2 },
});

// A paid ticket (with consumable usage) billed by the front desk.
const staffId = (
  await call("/rest/v1/profiles_secure?select=id&full_name=eq.Test%20Staff", {
    method: "GET",
    token: owner,
  })
)[0].id;
const reception = members.find((m) => m.role === "receptionist").token;
await call("/rest/v1/rpc/create_ticket", {
  token: reception,
  body: {
    p_client_name: "Seed client",
    p_client_phone: "",
    p_payment_method: "cash",
    p_status: "paid",
    p_lines: [{ service_id: serviceId, staff_id: staffId }],
    p_usage: [{ inventory_id: itemId, quantity_used: 1 }],
  },
});

console.log("Seeded local Supabase: 1 business, 5 accounts, 1 service, 1 item, 1 paid ticket");
