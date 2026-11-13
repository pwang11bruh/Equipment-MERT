-- =============================================================================
-- MERT Equipment Portal — Business logic
-- -----------------------------------------------------------------------------
-- Storage model (ADR-008):
--   equipment_room  accessible pool; members restock bags from here. Must only
--                   hold the earliest-expiring batch(es) (FEFO invariant).
--   backstock       locked reserve; only the Equipment Officer (admin) moves
--                   the next batch into the equipment room.
--
--   * Read models (views): stock per item, lot FEFO ranking, FEFO violations,
--     next backstock batch per item, monthly usage / spend analytics.
--   * Lot primitives (_add_to_lot, _lot_move) — the ONLY code that writes
--     inventory_lots, so every change is mirrored in inventory_movements.
--   * process_submission() — a member takes items from the equipment room.
--   * Admin RPCs (admin_*) — receive, transfer (FEFO-enforced), status,
--     dispose, adjust, FEFO rebalance, PIN management.
--   * Alerts engine (_refresh_alerts / refresh_alerts).
-- All functions use `set search_path = ''` and fully-qualified names.
-- See docs/database/BUSINESS_LOGIC.md for the reasoning behind each rule.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auth helper
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

create or replace function public._assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read models
-- ---------------------------------------------------------------------------

-- One row per lot (qty > 0) with expiry state and FEFO rank (1 = use first).
-- fefo_rank is only set for usable lots (functional, not expired) and is
-- computed across BOTH locations, so the room should always hold rank 1..n.
create or replace view public.v_lots
with (security_invoker = true) as
with s as (select expiration_warning_days as warn from public.app_settings where id = 1)
select
  l.id,
  l.item_id,
  i.name as item_name,
  i.unit,
  l.location,
  l.status,
  l.quantity,
  l.expiration_date,
  l.lot_number,
  l.received_on,
  l.unit_cost,
  l.notes,
  l.created_at,
  l.updated_at,
  case when l.expiration_date is null then null else l.expiration_date - current_date end as days_to_expiration,
  case
    when l.expiration_date is null then 'no_expiry'
    when l.expiration_date < current_date then 'expired'
    when l.expiration_date <= current_date + s.warn then 'expiring_soon'
    else 'ok'
  end as expiry_state,
  case
    when l.status = 'functional'
         and (l.expiration_date is null or l.expiration_date >= current_date)
    then row_number() over (
      partition by l.item_id,
                   (l.status = 'functional' and (l.expiration_date is null or l.expiration_date >= current_date))
      order by l.expiration_date asc nulls last, l.received_on, l.created_at, l.id
    )
  end as fefo_rank
from public.inventory_lots l
join public.items i on i.id = l.item_id
cross join s
where l.quantity > 0;

-- The next usable backstock batch per item (what the Equipment Officer should
-- move into the equipment room next). A "batch" = all usable backstock units
-- sharing the earliest expiration date.
create or replace view public.v_next_backstock_batch
with (security_invoker = true) as
select distinct on (l.item_id)
  l.item_id,
  l.id as lot_id,
  l.expiration_date,
  sum(l.quantity) over (partition by l.item_id, l.expiration_date)::int as batch_qty
from public.inventory_lots l
where l.location = 'backstock' and l.status = 'functional' and l.quantity > 0
  and (l.expiration_date is null or l.expiration_date >= current_date)
order by l.item_id, l.expiration_date asc nulls last, l.received_on, l.created_at, l.id;

