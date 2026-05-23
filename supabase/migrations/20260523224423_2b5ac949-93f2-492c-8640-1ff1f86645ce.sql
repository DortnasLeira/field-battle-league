-- Temporarily disable immutability trigger to migrate existing data
ALTER TABLE public.user_account_types DISABLE TRIGGER user_account_types_no_update;

UPDATE public.user_account_types uat
SET account_type = 'business_referee'
WHERE account_type = 'business'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = uat.user_id AND up.type = 'referee'
  );

UPDATE public.user_account_types
SET account_type = 'business_field'
WHERE account_type = 'business';

ALTER TABLE public.user_account_types ENABLE TRIGGER user_account_types_no_update;

-- Update enforce_profile_account_type
CREATE OR REPLACE FUNCTION public.enforce_profile_account_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  acct public.account_type;
BEGIN
  SELECT account_type INTO acct
    FROM public.user_account_types
   WHERE user_id = NEW.user_id;

  IF acct IS NULL THEN
    RAISE EXCEPTION 'Defina o tipo de conta antes de criar perfis.';
  END IF;

  IF acct = 'business_field' AND NEW.type <> 'field' THEN
    RAISE EXCEPTION 'Conta Business Campo só pode criar perfil de Campo.';
  END IF;

  IF acct = 'business_referee' AND NEW.type <> 'referee' THEN
    RAISE EXCEPTION 'Conta Business Árbitro só pode criar perfil de Árbitro.';
  END IF;

  IF acct = 'sportist' AND NEW.type NOT IN ('player', 'team') THEN
    RAISE EXCEPTION 'Conta Esportista só pode criar perfis de Jogador ou Time.';
  END IF;

  IF acct = 'business' AND NEW.type NOT IN ('field', 'referee') THEN
    RAISE EXCEPTION 'Conta Business não pode criar este tipo de perfil.';
  END IF;

  RETURN NEW;
END;
$function$;

-- is_business_account aceita variantes
CREATE OR REPLACE FUNCTION public.is_business_account(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_account_types
    where user_id = _uid
      and account_type IN ('business', 'business_field', 'business_referee')
  );
$function$;

-- venues_insert_business: aceitar business_field
DROP POLICY IF EXISTS venues_insert_business ON public.venues;
CREATE POLICY venues_insert_business ON public.venues
FOR INSERT TO authenticated
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_account_types uat
    WHERE uat.user_id = auth.uid()
      AND uat.account_type IN ('business_field', 'business')
  )
);