import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const businessTypes = ["beauty", "car_wash", "tailoring", "nightlife", "repair"] as const;
type BusinessTypeValue = (typeof businessTypes)[number];

interface SaveSalonInput {
  name: string;
  business_type: BusinessTypeValue;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
}

/**
 * Saves the owner's business profile (including the selected business_type)
 * to the salons table. Requires a signed-in owner; RLS scopes the row.
 */
export const saveSalonProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveSalonInput) => {
    if (!input.name?.trim()) throw new Error("Business name is required");
    if (!businessTypes.includes(input.business_type)) {
      throw new Error("Business category is required");
    }
    return {
      name: input.name.trim(),
      business_type: input.business_type,
      latitude: input.latitude,
      longitude: input.longitude,
      geofence_radius_meters: Math.max(10, Math.round(input.geofence_radius_meters || 50)),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("salons")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from("salons")
        .update(data)
        .eq("id", existing.id)
        .select("id, name, business_type, latitude, longitude, geofence_radius_meters")
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabase
      .from("salons")
      .insert({ ...data, owner_id: userId })
      .select("id, name, business_type, latitude, longitude, geofence_radius_meters")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

/**
 * Reads the signed-in owner's salon profile (including business_type) so the UI
 * can load the matching industry label dictionary.
 */
export const getMySalonProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("salons")
      .select("id, name, business_type, latitude, longitude, geofence_radius_meters")
      .eq("owner_id", context.userId)
      .limit(1)
      .maybeSingle();
    return data;
  });
