-- Atomic slot reservation with 5-minute pending lock
create or replace function public.reserve_sub_field_slot(
  _sub_field_id uuid,
  _scheduled_at timestamptz,
  _duration_minutes integer default 60,
  _team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_lock_key bigint;
  v_existing_id uuid;
  v_existing_user uuid;
  v_existing_status text;
  v_existing_created timestamptz;
  v_field_id uuid;
  v_booking_id uuid;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '28000';
  end if;

  if _sub_field_id is null or _scheduled_at is null then
    raise exception 'Parâmetros inválidos' using errcode = '22023';
  end if;

  -- Advisory lock evita corrida entre transações concorrentes para o mesmo slot
  v_lock_key := hashtextextended(_sub_field_id::text || '|' || _scheduled_at::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Procura conflito: confirmado OU pendente recente (<5 min)
  select id, requester_user_id, status, created_at
    into v_existing_id, v_existing_user, v_existing_status, v_existing_created
  from public.bookings
  where sub_field_id = _sub_field_id
    and scheduled_at = _scheduled_at
    and (
      status = 'confirmed'
      or (status = 'pending' and created_at > now() - interval '5 minutes')
    )
  order by (status = 'confirmed') desc, created_at desc
  limit 1;

  if v_existing_id is not null then
    -- Idempotência: o mesmo usuário pode reabrir seu próprio bloqueio pendente
    if v_existing_user = v_user and v_existing_status = 'pending' then
      return v_existing_id;
    end if;
    raise exception 'Slot indisponível: já existe uma reserva para este campo neste horário.'
      using errcode = '40001';
  end if;

  -- bookings.field_id é NOT NULL: usa venue_id como fallback (mesmo padrão do checkout)
  select coalesce(venue_id, _sub_field_id) into v_field_id
  from public.sub_fields where id = _sub_field_id;

  if v_field_id is null then
    raise exception 'Campo não encontrado' using errcode = 'P0002';
  end if;

  insert into public.bookings (
    field_id, sub_field_id, requester_user_id, requester_team_id,
    scheduled_at, duration_minutes, status, message
  )
  values (
    v_field_id, _sub_field_id, v_user, _team_id,
    _scheduled_at, coalesce(_duration_minutes, 60),
    'pending', 'Bloqueio temporário (5 min) — aguardando pagamento'
  )
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

revoke all on function public.reserve_sub_field_slot(uuid, timestamptz, integer, uuid) from public;
grant execute on function public.reserve_sub_field_slot(uuid, timestamptz, integer, uuid) to authenticated;

-- Garantia adicional no nível do banco: nunca duas reservas confirmadas no mesmo slot
create unique index if not exists bookings_unique_confirmed_subfield_slot
  on public.bookings (sub_field_id, scheduled_at)
  where status = 'confirmed' and sub_field_id is not null;