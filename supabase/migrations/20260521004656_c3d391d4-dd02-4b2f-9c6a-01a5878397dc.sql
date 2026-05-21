
-- 1) Restrict profiles SELECT to authenticated (no anon read of emails)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_auth_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) Fix team_members insert policy bug (self-join always true)
DROP POLICY IF EXISTS "Dono gerencia membros - insert" ON public.team_members;
CREATE POLICY "Dono gerencia membros - insert"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_owner(auth.uid(), team_id)
    OR (
      role = 'owner'::team_role
      AND user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_members.team_id
      )
    )
  );

-- 3) Remove anonymous access to venues.phone (still readable by authenticated)
REVOKE SELECT (phone) ON public.venues FROM anon;

-- 4) Lock down SECURITY DEFINER helpers from direct execution by clients.
--    These are used internally by triggers and RLS; revoke EXECUTE from
--    anon and authenticated so they cannot be called via PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.team_admin_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_admin_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_team_verified() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_pending_bookings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_payout_on_signature() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_team_elo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_team_pro(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.referees_protect_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_account_types_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_account_type() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_sub_field_slot_available(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_account(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_referee_score() FROM PUBLIC, anon, authenticated;

-- Keep reserve_sub_field_slot callable by authenticated users (used as RPC by the app).
GRANT EXECUTE ON FUNCTION public.reserve_sub_field_slot(uuid, timestamptz, integer, uuid) TO authenticated;
