// Money and operations tables: tickets, commission lines, expenses, payroll,
// day closures, services, inventory. See migration 20260928120000.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { as, blocked } from "./helpers.mjs";

const NO_SUCH_ID = "00000000-0000-0000-0000-000000000000";

describe("staff cannot write money data directly", () => {
  // No-op writes (a column set to its current value): if staff had write
  // access the row would come back; blocked means nothing is returned.
  const probes = {
    tickets: "total_amount",
    ticket_items: "staff_commission_amount",
    services: "price",
    expenses: "amount",
    payments: "amount",
    payroll_lines: "commission_amount",
    payroll_runs: "period_start",
    day_closures: "period_start",
    inventory_items: "quantity",
    ticket_inventory_usage: "quantity_used",
    tips: "amount",
  };

  for (const [table, column] of Object.entries(probes)) {
    test(`staff cannot update ${table}.${column}`, async (t) => {
      const owner = await as("owner");
      const staff = await as("staff");
      const rows = await owner.select(`${table}?select=id,${column}&limit=1`);
      if (!rows.ok || rows.data.length === 0) return t.skip(`no ${table} rows to probe`);
      const row = rows.data[0];
      const res = await staff.update(`${table}?id=eq.${row.id}`, { [column]: row[column] });
      assert.ok(blocked(res), `staff wrote ${table}: ${JSON.stringify(res.data)}`);
    });
  }

  test("staff cannot insert a ticket directly", async () => {
    const staff = await as("staff");
    const res = await staff.insert("tickets", { business_id: NO_SUCH_ID, total_amount: 1 });
    assert.equal(res.ok, false);
  });

  test("staff cannot insert an expense directly", async () => {
    const staff = await as("staff");
    const res = await staff.insert("expenses", {
      business_id: NO_SUCH_ID,
      category: "supplies",
      amount: 1,
    });
    assert.equal(res.ok, false);
  });
});

describe("tickets", () => {
  // Valid service + staff with an unknown inventory item: the function passes
  // the role check and line validation, then fails on the usage line, so the
  // whole call rolls back and nothing is saved.
  const ticketArgs = async () => {
    const owner = await as("owner");
    const service = (await owner.select("services?select=id&limit=1")).data?.[0];
    const staffRow = (await owner.select("profiles_secure?select=id&role=eq.staff&limit=1"))
      .data?.[0];
    return {
      service,
      staffRow,
      args: {
        p_client_name: "Security test (rolled back)",
        p_client_phone: "",
        p_payment_method: "cash",
        p_status: "pending",
        p_lines: service && staffRow ? [{ service_id: service.id, staff_id: staffRow.id }] : [],
        p_usage: [{ inventory_id: NO_SUCH_ID, quantity_used: 1 }],
      },
    };
  };

  test("staff cannot create a ticket", async () => {
    const staff = await as("staff");
    const { args } = await ticketArgs();
    const res = await staff.rpc("create_ticket", args);
    assert.match(res.message ?? "", /Only the front desk can create tickets/);
  });

  test("front desk passes the role check (call rolled back, nothing saved)", async (t) => {
    const { service, staffRow, args } = await ticketArgs();
    if (!service || !staffRow) return t.skip("needs a service and a staff member");
    for (const role of ["receptionist", "manager", "owner"]) {
      const res = await (await as(role)).rpc("create_ticket", args);
      assert.match(res.message ?? "", /Invalid inventory item/, `${role}: ${res.message}`);
    }
  });

  test("a staff member from outside the business is rejected", async (t) => {
    const { service, args } = await ticketArgs();
    if (!service) return t.skip("needs a service");
    const res = await (
      await as("receptionist")
    ).rpc("create_ticket", {
      ...args,
      p_lines: [{ service_id: service.id, staff_id: NO_SUCH_ID }],
    });
    assert.match(res.message ?? "", /Invalid staff member/);
  });

  test("a paid ticket cannot be changed, even by the front desk", async (t) => {
    const owner = await as("owner");
    const paid = (await owner.select("tickets?select=id,reference&status=eq.paid&limit=1"))
      .data?.[0];
    if (!paid) return t.skip("no paid ticket to probe");
    const res = await (
      await as("receptionist")
    ).update(`tickets?id=eq.${paid.id}`, {
      reference: paid.reference,
    });
    assert.match(res.message ?? "", /already paid/);
  });

  test("front desk cannot change a ticket's total", async (t) => {
    const owner = await as("owner");
    const row = (await owner.select("tickets?select=id,total_amount&limit=1")).data?.[0];
    if (!row) return t.skip("no ticket to probe");
    const res = await (
      await as("receptionist")
    ).update(`tickets?id=eq.${row.id}`, {
      total_amount: row.total_amount,
    });
    assert.equal(res.ok, false, "total_amount must not be writable");
  });
});

