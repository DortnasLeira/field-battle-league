-- Referee hire requests
CREATE TABLE public.referee_hires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_id text NOT NULL,
  referee_name text NOT NULL,
  requester_user_id uuid NOT NULL,
  requester_profile_type text NOT NULL CHECK (requester_profile_type IN ('team','field')),
  requester_name text,
  hire_date date NOT NULL,
  hire_time text NOT NULL,
  price numeric,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referee_hires ENABLE ROW LEVEL SECURITY;

-- Only authenticated team/field profile owners can create
CREATE POLICY "referee_hires_insert_team_or_field"
ON public.referee_hires FOR INSERT TO authenticated
WITH CHECK (
  requester_user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = (select auth.uid())
      AND up.type::text = referee_hires.requester_profile_type
  )
);

-- Requester can view their own hires
CREATE POLICY "referee_hires_select_requester"
ON public.referee_hires FOR SELECT TO authenticated
USING (requester_user_id = (select auth.uid()));

-- Requester can update (cancel/confirm) their own hires
CREATE POLICY "referee_hires_update_requester"
ON public.referee_hires FOR UPDATE TO authenticated
USING (requester_user_id = (select auth.uid()))
WITH CHECK (requester_user_id = (select auth.uid()));

CREATE INDEX idx_referee_hires_requester ON public.referee_hires(requester_user_id);
CREATE INDEX idx_referee_hires_referee ON public.referee_hires(referee_id);

CREATE TRIGGER referee_hires_touch_updated_at
BEFORE UPDATE ON public.referee_hires
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();