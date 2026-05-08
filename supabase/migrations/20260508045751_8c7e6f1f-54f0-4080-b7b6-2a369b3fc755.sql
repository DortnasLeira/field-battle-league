create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete set null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_team_id on public.subscriptions(team_id);
create index idx_subscriptions_stripe_id on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "subs_service_all" on public.subscriptions
  for all using (auth.role() = 'service_role');

create or replace function public.has_active_team_pro(_team_id uuid, _env text default 'sandbox')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where team_id = _team_id
      and environment = _env
      and price_id = 'team_pro_monthly'
      and (
        (status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
$$;

create or replace function public.sync_team_verified()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  active boolean;
begin
  target := coalesce(new.team_id, old.team_id);
  if target is null then return coalesce(new, old); end if;
  active := exists (
    select 1 from public.subscriptions
    where team_id = target
      and price_id = 'team_pro_monthly'
      and (
        (status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
  update public.teams set verified = active where id = target;
  return coalesce(new, old);
end $$;

create trigger trg_sync_team_verified
  after insert or update or delete on public.subscriptions
  for each row execute function public.sync_team_verified();