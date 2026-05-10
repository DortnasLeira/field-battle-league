-- Link bookings to a specific sub_field (optional, backwards compatible)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS sub_field_id uuid REFERENCES public.sub_fields(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_sub_field_id ON public.bookings(sub_field_id);

-- Allow venue owners to read bookings of their sub_fields
DROP POLICY IF EXISTS bookings_select_sub_field_owner ON public.bookings;
CREATE POLICY bookings_select_sub_field_owner
ON public.bookings
FOR SELECT
TO authenticated
USING (
  sub_field_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sub_fields sf
    JOIN public.venues v ON v.id = sf.venue_id
    WHERE sf.id = bookings.sub_field_id
      AND v.owner_user_id = auth.uid()
  )
);

-- Allow venue owners to update (accept/reject) those bookings
DROP POLICY IF EXISTS bookings_update_sub_field_owner ON public.bookings;
CREATE POLICY bookings_update_sub_field_owner
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  sub_field_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sub_fields sf
    JOIN public.venues v ON v.id = sf.venue_id
    WHERE sf.id = bookings.sub_field_id
      AND v.owner_user_id = auth.uid()
  )
);
