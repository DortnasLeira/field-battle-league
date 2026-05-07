-- Tabela de inscrições (candidaturas) para vagas de posição
CREATE TYPE public.opening_application_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE public.opening_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opening_id UUID NOT NULL,
  team_id UUID NOT NULL,
  player_user_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  player_nickname TEXT,
  player_age INTEGER,
  player_phone TEXT NOT NULL,
  experience TEXT,
  message TEXT,
  status public.opening_application_status NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_opening_applications_opening ON public.opening_applications(opening_id);
CREATE INDEX idx_opening_applications_team ON public.opening_applications(team_id);
CREATE INDEX idx_opening_applications_player ON public.opening_applications(player_user_id);
-- Garante uma única inscrição ativa por jogador por vaga
CREATE UNIQUE INDEX uniq_opening_applications_player_opening
  ON public.opening_applications(opening_id, player_user_id);

ALTER TABLE public.opening_applications ENABLE ROW LEVEL SECURITY;

-- SELECT: o próprio jogador OU membros do time dono da vaga
CREATE POLICY "applications_select_player_or_team_member"
ON public.opening_applications
FOR SELECT
TO authenticated
USING (
  player_user_id = auth.uid()
  OR public.is_team_member(auth.uid(), team_id)
);

-- INSERT: apenas perfis 'player', candidatando-se em nome próprio
CREATE POLICY "applications_insert_player_self"
ON public.opening_applications
FOR INSERT
TO authenticated
WITH CHECK (
  player_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid() AND up.type = 'player'::profile_type
  )
);

-- UPDATE: o jogador pode cancelar/atualizar a própria inscrição;
-- membros do time podem alterar status (aceitar/recusar)
CREATE POLICY "applications_update_player_or_team_member"
ON public.opening_applications
FOR UPDATE
TO authenticated
USING (
  player_user_id = auth.uid()
  OR public.is_team_member(auth.uid(), team_id)
)
WITH CHECK (
  player_user_id = auth.uid()
  OR public.is_team_member(auth.uid(), team_id)
);

-- DELETE: somente o próprio jogador remove a inscrição
CREATE POLICY "applications_delete_player_self"
ON public.opening_applications
FOR DELETE
TO authenticated
USING (player_user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER opening_applications_touch_updated_at
BEFORE UPDATE ON public.opening_applications
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();