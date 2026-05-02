ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS preferred_foot text,
  ADD COLUMN IF NOT EXISTS field_types text[];