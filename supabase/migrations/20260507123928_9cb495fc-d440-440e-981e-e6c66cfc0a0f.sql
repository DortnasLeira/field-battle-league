
-- Enum para papel no time
DO $$ BEGIN
  CREATE TYPE public.team_role AS ENUM ('owner', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- TEAMS
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  captain TEXT,
  shield TEXT,
  founded INTEGER,
  color TEXT DEFAULT '#F59E0B',
  bio TEXT,
  preferred_days TEXT[],
  preferred_times TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- TEAM MEMBERS
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.team_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE UNIQUE INDEX team_members_one_owner_idx
  ON public.team_members(team_id) WHERE role = 'owner';
CREATE INDEX team_members_user_idx ON public.team_members(user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of a team (any role)
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_user_id UUID, _team_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.team_admin_count(_team_id UUID)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.team_members
  WHERE team_id = _team_id AND role = 'admin';
$$;

-- Trigger: enforce max 5 admins per team
CREATE OR REPLACE FUNCTION public.enforce_admin_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM public.team_members
        WHERE team_id = NEW.team_id AND role = 'admin'
          AND id <> COALESCE(NEW.id, gen_random_uuid())) >= 5 THEN
      RAISE EXCEPTION 'Time já possui 5 administradores';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER team_members_admin_limit
  BEFORE INSERT OR UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_limit();

CREATE TRIGGER teams_touch_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: teams
CREATE POLICY "Times visíveis a autenticados"
  ON public.teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Membros podem editar time"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid(), id));

CREATE POLICY "Autenticados podem criar times"
  ON public.teams FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Dono pode remover time"
  ON public.teams FOR DELETE TO authenticated
  USING (public.is_team_owner(auth.uid(), id));

-- RLS: team_members
CREATE POLICY "Membros visíveis a autenticados"
  ON public.team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Dono gerencia membros - insert"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_owner(auth.uid(), team_id)
    OR (
      role = 'owner'
      AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_members.team_id)
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Dono gerencia membros - update"
  ON public.team_members FOR UPDATE TO authenticated
  USING (public.is_team_owner(auth.uid(), team_id));

CREATE POLICY "Dono gerencia membros - delete"
  ON public.team_members FOR DELETE TO authenticated
  USING (public.is_team_owner(auth.uid(), team_id) OR user_id = auth.uid());

-- MATCHES
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  location TEXT,
  league_id TEXT,
  challenge_id TEXT,
  reported_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('scheduled','completed','cancelled'))
);

CREATE INDEX matches_home_idx ON public.matches(home_team_id);
CREATE INDEX matches_away_idx ON public.matches(away_team_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER matches_touch_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Partidas visíveis a autenticados"
  ON public.matches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Membros dos times podem criar partida"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (
    (home_team_id IS NOT NULL AND public.is_team_member(auth.uid(), home_team_id))
    OR (away_team_id IS NOT NULL AND public.is_team_member(auth.uid(), away_team_id))
  );

CREATE POLICY "Membros dos times podem atualizar partida"
  ON public.matches FOR UPDATE TO authenticated
  USING (
    (home_team_id IS NOT NULL AND public.is_team_member(auth.uid(), home_team_id))
    OR (away_team_id IS NOT NULL AND public.is_team_member(auth.uid(), away_team_id))
  );
