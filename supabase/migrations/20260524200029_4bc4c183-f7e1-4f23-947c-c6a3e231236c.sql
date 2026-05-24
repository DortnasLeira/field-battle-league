-- Allow anonymous visitors to read teams and public user profiles
DROP POLICY IF EXISTS "Times visíveis a autenticados" ON public.teams;
CREATE POLICY "teams_public_read" ON public.teams
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Perfis visíveis a autenticados" ON public.user_profiles;
CREATE POLICY "user_profiles_public_read" ON public.user_profiles
  FOR SELECT TO anon, authenticated USING (true);
