-- 1. profiles: leitura pública, escrita só pelo dono
DROP POLICY IF EXISTS "Profiles são visíveis a autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza próprio profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuário insere próprio profile" ON public.profiles;

CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- 2. teams: criar requer perfil tipo 'team'; editar só dono
DROP POLICY IF EXISTS "Autenticados podem criar times" ON public.teams;
DROP POLICY IF EXISTS "Membros podem editar time" ON public.teams;

CREATE POLICY "teams_insert_team_profile" ON public.teams
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = (select auth.uid()) AND up.type = 'team')
  );
CREATE POLICY "teams_update_owner" ON public.teams
  FOR UPDATE TO authenticated
  USING (public.is_team_owner((select auth.uid()), id))
  WITH CHECK (public.is_team_owner((select auth.uid()), id));

-- 3. challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  scheduled_at timestamptz,
  location text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON public.challenges(created_by_team_id);
CREATE INDEX IF NOT EXISTS idx_challenges_opponent  ON public.challenges(opponent_team_id);

DROP POLICY IF EXISTS "challenges_select_public_or_member" ON public.challenges;
DROP POLICY IF EXISTS "challenges_insert_team_member" ON public.challenges;
DROP POLICY IF EXISTS "challenges_update_owner_team" ON public.challenges;
DROP POLICY IF EXISTS "challenges_delete_owner_team" ON public.challenges;

CREATE POLICY "challenges_select_public_or_member" ON public.challenges
  FOR SELECT TO authenticated USING (
    visibility = 'public'
    OR public.is_team_member((select auth.uid()), created_by_team_id)
    OR (opponent_team_id IS NOT NULL AND public.is_team_member((select auth.uid()), opponent_team_id))
  );
CREATE POLICY "challenges_insert_team_member" ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member((select auth.uid()), created_by_team_id));
CREATE POLICY "challenges_update_owner_team" ON public.challenges
  FOR UPDATE TO authenticated
  USING (public.is_team_owner((select auth.uid()), created_by_team_id));
CREATE POLICY "challenges_delete_owner_team" ON public.challenges
  FOR DELETE TO authenticated
  USING (public.is_team_owner((select auth.uid()), created_by_team_id));

CREATE TRIGGER challenges_touch_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. fields
CREATE TABLE IF NOT EXISTS public.fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('Society','Areia','Sintético','Campo','Futsal')),
  capacity int,
  price_per_hour numeric,
  address text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fields_owner ON public.fields(owner_user_id);

DROP POLICY IF EXISTS "fields_public_read" ON public.fields;
DROP POLICY IF EXISTS "fields_insert_field_profile" ON public.fields;
DROP POLICY IF EXISTS "fields_update_owner" ON public.fields;
DROP POLICY IF EXISTS "fields_delete_owner" ON public.fields;

CREATE POLICY "fields_public_read" ON public.fields
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "fields_insert_field_profile" ON public.fields
  FOR INSERT TO authenticated WITH CHECK (
    owner_user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.user_profiles up
                WHERE up.user_id = (select auth.uid()) AND up.type = 'field')
  );
CREATE POLICY "fields_update_owner" ON public.fields
  FOR UPDATE TO authenticated
  USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()));
CREATE POLICY "fields_delete_owner" ON public.fields
  FOR DELETE TO authenticated USING (owner_user_id = (select auth.uid()));

CREATE TRIGGER fields_touch_updated_at
  BEFORE UPDATE ON public.fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL,
  requester_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bookings_field     ON public.bookings(field_id);
CREATE INDEX IF NOT EXISTS idx_bookings_requester ON public.bookings(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_team      ON public.bookings(requester_team_id);

DROP POLICY IF EXISTS "bookings_select_field_owner_or_requester" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_authenticated" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_field_owner" ON public.bookings;

CREATE POLICY "bookings_select_field_owner_or_requester" ON public.bookings
  FOR SELECT TO authenticated USING (
    requester_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.fields f
               WHERE f.id = field_id AND f.owner_user_id = (select auth.uid()))
    OR (requester_team_id IS NOT NULL AND public.is_team_member((select auth.uid()), requester_team_id))
  );
CREATE POLICY "bookings_insert_authenticated" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = (select auth.uid()));
CREATE POLICY "bookings_update_field_owner" ON public.bookings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.fields f
            WHERE f.id = field_id AND f.owner_user_id = (select auth.uid()))
    OR requester_user_id = (select auth.uid())
  );

CREATE TRIGGER bookings_touch_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. índices em FKs usadas em policies já existentes
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON public.team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team      ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_home ON public.matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away ON public.matches(away_team_id);