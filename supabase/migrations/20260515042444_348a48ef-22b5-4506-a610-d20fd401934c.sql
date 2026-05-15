ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_kind text;

-- business_kind locks a business account to a single sub-profile (field OR referee)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_business_kind_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_business_kind_check
  CHECK (business_kind IS NULL OR business_kind IN ('field','referee'));