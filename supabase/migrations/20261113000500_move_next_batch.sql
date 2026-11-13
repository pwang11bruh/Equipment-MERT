-- =============================================================================
-- MERT Equipment Portal — admin_move_next_batch
-- -----------------------------------------------------------------------------
-- One-tap response to "Equipment Room X is low. Move next batch (Exp: D) from
-- Backstock." Moves the earliest-expiring usable backstock batch (all lots
-- sharing that expiration date, oldest received first) into the equipment
-- room, atomically. p_quantity limits how many units move (null = the whole
-- batch). Never moves more than one batch per call; call again for the next.
-- =============================================================================

create or replace function public.admin_move_next_batch(p_item_id uuid, p_quantity integer default null)
returns integer  -- units moved (0 if backstock has no usable stock)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exp date;
  v_has_batch boolean;
  v_remaining integer;
  v_moved integer := 0;
  v_take integer;
  v_lot record;
begin
  perform public._assert_admin();
  if p_quantity is not null and p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select true, expiration_date into v_has_batch, v_exp
  from public.inventory_lots
  where item_id = p_item_id and location = 'backstock' and status = 'functional' and quantity > 0
    and (expiration_date is null or expiration_date >= current_date)
  order by expiration_date asc nulls last
  limit 1;

  if not coalesce(v_has_batch, false) then
    return 0;
  end if;

  -- The batch is by definition the earliest usable backstock stock, so this
  -- only fails if something is inconsistent; keep the guard anyway.
  perform public._assert_room_fefo(p_item_id, v_exp);

  v_remaining := coalesce(p_quantity, 2147483647);
  for v_lot in
    select id, quantity from public.inventory_lots
    where item_id = p_item_id and location = 'backstock' and status = 'functional' and quantity > 0
      and expiration_date is not distinct from v_exp
    order by received_on, created_at, id
    for update
  loop
    exit when v_remaining = 0;
    v_take := least(v_remaining, v_lot.quantity);
    perform public._lot_move(v_lot.id, v_take, 'transfer', 'admin',
      p_to_location => 'equipment_room', p_reason => 'Move next batch to Equipment Room');
    v_remaining := v_remaining - v_take;
    v_moved := v_moved + v_take;
  end loop;

  perform public._refresh_alerts();
  return v_moved;
end;
$$;

revoke execute on function public.admin_move_next_batch(uuid, integer) from public, anon;
grant execute on function public.admin_move_next_batch(uuid, integer) to authenticated;
