CREATE TYPE public.team_membership_status AS ENUM (
  'pending_team_approval',
  'pending_player_approval',
  'active',
  'rejected'
);

CREATE TABLE public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status public.team_membership_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, player_id)
);

CREATE INDEX team_memberships_team_idx ON public.team_memberships(team_id);
CREATE INDEX team_memberships_player_idx ON public.team_memberships(player_id);

ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER team_memberships_touch_updated_at
  BEFORE UPDATE ON public.team_memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_player_request_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending_team_approval' THEN
    IF (SELECT COUNT(*) FROM public.team_memberships
        WHERE player_id = NEW.player_id AND status = 'pending_team_approval'
          AND id <> COALESCE(NEW.id, gen_random_uuid())) >= 3 THEN
      RAISE EXCEPTION 'Um jogador só pode ter no máximo 3 solicitações pendentes para times simultaneamente.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER player_request_limit
  BEFORE INSERT OR UPDATE ON public.team_memberships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_request_limit();

CREATE POLICY "Memberships visíveis a todos autenticados"
  ON public.team_memberships FOR SELECT TO authenticated USING (true);

CREATE POLICY "Criar memberships"
  ON public.team_memberships FOR INSERT TO authenticated
  WITH CHECK (
    (status = 'pending_team_approval' AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = player_id AND user_id = auth.uid()))
    OR
    (status = 'pending_player_approval' AND public.is_team_member(auth.uid(), team_id))
  );

CREATE POLICY "Atualizar memberships"
  ON public.team_memberships FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = player_id AND user_id = auth.uid())
    OR
    public.is_team_member(auth.uid(), team_id)
  );

CREATE POLICY "Deletar memberships"
  ON public.team_memberships FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = player_id AND user_id = auth.uid())
    OR
    public.is_team_owner(auth.uid(), team_id)
  );
