-- Enum para o tipo de conta
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('sportist', 'business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela com a escolha permanente
CREATE TABLE IF NOT EXISTS public.user_account_types (
  user_id uuid PRIMARY KEY,
  account_type public.account_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_account_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uat_select_own" ON public.user_account_types;
CREATE POLICY "uat_select_own" ON public.user_account_types
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "uat_insert_own" ON public.user_account_types;
CREATE POLICY "uat_insert_own" ON public.user_account_types
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Sem políticas de UPDATE/DELETE: a escolha é permanente.

-- Trigger de defesa em profundidade: bloqueia qualquer UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.user_account_types_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'O tipo de conta é permanente e não pode ser alterado nem removido.';
END;
$$;

DROP TRIGGER IF EXISTS user_account_types_no_update ON public.user_account_types;
CREATE TRIGGER user_account_types_no_update
  BEFORE UPDATE ON public.user_account_types
  FOR EACH ROW EXECUTE FUNCTION public.user_account_types_immutable();

DROP TRIGGER IF EXISTS user_account_types_no_delete ON public.user_account_types;
CREATE TRIGGER user_account_types_no_delete
  BEFORE DELETE ON public.user_account_types
  FOR EACH ROW EXECUTE FUNCTION public.user_account_types_immutable();

-- Trava: profile_type deve ser compatível com o account_type do usuário
CREATE OR REPLACE FUNCTION public.enforce_profile_account_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct public.account_type;
BEGIN
  SELECT account_type INTO acct
    FROM public.user_account_types
   WHERE user_id = NEW.user_id;

  IF acct IS NULL THEN
    RAISE EXCEPTION 'Defina o tipo de conta (Esportista ou Business) antes de criar perfis.';
  END IF;

  IF acct = 'business' AND NEW.type <> 'field' THEN
    RAISE EXCEPTION 'Conta Business só pode criar perfil de Campo.';
  END IF;

  IF acct = 'sportist' AND NEW.type = 'field' THEN
    RAISE EXCEPTION 'Conta Esportista não pode criar perfil de Campo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_account_type_trg ON public.user_profiles;
CREATE TRIGGER enforce_profile_account_type_trg
  BEFORE INSERT OR UPDATE OF type ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_account_type();