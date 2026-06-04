ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS gallery text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_gallery_max_10;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_gallery_max_10
  CHECK (gallery IS NULL OR array_length(gallery, 1) IS NULL OR array_length(gallery, 1) <= 10);