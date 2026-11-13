-- =============================================================================
-- MERT Equipment Portal — Equipment Room alert fires AT par
-- -----------------------------------------------------------------------------
-- Owner request (2026-11-13): the "Equipment Room X is low. Move next batch…"
-- alert fires as soon as the usable room count REACHES par (room_qty <= par),
-- not only when it drops below. Consequence: to clear the alert, the room must
-- be restocked ABOVE par. Only _refresh_alerts() changes; everything else in
-- it is identical to migration 0200.
-- =============================================================================

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
    -- Equipment room AT or below par -> move the next batch (owner request
    -- 2026-11-13: fire as soon as the count reaches par). Officer + board.
    select
      'low_room:' || item_id as dedupe_key,
      'low_stock_room'::public.alert_type as alert_type,
      (case when room_qty = 0 then 'critical' else 'warning' end)::public.alert_severity as severity,
      'all'::public.alert_audience as audience,
      item_id, next_batch_lot as lot_id,
      format('Equipment Room %s is low', name) as title,
      case
        when next_batch_qty is null then
          format('Equipment Room %s is low (%s left, par %s %s). No usable backstock — reorder.',
                 name, room_qty, room_par_qty, unit)
        else
          format('Equipment Room %s is low (%s left, par %s %s). Move next batch (Exp: %s, %s %s) from Backstock.',
                 name, room_qty, room_par_qty, unit,
                 coalesce(to_char(next_batch_exp, 'YYYY-MM-DD'), 'none'), next_batch_qty, unit)
      end as message
    from stock
    where room_par_qty > 0 and room_qty <= room_par_qty

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

select public._refresh_alerts();
