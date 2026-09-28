// End-to-end money flows that create permanent records (tickets, expenses,
// payroll, closures, invites). These only run against a LOCAL Supabase (the
// throwaway database CI builds, or `supabase start`), never the real project.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { as, blocked } from "./helpers.mjs";

const host = new URL(process.env.VITE_SUPABASE_URL).hostname;
const LOCAL = ["127.0.0.1", "localhost"].includes(host);
const opts = { skip: LOCAL ? false : "writes permanent records; runs only on a local Supabase" };

const firstId = async (client, path) => (await client.select(path)).data?.[0]?.id;

describe("ticket lifecycle", opts, () => {
  test("front desk bills, server sets price and commission, paid is final", async () => {
    const owner = await as("owner");
    const desk = await as("receptionist");
    const staff = await as("staff");
    const serviceId = await firstId(owner, "services?select=id&name=eq.Wash%20%26%20style");
    const staffId = staff.userId;

    const created = await desk.rpc("create_ticket", {
      p_client_name: "Flow test",
      p_client_phone: "",
      p_payment_method: "cash",
      p_status: "pending",
      p_lines: [{ service_id: serviceId, staff_id: staffId }],
      p_usage: [],
    });
    assert.equal(created.ok, true, created.message);
    const ticketId = created.data;

    const ticket = (await owner.select(`tickets?select=total_amount,status&id=eq.${ticketId}`))
      .data[0];
    assert.equal(ticket.total_amount, 5000);
    assert.equal(ticket.status, "pending");
    const line = (
      await owner.select(`ticket_items?select=staff_commission_amount&ticket_id=eq.${ticketId}`)
    ).data[0];
    assert.equal(line.staff_commission_amount, 2500, "50% of 5000");

    const staffPay = await staff.update(`tickets?id=eq.${ticketId}`, { status: "paid" });
    assert.ok(blocked(staffPay), "staff marked a ticket paid");

    const paid = await desk.update(`tickets?id=eq.${ticketId}`, {
      status: "paid",
      reference: "TRF-001",
    });
    assert.equal(paid.data?.length, 1, paid.message);

    const again = await desk.update(`tickets?id=eq.${ticketId}`, { status: "pending" });
    assert.match(again.message ?? "", /already paid/);
  });
});

describe("expense lifecycle", opts, () => {
  test("manager logs, staff cannot void, owner voids once", async () => {
    const manager = await as("manager");
    const owner = await as("owner");
    const staff = await as("staff");

    const add = await manager.rpc("add_expense", {
      p_category: "generator_fuel",
      p_amount: 1500,
      p_generator_hours_run: 1,
      p_notes: "Flow test",
    });
    assert.equal(add.ok, true, add.message);
    const id = add.data;

    const staffVoid = await staff.rpc("void_expense", { p_expense_id: id, p_reason: "x" });
    assert.equal(staffVoid.ok, false);

    const ownerVoid = await owner.rpc("void_expense", { p_expense_id: id, p_reason: "test" });
    assert.equal(ownerVoid.ok, true, ownerVoid.message);

    const twice = await owner.rpc("void_expense", { p_expense_id: id, p_reason: "test" });
    assert.match(twice.message ?? "", /already voided/);
  });
});

describe("payroll and closing the day", opts, () => {
  test("payroll is recorded once per staff per period, staff see only their own", async () => {
    const owner = await as("owner");
    const staff = await as("staff");
    const args = {
      p_staff_id: staff.userId,
      p_period_start: "2026-01-01",
      p_period_end: "2026-01-31",
      p_commission: 2500,
      p_base_salary: 0,
    };
    const first = await owner.rpc("record_payroll_payment", args);
    assert.equal(first.ok, true, first.message);
    const second = await owner.rpc("record_payroll_payment", args);
    assert.equal(second.data, first.data, "paying twice must return the same payment");

    const mine = await staff.select("payments?select=staff_id,amount");
    assert.ok(mine.data.length >= 1);
    assert.ok(mine.data.every((p) => p.staff_id === staff.userId));
  });

  test("owner closes a period; the team cannot read or change closures", async () => {
    const owner = await as("owner");
    const closed = await owner.rpc("close_day", {
      p_period_start: "2026-01-01T00:00:00Z",
      p_period_end: "2026-01-01T23:59:59Z",
      p_totals: { gross: 5000 },
    });
    assert.equal(closed.ok, true, closed.message);
    for (const role of ["staff", "receptionist"]) {
      const rows = await (await as(role)).select("day_closures?select=id");
      assert.equal(rows.data.length, 0, `${role} can read closures`);
    }
  });
});

describe("plan cap", opts, () => {
  test("invites stop exactly at the plan's seat limit", async () => {
    const owner = await as("owner");
    const created = [];
    let refusal = null;
    for (let i = 0; i < 20 && !refusal; i++) {
      const res = await owner.rpc("create_invite", {
        p_role: "staff",
        p_commission_rate: 0.5,
        p_email: null,
      });
      if (res.ok) created.push(res.data);
      else refusal = res.message;
    }
    try {
      // Studio = 12 seats; the seed fills 4, so exactly 8 invites fit.
      assert.equal(created.length, 8);
      assert.match(refusal ?? "", /Staff limit reached/);
    } finally {
      if (created.length) await owner.remove(`invites?code=in.(${created.join(",")})`);
    }
  });
});
