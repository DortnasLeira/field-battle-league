-- ===== VENUES =====
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  city text,
  address text,
  phone text,
  bio text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_public_read" ON public.venues
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "venues_insert_business" ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_account_types uat
      WHERE uat.user_id = auth.uid() AND uat.account_type = 'business'
    )
  );

CREATE POLICY "venues_update_owner" ON public.venues
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "venues_delete_owner" ON public.venues
  FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

CREATE TRIGGER venues_touch_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== SUB_FIELDS =====
DO $$ BEGIN
  CREATE TYPE public.sub_field_type AS ENUM ('society', 'areia', 'sintetico', 'salao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sub_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  field_type public.sub_field_type NOT NULL,
  price_per_hour numeric(10,2) NOT NULL DEFAULT 0,
  available_days text[] NOT NULL DEFAULT '{}',
  available_times text[] NOT NULL DEFAULT '{}',
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sub_fields_venue_idx ON public.sub_fields(venue_id);

ALTER TABLE public.sub_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_fields_public_read" ON public.sub_fields
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "sub_fields_insert_owner" ON public.sub_fields
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = venue_id AND v.owner_user_id = auth.uid()
  ));

CREATE POLICY "sub_fields_update_owner" ON public.sub_fields
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = venue_id AND v.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = venue_id AND v.owner_user_id = auth.uid()
  ));

CREATE POLICY "sub_fields_delete_owner" ON public.sub_fields
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = venue_id AND v.owner_user_id = auth.uid()
  ));

CREATE TRIGGER sub_fields_touch_updated_at
  BEFORE UPDATE ON public.sub_fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== STORAGE BUCKET =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('venues', 'venues', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "venues_storage_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'venues');

CREATE POLICY "venues_storage_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'venues' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "venues_storage_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'venues' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "venues_storage_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'venues' AND auth.uid()::text = (storage.foldername(name))[1]);