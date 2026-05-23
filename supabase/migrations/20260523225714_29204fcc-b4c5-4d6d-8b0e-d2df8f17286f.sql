
DROP POLICY IF EXISTS applications_update_player_or_team_member ON public.opening_applications;

CREATE POLICY applications_update_player_or_team_admin
ON public.opening_applications
FOR UPDATE
TO authenticated
USING (
  player_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = opening_applications.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  player_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = opening_applications.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);
