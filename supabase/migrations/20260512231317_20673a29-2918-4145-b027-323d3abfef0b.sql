
create or replace function public.is_business_account(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_account_types
    where user_id = _uid and account_type = 'business'
  );
$$;

-- Restrictive policies: block business accounts from sportist-only data
create policy "block_business_matches_select"
  on public.matches
  as restrictive
  for select
  to authenticated
  using (not public.is_business_account(auth.uid()));

create policy "block_business_opening_apps_select"
  on public.opening_applications
  as restrictive
  for select
  to authenticated
  using (not public.is_business_account(auth.uid()));

create policy "block_business_opening_apps_insert"
  on public.opening_applications
  as restrictive
  for insert
  to authenticated
  with check (not public.is_business_account(auth.uid()));

create policy "block_business_challenges_select"
  on public.challenges
  as restrictive
  for select
  to authenticated
  using (not public.is_business_account(auth.uid()));

create policy "block_business_challenges_insert"
  on public.challenges
  as restrictive
  for insert
  to authenticated
  with check (not public.is_business_account(auth.uid()));
