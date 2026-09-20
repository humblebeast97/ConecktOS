import { useMemo } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { requireSupabase } from "@/lib/supabase";
import { queryKeys } from "./queries";
import type { CreateTicketInput } from "@/lib/store";
import type {
  Business,
  ExpenseCategory,
  InventoryItem,
  Profile,
  Service,
  Ticket,
} from "@/lib/groompulse";

/**
 * Supabase mutation layer. Money and attendance writes go through the SECURITY
 * INVOKER RPCs (create_ticket, clock_in, add_expense, void_expense, ...) so the
 * server owns commission/geofence/void rules; the rest are RLS-scoped table
 * writes. Every write invalidates the affected React Query caches so the
 * Supabase-backed reads refresh.
 *
 * Signatures mirror the mock store so `src/api` can swap between them per
 * VITE_DATA_SOURCE without changing any caller. Return values are synthesized
 * where the mock returned a row, because no caller consumes them in Supabase
 * mode (verified: only join.tsx uses addStaff's return, and it is guarded off).
 */

async function call<T = unknown>(
  p: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

function useFire(qc: QueryClient) {
  return function fire(
    keys: readonly (readonly unknown[])[],
    work: () => Promise<unknown>,
    errMsg: string,
  ) {
    work()
      .then(() => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey })))
      .catch((e: unknown) =>
        toast.error(errMsg, { description: e instanceof Error ? e.message : String(e) }),
      );
  };
}

const ALL_KEYS = Object.values(queryKeys);