-- One row per catalog item with on-hand totals.
-- room_qty / backstock_qty count only USABLE units (functional, not expired).
create or replace view public.v_item_stock
with (security_invoker = true) as
with s as (select expiration_warning_days as warn from public.app_settings where id = 1)
select
  i.id as item_id,
  i.name,
  i.category_id,
  c.name as category_name,
  c.sort_order as category_sort_order,
  i.unit,
  i.is_equipment,
  i.tracks_expiration,
  i.is_archived,
  i.room_par_qty,
  i.min_backstock_qty,
  i.unit_cost,
  coalesce(sum(l.quantity) filter (
    where l.location = 'equipment_room' and l.status = 'functional'
      and (l.expiration_date is null or l.expiration_date >= current_date)), 0)::int as room_qty,
  coalesce(sum(l.quantity) filter (
    where l.location = 'backstock' and l.status = 'functional'
      and (l.expiration_date is null or l.expiration_date >= current_date)), 0)::int as backstock_qty,
  coalesce(sum(l.quantity) filter (
    where l.status = 'functional' and l.expiration_date < current_date), 0)::int as expired_qty,
  coalesce(sum(l.quantity) filter (
    where l.status = 'functional' and l.expiration_date >= current_date
      and l.expiration_date <= current_date + s.warn), 0)::int as expiring_soon_qty,
  coalesce(sum(l.quantity) filter (where l.status = 'out_of_service'), 0)::int as out_of_service_qty,
  min(l.expiration_date) filter (
    where l.location = 'equipment_room' and l.status = 'functional' and l.expiration_date >= current_date) as next_room_expiration,
  min(l.expiration_date) filter (
    where l.location = 'backstock' and l.status = 'functional' and l.expiration_date >= current_date) as next_backstock_expiration
from public.items i
cross join s
left join public.item_categories c on c.id = i.category_id
left join public.inventory_lots l on l.item_id = i.id and l.quantity > 0
group by i.id, c.name, c.sort_order;

-- FEFO violations: a usable backstock lot expires EARLIER than a usable
-- equipment-room lot of the same item (e.g. stock with an earlier date was
-- received into backstock). Fix: physically swap, then admin_fefo_rebalance().
create or replace view public.v_fefo_violations
with (security_invoker = true) as
select
  r.item_id,
  i.name as item_name,
  r.id as room_lot_id,
  r.expiration_date as room_expiration,
  r.quantity as room_quantity,
  b.id as backstock_lot_id,
  b.expiration_date as backstock_expiration,
  b.quantity as backstock_quantity
from public.inventory_lots r
join public.inventory_lots b
  on b.item_id = r.item_id
 and b.location = 'backstock' and b.status = 'functional' and b.quantity > 0
 and b.expiration_date >= current_date
join public.items i on i.id = r.item_id
where r.location = 'equipment_room' and r.status = 'functional' and r.quantity > 0
  and (r.expiration_date is null or r.expiration_date >= current_date)
  and b.expiration_date < coalesce(r.expiration_date, 'infinity'::date);

-- Monthly analytics per item, derived from the movement ledger.
--   issued_*        taken by members for bags (usage)
--   room_refills    transfers backstock -> equipment room (officer restocks)
--   waste_cost      disposed stock + bag replacements caused by expired /
--                   broken / damaged items
-- Cost falls back to the item's default unit_cost when the lot had none.
create or replace view public.v_monthly_item_usage
with (security_invoker = true) as
select
  date_trunc('month', m.occurred_at)::date as month,
  m.item_id,
  i.name as item_name,
  i.category_id,
  coalesce(sum(m.quantity) filter (where m.movement_type = 'issue'), 0)::int as issued_qty,
  coalesce(sum(m.quantity) filter (where m.movement_type = 'issue' and sl.replacement_cause is null), 0)::int as issued_restock_qty,
  coalesce(sum(m.quantity) filter (where m.movement_type = 'issue' and sl.replacement_cause is not null), 0)::int as issued_replacement_qty,
  count(distinct m.submission_id) filter (where m.movement_type = 'issue')::int as submission_count,
  coalesce(sum(m.quantity) filter (where m.movement_type = 'dispose'), 0)::int as disposed_qty,
  coalesce(sum(m.quantity) filter (where m.movement_type = 'receive'), 0)::int as received_qty,
  coalesce(sum(m.quantity) filter (where m.movement_type = 'transfer' and m.to_location = 'equipment_room'), 0)::int as room_refill_qty,
  count(*) filter (where m.movement_type = 'transfer' and m.to_location = 'equipment_room')::int as room_refills,
  coalesce(sum(m.quantity * coalesce(m.unit_cost, i.unit_cost, 0)) filter (where m.movement_type = 'issue'), 0)::numeric(12, 2) as issued_cost,
  coalesce(sum(m.quantity * coalesce(m.unit_cost, i.unit_cost, 0)) filter (
    where m.movement_type = 'dispose'
       or (m.movement_type = 'issue' and sl.replacement_cause in ('expired', 'broken', 'damaged'))), 0)::numeric(12, 2) as waste_cost,
  coalesce(sum(m.quantity * coalesce(m.unit_cost, i.unit_cost, 0)) filter (where m.movement_type = 'receive'), 0)::numeric(12, 2) as purchase_cost
