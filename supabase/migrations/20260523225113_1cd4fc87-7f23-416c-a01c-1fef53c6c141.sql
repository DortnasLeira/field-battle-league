
-- 1) venues.phone: revoke column-level SELECT from anon (authenticated keeps full access)
REVOKE SELECT (phone) ON public.venues FROM anon;

-- 2) opening_applications: tighten SELECT to applicant + team owners/admins only
DROP POLICY IF EXISTS applications_select_player_or_team_member ON public.opening_applications;

CREATE POLICY applications_select_player_or_team_admin
ON public.opening_applications
FOR SELECT
TO authenticated
USING (
  player_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = opening_applications.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);