export function useSupabaseMutations() {
  const qc = useQueryClient();
  const fire = useFire(qc);

  return useMemo(
    () => ({
      createTicket: (input: CreateTicketInput): Ticket => {
        fire(
          [queryKeys.tickets, queryKeys.ticketItems, queryKeys.inventory, queryKeys.usage],
          () =>
            call(
              requireSupabase().rpc("create_ticket", {
                p_client_name: input.client_name,
                p_client_phone: input.client_phone,
                p_payment_method: input.payment_method,
                p_status: input.status,
                p_lines: input.lines,
                p_usage: input.usage,
              }),
            ),
          "Could not save the ticket",
        );
        return {
          id: "",
          business_id: "",
          client_name: input.client_name,
          client_phone: input.client_phone,
          total_amount: 0,
          payment_method: input.payment_method,
          status: input.status,
          reference: null,
          created_by: input.created_by,
          created_at: new Date().toISOString(),
        };
      },

      markPaid: (ticketId: string, reference?: string): void => {
        fire(
          [queryKeys.tickets],
          () =>
            call(
              requireSupabase()
                .from("tickets")
                .update({ status: "paid", ...(reference ? { reference } : {}) })
                .eq("id", ticketId),
            ),
          "Could not mark the ticket paid",
        );
      },

      clockIn: (staffId: string, coords: { lat: number; lng: number } | null) => {
        fire(
          [queryKeys.attendance],
          () =>
            call(
              requireSupabase().rpc("clock_in", {
                p_staff_id: staffId,
                p_lat: coords?.lat ?? null,
                p_lng: coords?.lng ?? null,
              }),
            ),
          "Could not clock in",
        );
        // Callers act on their own client-side geofence check; return is unused.
        return { withinGeofence: coords !== null, distance: null as number | null };
      },

      clockOut: (staffId: string): void => {
        fire(
          [queryKeys.attendance],
          () =>
            call(
              requireSupabase()
                .from("attendance")
                .update({ clock_out_time: new Date().toISOString() })
                .eq("staff_id", staffId)
                .is("clock_out_time", null),
            ),
          "Could not clock out",
        );
      },

      addExpense: (input: {
        category: ExpenseCategory;
        amount: number;
        generator_hours_run: number | null;
        notes: string;
      }): void => {
        fire(
          [queryKeys.expenses],
          () =>
            call(
              requireSupabase().rpc("add_expense", {
                p_category: input.category,
                p_amount: input.amount,
                p_generator_hours_run: input.generator_hours_run,
                p_notes: input.notes,
              }),
            ),
          "Could not add the expense",
        );
      },

      voidExpense: (expenseId: string, reason?: string): void => {
        fire(
          [queryKeys.expenses],
          () =>
            call(
              requireSupabase().rpc("void_expense", {
                p_expense_id: expenseId,
                p_reason: reason ?? null,
              }),
            ),
          "Could not void the expense",
        );
      },

      addInventoryStock: (inventoryId: string, delta: number): void => {
        fire(
          [queryKeys.inventory],
          async () => {
            const row = await call<{ quantity: number }>(
              requireSupabase()
                .from("inventory_items")
                .select("quantity")
                .eq("id", inventoryId)
                .single(),
            );
            await call(
              requireSupabase()
                .from("inventory_items")
                .update({ quantity: Math.max(0, row.quantity + delta) })
                .eq("id", inventoryId),
            );
          },
          "Could not update stock",
        );
      },

      addInventoryItem: (input: {
        item_name: string;
        quantity: number;
        unit: string;
        reorder_level: number;
      }): void => {
        fire(
          [queryKeys.inventory],
          () =>
            call(
              requireSupabase().rpc("add_inventory_item", {
                p_item_name: input.item_name,
                p_quantity: input.quantity,
                p_unit: input.unit,
                p_reorder_level: input.reorder_level,
              }),
            ),
          "Could not add the item",
        );
      },

      updateInventoryItem: (
        inventoryId: string,
        patch: Partial<Pick<InventoryItem, "item_name" | "quantity" | "unit" | "reorder_level">>,
      ): void => {
        fire(
          [queryKeys.inventory],
          () => call(requireSupabase().from("inventory_items").update(patch).eq("id", inventoryId)),
          "Could not update the item",
        );
      },

      removeInventoryItem: (inventoryId: string): void => {
        fire(
          [queryKeys.inventory],
          () => call(requireSupabase().from("inventory_items").delete().eq("id", inventoryId)),
          "Could not remove the item",
        );
      },

      addService: (input: { name: string; price: number; duration_minutes: number }): Service => {
        fire(
          [queryKeys.services],
          () =>
            call(
              requireSupabase().rpc("add_service", {
                p_name: input.name,
                p_price: input.price,
                p_duration_minutes: input.duration_minutes,
              }),
            ),
          "Could not add the service",
        );
        return {
          id: "",
          business_id: "",
          name: input.name,
          price: input.price,
          duration_minutes: input.duration_minutes,
          suggested_inventory: [],
        };
      },

      updateService: (
        serviceId: string,
        patch: Partial<Pick<Service, "name" | "price" | "duration_minutes">>,
      ): void => {
        fire(
          [queryKeys.services],
          () => call(requireSupabase().from("services").update(patch).eq("id", serviceId)),
          "Could not update the service",
        );
      },

      removeService: (serviceId: string): void => {
        fire(
          [queryKeys.services],
          () => call(requireSupabase().from("services").delete().eq("id", serviceId)),
          "Could not remove the service",
        );
      },

      addStaff: (): Profile => {
        // Staff need an auth user, which comes from the invite/sign-up flow
        // (a later slice). Callers that could reach this in Supabase mode are
        // guarded; this keeps the type and fails loudly if one is missed.
        toast.error("Add staff via invites", {
          description: "Inviting staff lands with the invites step.",
        });
        throw new Error("addStaff is not available in Supabase mode yet.");
      },

      updateProfile: (
        profileId: string,
        patch: Partial<
          Pick<
            Profile,
            | "full_name"
            | "avatar_url"
            | "job_title"
            | "commission_rate"
            | "base_salary"
            | "salary_payday"
            | "salary_last_paid_at"
            | "bank_name"
            | "account_number"
            | "account_name"
          >
        >,
      ): void => {
        fire(
          [queryKeys.profiles],
          () => call(requireSupabase().from("profiles").update(patch).eq("id", profileId)),
          "Could not update the profile",
        );
      },

      removeProfile: (profileId: string): void => {
        fire(
          [queryKeys.profiles],
          () => call(requireSupabase().from("profiles").delete().eq("id", profileId)),
          "Could not remove the profile",
        );
      },

      updateBusiness: (patch: Partial<Business>): void => {
        fire(
          [queryKeys.business],
          async () => {
            const bid = await call<string>(requireSupabase().rpc("current_business_id"));
            await call(requireSupabase().from("businesses").update(patch).eq("id", bid));
          },
          "Could not update the business",
        );
      },

      resetAll: (): void => {
        fire(ALL_KEYS, () => call(requireSupabase().rpc("reset_business_data")), "Could not reset");
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc],
  );
}
