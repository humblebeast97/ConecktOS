// Regression tests for the earlier access fixes: invites, attendance, payout
// privacy and business settings (migrations 20260923120000 to 20260924150000).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { as, blocked } from "./helpers.mjs";

const NO_SUCH_ID = "00000000-0000-0000-0000-000000000000";

describe("invites", () => {
  test("staff cannot read invites", async () => {
    const res = await (await as("staff")).select("invites?select=code");
    assert.equal(res.data.length, 0);
  });

  test("staff cannot insert an invite directly (no self-made owner invites)", async () => {
    const staff = await as("staff");
    const bid = (await staff.select("profiles_secure?select=business_id&limit=1")).data[0]
      .business_id;
    const res = await staff.insert("invites", {
      business_id: bid,
      code: "SECTEST1",
      role: "owner",
    });
    assert.equal(res.ok, false);
  });

  test("no invite can carry the owner role, even from the owner", async () => {
    const owner = await as("owner");
    const bid = (await owner.select("businesses?select=id")).data[0].id;
    const res = await owner.insert("invites", {
      business_id: bid,
      code: "SECTEST2",
      role: "owner",
    });
    assert.equal(res.ok, false);
    assert.match(res.message ?? "", /invites_role_not_owner|Staff limit/);
  });

  test("staff cannot create invites through the function", async () => {
    const res = await (
      await as("staff")
    ).rpc("create_invite", {
      p_role: "staff",
      p_commission_rate: 0.5,
      p_email: null,
    });
    assert.match(res.message ?? "", /Only owners and managers can invite/);
  });
});

describe("attendance", () => {
  test("staff cannot clock in as a colleague", async () => {
    const owner = await as("owner");
    const staff = await as("staff");
    const colleague = (
      await owner.select(`profiles_secure?select=id&role=eq.staff&id=neq.${staff.userId}&limit=1`)
    ).data[0];
    const res = await staff.rpc("clock_in", {
      p_staff_id: colleague?.id ?? NO_SUCH_ID,
      p_lat: null,
      p_lng: null,
    });
    assert.match(res.message ?? "", /only clock in as yourself/);
  });

  test("clock in, no stacking, clock out; record is tamper-proof", async () => {
    const staff = await as("staff");
    const owner = await as("owner");
    const open = await staff.select(
      `attendance?select=id&staff_id=eq.${staff.userId}&clock_out_time=is.null`,
    );
    assert.equal(open.data.length, 0, "test.staff already has an open shift; clock out first");

    const first = await staff.rpc("clock_in", {
      p_staff_id: staff.userId,
      p_lat: null,
      p_lng: null,
    });
    assert.equal(first.ok, true, first.message);
    const id = first.data.id;
    try {
      assert.equal(first.data.is_within_geofence, false, "no location must be off-site");

      const second = await staff.rpc("clock_in", {
        p_staff_id: staff.userId,
        p_lat: null,
        p_lng: null,
      });
      assert.match(second.message ?? "", /already clocked in/);

      const flip = await staff.update(`attendance?id=eq.${id}`, { is_within_geofence: true });
      assert.ok(blocked(flip), "staff turned an off-site record on-site");

      const del = await staff.remove(`attendance?id=eq.${id}`);
      assert.ok(blocked(del), "staff deleted an attendance record");

      const out = await staff.update(`attendance?id=eq.${id}`, {
        clock_out_time: new Date().toISOString(),
      });
      assert.equal(out.data.length, 1, "staff could not clock out");
    } finally {
      await owner.remove(`attendance?id=eq.${id}`);
    }
  });

  test("staff cannot create attendance directly", async () => {
    const staff = await as("staff");
    const res = await staff.insert("attendance", {
      business_id: NO_SUCH_ID,
      staff_id: staff.userId,
      is_within_geofence: true,
    });
    assert.equal(res.ok, false);
  });
});

describe("payout privacy", () => {
  test("nobody reads payout columns off the base profiles table", async () => {
    const res = await (await as("owner")).select("profiles?select=account_number");
    assert.equal(res.ok, false);
  });

  test("staff and front desk see peers' payout fields as null", async () => {
    for (const role of ["staff", "receptionist"]) {
      const client = await as(role);
      const rows = (await client.select("profiles_secure?select=id,account_number,base_salary"))
        .data;
      const peers = rows.filter((r) => r.id !== client.userId);
      assert.ok(peers.length > 0, `${role}: expected to see teammates`);
      assert.ok(
        peers.every((r) => r.account_number === null && r.base_salary === null),
        `${role} can see a colleague's payout details`,
      );
    }
  });
});

describe("business settings", () => {
  test("staff and front desk cannot change business settings", async () => {
    for (const role of ["staff", "receptionist"]) {
      const client = await as(role);
      const biz = (await client.select("businesses?select=id,geofence_radius_meters")).data[0];
      const res = await client.update(`businesses?id=eq.${biz.id}`, {
        geofence_radius_meters: biz.geofence_radius_meters,
      });
      assert.ok(blocked(res), `${role} changed business settings`);
    }
  });

  test("owner and manager can change settings (no-op write)", async () => {
    for (const role of ["owner", "manager"]) {
      const client = await as(role);
      const biz = (await client.select("businesses?select=id,geofence_radius_meters")).data[0];
      const res = await client.update(`businesses?id=eq.${biz.id}`, {
        geofence_radius_meters: biz.geofence_radius_meters,
      });
      assert.equal(res.data?.length, 1, `${role}: ${res.message}`);
    }
  });

  test("nobody can reassign the business owner", async () => {
    const manager = await as("manager");
    const biz = (await manager.select("businesses?select=id")).data[0];
    const res = await manager.update(`businesses?id=eq.${biz.id}`, { owner_id: manager.userId });
    assert.equal(res.ok, false);
  });
});
