-- 1) Disponibilidade de slot (considera pending recente como ocupado)
create or replace function public.is_sub_field_slot_available(
  _sub_field_id uuid,
  _scheduled_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.bookings
    where sub_field_id = _sub_field_id
      and scheduled_at = _scheduled_at
      and (
        status = 'confirmed'
        or (status = 'pending' and created_at > now() - interval '5 minutes')
      )
  );
$$;

revoke all on function public.is_sub_field_slot_available(uuid, timestamptz) from public;
grant execute on function public.is_sub_field_slot_available(uuid, timestamptz) to anon, authenticated;

-- 2) Limpeza de bloqueios pendentes expirados (>5 min)
create or replace function public.cleanup_expired_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.bookings
  where status = 'pending'
    and created_at < now() - interval '5 minutes';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_expired_pending_bookings() from public;
-- Apenas o agendador (postgres) deve executar; ninguém via API.

-- 3) Índice para acelerar a checagem de disponibilidade
create index if not exists bookings_active_slot_idx
  on public.bookings (sub_field_id, scheduled_at)
  where status in ('pending','confirmed') and sub_field_id is not null;

-- 4) Habilita pg_cron para o agendamento (se ainda não estiver)
create extension if not exists pg_cron;