from public.inventory_movements m
join public.items i on i.id = m.item_id
left join public.submission_lines sl on sl.id = m.submission_line_id
group by 1, m.item_id, i.name, i.category_id;

-- ---------------------------------------------------------------------------
-- Lot primitives (internal; never granted to API roles)
-- ---------------------------------------------------------------------------

-- Add qty to the lot matching (item, location, status, expiry, lot#, cost),
-- creating it if absent. Returns the lot id. Does NOT write a movement.
create or replace function public._add_to_lot(
  p_item_id uuid,
  p_location public.inventory_location,
  p_status public.equipment_status,
  p_quantity integer,
  p_expiration_date date,
  p_lot_number text,
  p_unit_cost numeric,
  p_received_on date default current_date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select id into v_lot_id
  from public.inventory_lots
  where item_id = p_item_id
    and location = p_location
    and status = p_status
    and expiration_date is not distinct from p_expiration_date
    and lot_number is not distinct from p_lot_number
    and unit_cost is not distinct from p_unit_cost
  order by created_at
  limit 1
  for update;

  if v_lot_id is null then
    insert into public.inventory_lots
      (item_id, location, status, quantity, expiration_date, lot_number, unit_cost, received_on, notes)
    values
      (p_item_id, p_location, p_status, p_quantity, p_expiration_date, p_lot_number, p_unit_cost,
       coalesce(p_received_on, current_date), p_notes)
    returning id into v_lot_id;
  else
    update public.inventory_lots
       set quantity = quantity + p_quantity,
           received_on = least(received_on, coalesce(p_received_on, received_on))
     where id = v_lot_id;
  end if;

  return v_lot_id;
end;
$$;

-- Move qty out of a lot and record the movement.
--   issue / dispose          -> units leave inventory
--   transfer / status_change -> units land in the matching destination lot
-- Returns the destination lot id (null when units leave inventory).
create or replace function public._lot_move(
  p_lot_id uuid,
  p_quantity integer,
  p_movement_type public.movement_type,
  p_actor text,
  p_to_location public.inventory_location default null,
  p_to_status public.equipment_status default null,
  p_reason text default null,
  p_submission_id uuid default null,
  p_submission_line_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot public.inventory_lots%rowtype;
  v_dest_location public.inventory_location;
  v_dest_status public.equipment_status;
  v_dest_lot uuid;
begin
  if p_movement_type not in ('issue', 'dispose', 'transfer', 'status_change') then
    raise exception '_lot_move does not handle movement type %', p_movement_type;
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select * into v_lot from public.inventory_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Lot % not found', p_lot_id;
  end if;
  if v_lot.quantity < p_quantity then
    raise exception 'Lot % only has % units (requested %)', p_lot_id, v_lot.quantity, p_quantity;
  end if;

  update public.inventory_lots set quantity = quantity - p_quantity where id = p_lot_id;

  if p_movement_type in ('transfer', 'status_change') then
    v_dest_location := coalesce(p_to_location, v_lot.location);
    v_dest_status := coalesce(p_to_status, v_lot.status);
    if v_dest_location = v_lot.location and v_dest_status = v_lot.status then
      raise exception 'Move would not change location or status';
    end if;
    v_dest_lot := public._add_to_lot(
      v_lot.item_id, v_dest_location, v_dest_status, p_quantity,
      v_lot.expiration_date, v_lot.lot_number, v_lot.unit_cost, v_lot.received_on, v_lot.notes);
  end if;

  insert into public.inventory_movements (
    item_id, lot_id, movement_type, quantity,
    from_location, to_location, from_status, to_status,
    unit_cost, expiration_date, submission_id, submission_line_id, reason, actor)
  values (
    v_lot.item_id, p_lot_id, p_movement_type, p_quantity,
    v_lot.location, v_dest_location, v_lot.status, v_dest_status,
    v_lot.unit_cost, v_lot.expiration_date, p_submission_id, p_submission_line_id, p_reason, p_actor);

  return v_dest_lot;
end;
$$;

-- FEFO gate for putting stock into the equipment room: raises unless no
-- usable backstock lot of the item expires earlier than p_expiration_date.
-- (p_exclude_lot lets a lot being moved ignore itself.)
create or replace function public._assert_room_fefo(
  p_item_id uuid, p_expiration_date date, p_exclude_lot uuid default null)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_earlier date;
begin
  select min(expiration_date) into v_earlier
  from public.inventory_lots
  where item_id = p_item_id and location = 'backstock' and status = 'functional' and quantity > 0
    and expiration_date >= current_date
    and expiration_date < coalesce(p_expiration_date, 'infinity'::date)
    and id is distinct from p_exclude_lot;

  if v_earlier is not null then
    raise exception 'FEFO: backstock has a batch expiring % that must go to the equipment room first',
      to_char(v_earlier, 'YYYY-MM-DD') using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alerts engine
-- ---------------------------------------------------------------------------
-- Recomputes every condition-based alert. Idempotent; safe to call any time.
--   * Current conditions are upserted (one non-resolved alert per dedupe_key).
--   * An acknowledged alert whose severity escalates is re-opened.
--   * Condition alerts not seen in this run are auto-resolved.
--   * stock_discrepancy / broken_equipment_reported are event alerts:
--     never auto-resolved; an admin resolves them.
create or replace function public._refresh_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_warn integer;
  v_now timestamptz := now();
  v_open integer;
begin
  select expiration_warning_days into v_warn from public.app_settings where id = 1;

  with stock as (
    select s.*, nb.expiration_date as next_batch_exp, nb.batch_qty as next_batch_qty, nb.lot_id as next_batch_lot
    from public.v_item_stock s
    left join public.v_next_backstock_batch nb on nb.item_id = s.item_id
    where not s.is_archived
  ),
  lots as (
    select l.*, i.name as item_name, i.unit,
           case when l.location = 'equipment_room' then 'Equipment Room' else 'Backstock' end as location_label
    from public.inventory_lots l
    join public.items i on i.id = l.item_id
    where l.quantity > 0 and not i.is_archived
  ),
  cond as (
    -- Equipment room below par -> Equipment Officer moves the next batch
    -- (notifies officer + board, per owner request 2026-11-13)
    select
      'low_room:' || item_id as dedupe_key,
      'low_stock_room'::public.alert_type as alert_type,
      (case when room_qty = 0 then 'critical' else 'warning' end)::public.alert_severity as severity,
      'all'::public.alert_audience as audience,
      item_id, next_batch_lot as lot_id,
      format('Equipment Room %s is low', name) as title,
      case
        when next_batch_qty is null then
          format('Equipment Room %s is low (%s of %s %s). No usable backstock — reorder.',
                 name, room_qty, room_par_qty, unit)
        else
          format('Equipment Room %s is low (%s of %s %s). Move next batch (Exp: %s, %s %s) from Backstock.',
                 name, room_qty, room_par_qty, unit,
                 coalesce(to_char(next_batch_exp, 'YYYY-MM-DD'), 'none'), next_batch_qty, unit)
      end as message
    from stock
    where room_par_qty > 0 and room_qty < room_par_qty

    union all
    -- Backstock below minimum -> reorder (Equipment Officer + board)
    select
      'low_backstock:' || item_id,
      'low_stock_backstock',
      (case when backstock_qty = 0 then 'critical' else 'warning' end)::public.alert_severity,
      'all',
      item_id, null,
      format('Reorder: %s', name),
      format('Backstock has %s %s of %s (minimum %s). Equipment Room has %s.',
             backstock_qty, unit, name, min_backstock_qty, room_qty)
    from stock
    where min_backstock_qty > 0 and backstock_qty < min_backstock_qty

    union all
    -- Expired units still on a shelf
    select
      'expired:' || id,
      'expired',
      (case when location = 'equipment_room' then 'critical' else 'warning' end)::public.alert_severity,
      'equipment_officer',
      item_id, id,
      format('Expired: %s (%s)', item_name, location_label),
      format('%s %s of %s expired on %s and are still in %s. Remove and dispose.',
             quantity, unit, item_name, to_char(expiration_date, 'YYYY-MM-DD'), location_label)
    from lots
    where status = 'functional' and expiration_date < current_date

    union all
    -- Expiring within the warning window (default 60 days ≈ 2 months)
    select
      'expiring:' || id,
      'expiring_soon',
      'warning',
      'equipment_officer',
      item_id, id,
      format('Expiring soon: %s (%s)', item_name, location_label),
      format('%s %s of %s expire on %s (%s days) in %s.',
             quantity, unit, item_name, to_char(expiration_date, 'YYYY-MM-DD'),
             expiration_date - current_date, location_label)
    from lots
    where status = 'functional'
      and expiration_date >= current_date
      and expiration_date <= current_date + v_warn

    union all
    -- Broken equipment awaiting repair/disposal
    select
      'oos:' || id,
      'out_of_service',
      'info',
      'equipment_officer',
      item_id, id,
      format('Out of service: %s', item_name),
      format('%s %s of %s marked out of service (%s).', quantity, unit, item_name, location_label)
    from lots
    where status = 'out_of_service'

    union all
    -- FEFO: backstock holds stock that expires sooner than the equipment room
    select
      'fefo:' || item_id,
      'fefo_violation',
      'warning',
      'equipment_officer',
      item_id, null,
      format('FEFO swap needed: %s', min(item_name)),
      format('Backstock has %s expiring %s, earlier than the Equipment Room stock (expiring %s). Swap them, then press "Mark swapped".',
             min(item_name),
             to_char(min(backstock_expiration), 'YYYY-MM-DD'),
             coalesce(to_char(max(room_expiration), 'YYYY-MM-DD'), 'never'))
    from public.v_fefo_violations
    group by item_id
  )
  insert into public.alerts as a
    (alert_type, severity, audience, item_id, lot_id, title, message, dedupe_key, first_detected_at, last_detected_at)
  select alert_type, severity, audience, item_id, lot_id, title, message, dedupe_key, v_now, v_now
  from cond
  on conflict (dedupe_key) where status <> 'resolved'
  do update set
    severity = excluded.severity,
    audience = excluded.audience,
    lot_id = excluded.lot_id,
    title = excluded.title,
    message = excluded.message,
    last_detected_at = excluded.last_detected_at,
    status = case
      when a.status = 'acknowledged' and excluded.severity > a.severity then 'open'::public.alert_status
      else a.status
    end;

  -- Anything not re-detected in this run is no longer true.
  update public.alerts
     set status = 'resolved', resolved_at = v_now
   where status <> 'resolved'
     and alert_type not in ('stock_discrepancy', 'broken_equipment_reported')
     and last_detected_at < v_now;

  -- Housekeeping: keep 30 days of PIN attempts.
  delete from public.pin_attempts where attempted_at < v_now - interval '30 days';

  select count(*) into v_open from public.alerts where status = 'open';
  return v_open;
end;
$$;

-- Public wrapper: admin (via the dashboard) or service_role (cron).
create or replace function public.refresh_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or coalesce((select auth.role()), '') = 'service_role') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return public._refresh_alerts();
end;
$$;

-- ---------------------------------------------------------------------------
-- Member PIN
-- ---------------------------------------------------------------------------
-- Called by the Next.js server (service_role) when a member enters the PIN.
-- Rate limits: 8 failures / 15 min per client, 40 failures / 15 min globally.
create or replace function public.verify_member_pin(p_pin text, p_client_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_client_failures integer;
  v_global_failures integer;
  v_ok boolean;
begin
  select count(*) filter (where client_hash = p_client_hash), count(*)
    into v_client_failures, v_global_failures
  from public.pin_attempts
  where not success and attempted_at > now() - interval '15 minutes';

  if v_client_failures >= 8 or v_global_failures >= 40 then
    return jsonb_build_object('ok', false, 'locked', true);
  end if;

  select member_pin_hash into v_hash from public.app_secrets where id = 1;
  v_ok := v_hash is not null and p_pin is not null
          and extensions.crypt(p_pin, v_hash) = v_hash;

  insert into public.pin_attempts (client_hash, success) values (coalesce(p_client_hash, 'unknown'), v_ok);
  return jsonb_build_object('ok', v_ok, 'locked', false);
end;
$$;

create or replace function public.admin_set_member_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_admin();
  if p_pin !~ '^[0-9]{4,12}$' then
    raise exception 'PIN must be 4–12 digits';
  end if;
  update public.app_secrets
     set member_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
         updated_at = now()
   where id = 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Member submission
-- ---------------------------------------------------------------------------
-- A member took items from the EQUIPMENT ROOM to restock a bag.
-- p_lines: [{"item_id": uuid, "quantity": int, "replacement_cause": text|null}, ...]
--
-- For each line (quantity q):
--   1. ISSUE q units from usable equipment-room lots in FEFO order (they leave
--      inventory — bags are not tracked). Backstock is never touched.
--   2. If records show fewer than q usable units in the room, the gap is stored
--      as discrepancy_qty and a stock_discrepancy alert asks for a recount.
--   3. replacement + broken/damaged on an is_equipment item raises a
--      broken_equipment_reported alert so the officer can collect/repair it.
-- Finally the alert engine runs (which raises "Equipment Room X is low. Move
-- next batch…" when the room falls below par).
create or replace function public.process_submission(
  p_submitted_by_name text,
  p_reason public.submission_reason,
  p_context public.submission_context,
  p_lines jsonb,
  p_call_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission_id uuid;
  v_name text;
  v_actor text;
  v_line jsonb;
  v_line_id uuid;
  v_item public.items%rowtype;
  v_qty integer;
  v_cause public.replacement_cause;
  v_remaining integer;
  v_take integer;
  v_lot record;
  v_discrepancy integer;
  v_flagged boolean := false;
  v_result_lines jsonb := '[]'::jsonb;
begin
  -- ---- validation ---------------------------------------------------------
  v_name := left(trim(coalesce(p_submitted_by_name, '')), 120);
  if length(v_name) = 0 then
    raise exception 'Name is required' using errcode = '22023';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one item is required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lines) > 50 then
    raise exception 'Too many items in one submission (max 50)' using errcode = '22023';
  end if;

  v_actor := 'member:' || v_name;

  insert into public.submissions (submitted_by_name, reason, context, call_reference, notes, status, processed_at)
  values (v_name, p_reason, coalesce(p_context, 'call'),
          nullif(trim(p_call_reference), ''), nullif(trim(p_notes), ''), 'processed', now())
  returning id into v_submission_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    select * into v_item from public.items
     where id = (v_line ->> 'item_id')::uuid and not is_archived;
    if not found then
      raise exception 'Unknown item %', v_line ->> 'item_id' using errcode = '22023';
    end if;

    v_qty := (v_line ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 500 then
      raise exception 'Invalid quantity for %', v_item.name using errcode = '22023';
    end if;

    if p_reason = 'replacement' then
      v_cause := coalesce(nullif(v_line ->> 'replacement_cause', ''), 'other')::public.replacement_cause;
    else
      v_cause := null;
    end if;

    insert into public.submission_lines (submission_id, item_id, quantity, replacement_cause)
    values (v_submission_id, v_item.id, v_qty, v_cause)
    returning id into v_line_id;

    -- ---- 1. issue from the equipment room (FEFO, usable only) -------------
    v_remaining := v_qty;
    for v_lot in
      select id, quantity from public.inventory_lots
       where item_id = v_item.id and location = 'equipment_room' and status = 'functional' and quantity > 0
         and (expiration_date is null or expiration_date >= current_date)
       order by expiration_date asc nulls last, received_on, created_at, id
       for update
    loop
      exit when v_remaining = 0;
      v_take := least(v_remaining, v_lot.quantity);
      perform public._lot_move(v_lot.id, v_take, 'issue', v_actor,
        p_reason => case when v_cause is null then 'Restock: ' || coalesce(p_context::text, 'call')
                         else 'Replacement: ' || v_cause::text end,
        p_submission_id => v_submission_id, p_submission_line_id => v_line_id);
      v_remaining := v_remaining - v_take;
    end loop;
    v_discrepancy := v_remaining;

    -- ---- 2. discrepancy -> recount -------------------------------------------
    if v_discrepancy > 0 then
      v_flagged := true;
      update public.submission_lines set discrepancy_qty = v_discrepancy where id = v_line_id;
      insert into public.alerts (alert_type, severity, audience, item_id, submission_id, title, message, dedupe_key)
      values ('stock_discrepancy', 'warning', 'equipment_officer', v_item.id, v_submission_id,
              format('Recount needed: %s', v_item.name),
              format('%s took %s %s of %s, but records showed only %s usable in the Equipment Room. Recount and adjust.',
                     v_name, v_qty, v_item.unit, v_item.name, v_qty - v_discrepancy),
              'discrepancy:' || v_line_id);
    end if;

    -- ---- 3. broken equipment reported ---------------------------------------
    if v_cause in ('broken', 'damaged') and v_item.is_equipment then
      insert into public.alerts (alert_type, severity, audience, item_id, submission_id, title, message, dedupe_key)
      values ('broken_equipment_reported', 'info', 'equipment_officer', v_item.id, v_submission_id,
              format('Broken equipment: %s', v_item.name),
              format('%s replaced %s %s of %s (%s). Collect the old unit for repair or disposal.',
                     v_name, v_qty, v_item.unit, v_item.name, v_cause),
              'broken:' || v_line_id);
    end if;

    v_result_lines := v_result_lines || jsonb_build_object(
      'item_id', v_item.id,
      'item_name', v_item.name,
      'quantity', v_qty,
      'discrepancy_qty', v_discrepancy);
  end loop;

  if v_flagged then
    update public.submissions set status = 'flagged' where id = v_submission_id;
  end if;

  perform public._refresh_alerts();

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'status', case when v_flagged then 'flagged' else 'processed' end,
    'lines', v_result_lines);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin inventory RPCs
-- ---------------------------------------------------------------------------

-- Receive new stock (purchase/donation). Defaults to backstock. Receiving
-- straight into the equipment room is allowed only if it doesn't break FEFO.
create or replace function public.admin_receive_stock(
  p_item_id uuid,
  p_quantity integer,
  p_location public.inventory_location default 'backstock',
  p_expiration_date date default null,
  p_lot_number text default null,
  p_unit_cost numeric default null,
  p_received_on date default current_date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items%rowtype;
  v_cost numeric;
  v_exp date;
  v_location public.inventory_location := coalesce(p_location, 'backstock');
  v_lot_id uuid;
begin
  perform public._assert_admin();

  select * into v_item from public.items where id = p_item_id;
  if not found then raise exception 'Unknown item'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  if v_item.tracks_expiration and p_expiration_date is null then
    raise exception '% requires an expiration date', v_item.name;
  end if;

  v_exp := case when v_item.tracks_expiration then p_expiration_date end;
  if v_location = 'equipment_room' then
    perform public._assert_room_fefo(p_item_id, v_exp);
  end if;

  v_cost := coalesce(p_unit_cost, v_item.unit_cost);
  v_lot_id := public._add_to_lot(
    p_item_id, v_location, 'functional', p_quantity, v_exp,
    nullif(trim(p_lot_number), ''), v_cost, p_received_on, nullif(trim(p_notes), ''));

  insert into public.inventory_movements
    (item_id, lot_id, movement_type, quantity, to_location, to_status, unit_cost, expiration_date, reason, actor)
  values
    (p_item_id, v_lot_id, 'receive', p_quantity, v_location, 'functional',
     v_cost, v_exp, nullif(trim(p_notes), ''), 'admin');

  perform public._refresh_alerts();
  return v_lot_id;
end;
$$;

-- Move stock between locations. Moving INTO the equipment room enforces FEFO:
-- only the earliest-expiring usable backstock batch may go in.
create or replace function public.admin_transfer_lot(
  p_lot_id uuid, p_quantity integer, p_to_location public.inventory_location, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot public.inventory_lots%rowtype;
  v_dest uuid;
begin
  perform public._assert_admin();

  if p_to_location = 'equipment_room' then
    select * into v_lot from public.inventory_lots where id = p_lot_id;
    if not found then raise exception 'Lot not found'; end if;
    if v_lot.status <> 'functional' then
      raise exception 'Out-of-service stock cannot go to the equipment room';
    end if;
    if v_lot.expiration_date < current_date then
      raise exception 'Expired stock cannot go to the equipment room';
    end if;
    perform public._assert_room_fefo(v_lot.item_id, v_lot.expiration_date, p_lot_id);
  end if;

  v_dest := public._lot_move(p_lot_id, p_quantity, 'transfer', 'admin',
    p_to_location => p_to_location, p_reason => p_reason);
  perform public._refresh_alerts();
  return v_dest;
end;
$$;

create or replace function public.admin_set_lot_status(
  p_lot_id uuid, p_quantity integer, p_status public.equipment_status, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_dest uuid;
begin
  perform public._assert_admin();
  v_dest := public._lot_move(p_lot_id, p_quantity, 'status_change', 'admin',
    p_to_status => p_status, p_reason => p_reason);
  perform public._refresh_alerts();
  return v_dest;
end;
$$;

create or replace function public.admin_dispose_lot(
  p_lot_id uuid, p_quantity integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_admin();
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to dispose stock';
  end if;
  perform public._lot_move(p_lot_id, p_quantity, 'dispose', 'admin', p_reason => p_reason);
  perform public._refresh_alerts();
end;
$$;

-- Physical count correction. Records the delta as an 'adjust' movement.
create or replace function public.admin_adjust_lot(
  p_lot_id uuid, p_new_quantity integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot public.inventory_lots%rowtype;
begin
  perform public._assert_admin();
  if p_new_quantity is null or p_new_quantity < 0 then raise exception 'Quantity cannot be negative'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'A reason is required'; end if;

  select * into v_lot from public.inventory_lots where id = p_lot_id for update;
  if not found then raise exception 'Lot not found'; end if;
  if v_lot.quantity = p_new_quantity then return; end if;

  update public.inventory_lots set quantity = p_new_quantity where id = p_lot_id;
  insert into public.inventory_movements
    (item_id, lot_id, movement_type, quantity, from_location, to_location, from_status, to_status,
     unit_cost, expiration_date, reason, actor)
  values
    (v_lot.item_id, p_lot_id, 'adjust', p_new_quantity - v_lot.quantity, v_lot.location, v_lot.location,
     v_lot.status, v_lot.status, v_lot.unit_cost, v_lot.expiration_date, p_reason, 'admin');

  perform public._refresh_alerts();
end;
$$;

-- After the Equipment Officer physically swaps stock so the equipment room
-- holds the earliest-expiring units, this makes the records match: the room
-- quantity stays the same, but it is re-assigned to the earliest-expiring
-- usable lots (room -> backstock first, then backstock -> room).
create or replace function public.admin_fefo_rebalance(p_item_id uuid)
returns integer  -- number of transfer movements written
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room_total integer;
  v_moves integer := 0;
  v_plan record;
begin
  perform public._assert_admin();

  select coalesce(sum(quantity), 0) into v_room_total
  from public.inventory_lots
  where item_id = p_item_id and location = 'equipment_room' and status = 'functional' and quantity > 0
    and (expiration_date is null or expiration_date >= current_date);

  for v_plan in
    with usable as (
      select id, location, quantity,
             sum(quantity) over (order by expiration_date asc nulls last, received_on, created_at, id) as cum
      from public.inventory_lots
      where item_id = p_item_id and status = 'functional' and quantity > 0
        and (expiration_date is null or expiration_date >= current_date)
    ),
    planned as (
      select id, location, quantity,
             greatest(0, least(quantity, v_room_total - (cum - quantity)))::int as want_room
      from usable
    )
    select id,
           case when location = 'equipment_room' then 'backstock' else 'equipment_room' end::public.inventory_location as to_location,
           case when location = 'equipment_room' then quantity - want_room else want_room end as qty,
           case when location = 'equipment_room' then 1 else 2 end as pass
    from planned
    where (location = 'equipment_room' and want_room < quantity)
       or (location = 'backstock' and want_room > 0)
    order by pass
  loop
    perform public._lot_move(v_plan.id, v_plan.qty, 'transfer', 'admin',
      p_to_location => v_plan.to_location, p_reason => 'FEFO rebalance');
    v_moves := v_moves + 1;
  end loop;

  perform public._refresh_alerts();
  return v_moves;
end;
$$;
