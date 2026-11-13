-- =============================================================================
-- Local development seed (runs on `supabase db reset`; NOT applied to prod).
-- Sets dev thresholds on part of the real catalog (migration 0400), adds lots across equipment_room/backstock with varied
-- expirations, a dev member PIN (1234) and a dev admin login.
--   Admin login (local only): admin@mert.local / mert-admin-dev
-- =============================================================================

-- ---- Dev member PIN = 1234 --------------------------------------------------
update public.app_secrets
   set member_pin_hash = extensions.crypt('1234', extensions.gen_salt('bf', 10))
 where id = 1;

-- ---- Dev admin user -----------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values (
  '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'admin@mert.local',
  extensions.crypt('mert-admin-dev', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@mert.local"}', 'email', now(), now(), now())
on conflict do nothing;

insert into public.admin_users (user_id, label)
values ('11111111-1111-1111-1111-111111111111', 'Local dev admin')
on conflict do nothing;

-- ---- Catalog ------------------------------------------------------------------
-- Categories and items come from migration 0400 (the real catalog). For local
-- dev, give a subset of items thresholds and costs so alerts/analytics show up.
update public.items i
   set room_par_qty = v.par, min_backstock_qty = v.min_b, unit_cost = v.cost
  from (values
  ('Tourniquet (commercial tactical)', 4, 4, 29.99),
  ('Multi-trauma dressing (10x30)', 4, 4, 6.5),
  ('Occlusive dressing', 6, 6, 3.25),
  ('NPA size 24', 2, 2, 4.0),
  ('OPA set (sizes 0–5)', 2, 2, 9.5),
  ('Adult BVM (700 cc)', 2, 1, 22.0),
  ('Pocket mask', 4, 4, 6.75),
  ('Gauze pad 4x4', 40, 50, 0.18),
  ('Band-Aid, small', 50, 100, 0.06),
  ('Alcohol prep pad', 30, 50, 0.03),
  ('Disposable exam gloves', 20, 50, 0.22),
  ('Saline bullet (15 mL)', 20, 50, 0.45),
  ('Pulse oximeter', 2, 1, 34.0),
  ('Adult BP cuff', 2, 1, 27.0),
  ('Penlight', 2, 2, 3.0),
  ('Oral glucose packet (15 g)', 4, 4, 2.9),
  ('SAM splint (standard)', 2, 2, 14.95),
  ('Triangular bandage', 4, 4, 1.4),
  ('Cold pack', 6, 10, 0.95),
  ('Emesis / convenience bag', 6, 10, 0.65)
  ) as v(name, par, min_b, cost)
 where i.name = v.name;

-- ---- Lots (+ matching 'receive' movements so analytics have data) ---------------
-- Expiry offsets are relative to today so FEFO/alert states are always visible:
--   negative = already expired, <60 = expiring soon.
with lot_data(item, location, qty, exp_days, cost) as (
  values
    ('Tourniquet (commercial tactical)',   'equipment_room',    4, null::int, 29.99),
    ('Tourniquet (commercial tactical)',   'backstock', 2, null,      29.99),   -- below backstock min (4)
    ('Multi-trauma dressing (10x30)',   'equipment_room',    3, 400,       38.50),
    ('Multi-trauma dressing (10x30)',   'backstock', 4, 45,        38.50),   -- FEFO violation + expiring soon
    ('Occlusive dressing', 'equipment_room',    6, 700,       4.25),
    ('Occlusive dressing', 'backstock', 10, 900,      4.25),
    ('NPA size 24',            'equipment_room',    2, -5,        18.00),   -- expired in equipment room (critical)
    ('NPA size 24',            'backstock', 3, 500,       18.00),
    ('OPA set (sizes 0–5)',            'equipment_room',    2, 800,       9.50),
    ('OPA set (sizes 0–5)',            'backstock', 2, 820,       9.50),
    ('Adult BVM (700 cc)',          'equipment_room',    2, 1000,      22.00),
    ('Adult BVM (700 cc)',          'backstock', 1, 1100,      22.00),
    ('Pocket mask',    'equipment_room',    4, null,      6.75),
    ('Pocket mask',    'backstock', 6, null,      6.75),
    ('Gauze pad 4x4',     'equipment_room',    40, 300,      0.18),
    ('Gauze pad 4x4',     'backstock', 100, 600,     0.18),
    ('Band-Aid, small',  'equipment_room',    50, 365,      0.06),
    ('Band-Aid, small',  'backstock', 200, 720,     0.06),
    ('Alcohol prep pad',  'equipment_room',    30, 30,       0.03),    -- expiring soon in equipment room
    ('Alcohol prep pad',  'backstock', 100, 500,     0.03),
    ('Disposable exam gloves', 'equipment_room',    20, 900,      0.22),
    ('Disposable exam gloves', 'backstock', 80, 1000,     0.22),
    ('Saline bullet (15 mL)', 'equipment_room',    8, 900,       0.22),    -- below room par (20)
    ('Saline bullet (15 mL)', 'backstock', 0, 1000,      0.22),
    ('Pulse oximeter',     'equipment_room',    2, null,      34.00),
    ('Pulse oximeter',     'backstock', 1, null,      34.00),
    ('Adult BP cuff',    'equipment_room',    2, null,      27.00),
    ('Adult BP cuff',    'backstock', 1, null,      27.00),
    ('Penlight',           'equipment_room',    2, null,      3.00),
    ('Penlight',           'backstock', 4, null,      3.00),
    ('Oral glucose packet (15 g)',   'equipment_room',    4, 200,       5.80),
    ('Oral glucose packet (15 g)',   'backstock', 6, 400,       5.80),
    ('SAM splint (standard)',         'equipment_room',    2, null,      14.95),
    ('SAM splint (standard)',         'backstock', 2, null,      14.95),
    ('Triangular bandage', 'equipment_room',    4, 1200,      1.40),
    ('Triangular bandage', 'backstock', 8, 1300,      1.40),
    ('Cold pack',  'equipment_room',    6, 500,       0.95),
    ('Cold pack',  'backstock', 12, 650,      0.95),
    ('Emesis / convenience bag',         'equipment_room',    6, null,      0.65),
    ('Emesis / convenience bag',         'backstock', 15, null,     0.65)
),
inserted as (
  insert into public.inventory_lots (item_id, location, status, quantity, expiration_date, unit_cost, received_on)
  select i.id, d.location::public.inventory_location, 'functional', d.qty,
         case when d.exp_days is null or not i.tracks_expiration then null else current_date + d.exp_days end,
         d.cost, current_date - 90
  from lot_data d
  join public.items i on i.name = d.item
  where d.qty > 0
  returning id, item_id, location, quantity, expiration_date, unit_cost
)
insert into public.inventory_movements
  (occurred_at, item_id, lot_id, movement_type, quantity, to_location, to_status, unit_cost, expiration_date, reason, actor)
select now() - interval '90 days', item_id, id, 'receive', quantity, location, 'functional',
       unit_cost, expiration_date, 'Initial seed', 'system'
from inserted;

-- ---- Sample alert recipients (edit in the admin UI) ---------------------------
insert into public.alert_recipients (name, role, email, phone_e164, notify_email, notify_sms) values
  ('Equipment Officer (dev)', 'equipment_officer', 'equipment@mert.local', '+15555550100', true, true),
  ('Board (dev)',             'board',             'board@mert.local',     null,           true, false);

select public._refresh_alerts();
