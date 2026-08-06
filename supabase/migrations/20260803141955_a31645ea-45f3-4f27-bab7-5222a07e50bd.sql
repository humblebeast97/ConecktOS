CREATE TABLE IF NOT EXISTS public.salons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  latitude double precision,
  longitude double precision,
  geofence_radius_meters integer NOT NULL DEFAULT 50,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO authenticated;
GRANT ALL ON public.salons TO service_role;

ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their salons" ON public.salons;
CREATE POLICY "Owners manage their salons"
  ON public.salons FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'beauty';

UPDATE public.salons SET business_type = 'beauty' WHERE business_type IS NULL OR business_type NOT IN ('beauty','car_wash','tailoring','nightlife','repair');

ALTER TABLE public.salons DROP CONSTRAINT IF EXISTS salons_business_type_check;
ALTER TABLE public.salons
  ADD CONSTRAINT salons_business_type_check
  CHECK (business_type IN ('beauty','car_wash','tailoring','nightlife','repair'));