describe("expenses", () => {
  test("staff and front desk cannot log expenses", async () => {
    for (const role of ["staff", "receptionist"]) {
      const res = await (
        await as(role)
      ).rpc("add_expense", {
        p_category: "supplies",
        p_amount: 1,
        p_generator_hours_run: null,
        p_notes: "security test",
      });
      assert.match(res.message ?? "", /Only owners and managers can log expenses/, role);
    }
  });

  test("owner and manager pass the role check (zero amount refused, nothing saved)", async () => {
    for (const role of ["owner", "manager"]) {
      const res = await (
        await as(role)
      ).rpc("add_expense", {
        p_category: "supplies",
        p_amount: 0,
        p_generator_hours_run: null,
        p_notes: "security test",
      });
      assert.match(res.message ?? "", /greater than zero/, role);
    }
  });
});

describe("payroll, closures and reset", () => {
  const payroll = (staffId, commission) => ({
    p_staff_id: staffId,
    p_period_start: "2000-01-01",
    p_period_end: "2000-01-31",
    p_commission: commission,
    p_base_salary: 0,
  });

  test("staff and front desk cannot record payroll", async () => {
    for (const role of ["staff", "receptionist"]) {
      const client = await as(role);
      const res = await client.rpc("record_payroll_payment", payroll(client.userId, 1));
      assert.match(res.message ?? "", /Only owners and managers can run payroll/, role);
    }
  });

  test("owner passes the role check (negative amount refused, nothing saved)", async () => {
    const owner = await as("owner");
    const staffRow = (await owner.select("profiles_secure?select=id&role=eq.staff&limit=1"))
      .data[0];
    const res = await owner.rpc("record_payroll_payment", payroll(staffRow.id, -1));
    assert.match(res.message ?? "", /cannot be negative/);
  });

  test("only the owner can close a period", async () => {
    for (const role of ["staff", "receptionist", "manager"]) {
      const res = await (
        await as(role)
      ).rpc("close_day", {
        p_period_start: "2000-01-01T00:00:00Z",
        p_period_end: "2000-01-01T23:59:59Z",
        p_totals: {},
      });
      assert.match(res.message ?? "", /Only the owner can close a period/, role);
    }
  });

  test("only the owner can reset business data", async () => {
    // Never call this as the owner here: it really deletes data.
    for (const role of ["staff", "receptionist", "manager"]) {
      const res = await (await as(role)).rpc("reset_business_data");
      assert.match(res.message ?? "", /Only the owner can reset/, role);
    }
  });

  test("staff only see their own payments and no payroll runs or closures", async () => {
    const staff = await as("staff");
    const payments = await staff.select("payments?select=staff_id");
    assert.ok(payments.data.every((p) => p.staff_id === staff.userId));
    const lines = await staff.select("payroll_lines?select=staff_id");
    assert.ok(lines.data.every((l) => l.staff_id === staff.userId));
    assert.equal((await staff.select("payroll_runs?select=id")).data.length, 0);
    assert.equal((await staff.select("day_closures?select=id")).data.length, 0);
  });
});

describe("services and inventory", () => {
  test("staff and front desk cannot add services or inventory", async () => {
    for (const role of ["staff", "receptionist"]) {
      const client = await as(role);
      const svc = await client.rpc("add_service", {
        p_name: "x",
        p_price: 1,
        p_duration_minutes: 1,
      });
      assert.match(svc.message ?? "", /Only owners and managers can manage services/, role);
      const inv = await client.rpc("add_inventory_item", {
        p_item_name: "x",
        p_quantity: 1,
        p_unit: "",
        p_reorder_level: 0,
      });
      assert.match(inv.message ?? "", /Only owners and managers can manage inventory/, role);
    }
  });

  test("owner can add and remove a service and an inventory item", async () => {
    const owner = await as("owner");
    const svc = await owner.rpc("add_service", {
      p_name: "Security test service",
      p_price: 1,
      p_duration_minutes: 1,
    });
    assert.equal(svc.ok, true, svc.message);
    const svcDel = await owner.remove(`services?id=eq.${svc.data}`);
    assert.equal(svcDel.data.length, 1, "service not cleaned up");

    const inv = await owner.rpc("add_inventory_item", {
      p_item_name: "Security test item",
      p_quantity: 1,
      p_unit: "unit",
      p_reorder_level: 0,
    });
    assert.equal(inv.ok, true, inv.message);
    const invDel = await owner.remove(`inventory_items?id=eq.${inv.data}`);
    assert.equal(invDel.data.length, 1, "inventory item not cleaned up");
  });
});
