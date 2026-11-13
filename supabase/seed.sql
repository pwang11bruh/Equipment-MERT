-- =============================================================================
-- Local development seed (runs on `supabase db reset`; NOT applied to prod).
-- Creates a sample catalog, some lots across equipment_room/backstock with varied
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

-- ---- Categories ---------------------------------------------------------------
insert into public.item_categories (name, sort_order) values
  ('Bleeding Control', 10),
  ('Airway & Breathing', 20),
  ('Wound Care', 30),
  ('PPE', 40),
  ('Diagnostics', 50),
  ('Medications', 60),
  ('Splinting & Immobilization', 70),
  ('Misc', 90)
on conflict (name) do nothing;

-- ---- Items --------------------------------------------------------------------
insert into public.items
  (name, category_id, unit, tracks_expiration, is_equipment, room_par_qty, min_backstock_qty, unit_cost, vendor)
select v.name, c.id, v.unit, v.tracks_exp, v.is_equip, v.par, v.min_b, v.cost, v.vendor
from (values
  ('Tourniquet (CAT)',          'Bleeding Control',          'each',  false, false, 4,  2, 4,  29.99, 'North American Rescue'),
  ('Hemostatic Gauze',          'Bleeding Control',          'each',  true,  false, 4,  2, 4,  38.50, 'North American Rescue'),
  ('Trauma Dressing 6"',        'Bleeding Control',          'each',  true,  false, 6,  3, 6,   4.25, 'Bound Tree'),
  ('NPA Kit',                   'Airway & Breathing',        'kit',   true,  false, 2,  1, 2,  18.00, 'Bound Tree'),
  ('OPA Kit',                   'Airway & Breathing',        'kit',   true,  false, 2,  1, 2,   9.50, 'Bound Tree'),
  ('BVM Adult',                 'Airway & Breathing',        'each',  true,  false, 2,  1, 1,  22.00, 'Bound Tree'),
  ('CPR Pocket Mask',           'Airway & Breathing',        'each',  false, false, 4,  2, 4,   6.75, 'Bound Tree'),
  ('Gauze Pads 4x4',            'Wound Care',                'each',  true,  false, 40, 20, 50,  0.18, 'Henry Schein'),
  ('Adhesive Bandages',         'Wound Care',                'each',  true,  false, 50, 25, 100, 0.06, 'Henry Schein'),
  ('Alcohol Prep Pads',         'Wound Care',                'each',  true,  false, 30, 15, 50,  0.03, 'Henry Schein'),
  ('Nitrile Gloves (M)',        'PPE',                       'pair',  true,  false, 20, 10, 50,  0.22, 'Henry Schein'),
  ('Nitrile Gloves (L)',        'PPE',                       'pair',  true,  false, 20, 10, 50,  0.22, 'Henry Schein'),
  ('Pulse Oximeter',            'Diagnostics',               'each',  false, true,  2,  1, 1,  34.00, 'Amazon'),
  ('BP Cuff (Adult)',           'Diagnostics',               'each',  false, true,  2,  1, 1,  27.00, 'Amazon'),
  ('Penlight',                  'Diagnostics',               'each',  false, true,  2,  1, 2,   3.00, 'Amazon'),
  ('Oral Glucose Gel',          'Medications',               'tube',  true,  false, 4,  2, 4,   5.80, 'Bound Tree'),
  ('SAM Splint',                'Splinting & Immobilization','each',  false, false, 2,  1, 2,  14.95, 'Bound Tree'),
  ('Triangular Bandage',        'Splinting & Immobilization','each',  true,  false, 4,  2, 4,   1.40, 'Bound Tree'),
  ('Instant Cold Pack',         'Misc',                      'each',  true,  false, 6,  3, 10,  0.95, 'Henry Schein'),
  ('Emesis Bag',                'Misc',                      'each',  false, false, 6,  3, 10,  0.65, 'Henry Schein')
) as v(name, category, unit, tracks_exp, is_equip, par, min_a_unused, min_b, cost, vendor)
join public.item_categories c on c.name = v.category
on conflict do nothing;

-- ---- Lots (+ matching 'receive' movements so analytics have data) ---------------
-- Expiry offsets are relative to today so FEFO/alert states are always visible:
--   negative = already expired, <60 = expiring soon.
with lot_data(item, location, qty, exp_days, cost) as (
  values
    ('Tourniquet (CAT)',   'equipment_room',    4, null::int, 29.99),
    ('Tourniquet (CAT)',   'backstock', 2, null,      29.99),   -- below backstock min (4)
    ('Hemostatic Gauze',   'equipment_room',    3, 400,       38.50),
    ('Hemostatic Gauze',   'backstock', 4, 45,        38.50),   -- FEFO violation + expiring soon
    ('Trauma Dressing 6"', 'equipment_room',    6, 700,       4.25),
    ('Trauma Dressing 6"', 'backstock', 10, 900,      4.25),
    ('NPA Kit',            'equipment_room',    2, -5,        18.00),   -- expired in equipment room (critical)
    ('NPA Kit',            'backstock', 3, 500,       18.00),
    ('OPA Kit',            'equipment_room',    2, 800,       9.50),
    ('OPA Kit',            'backstock', 2, 820,       9.50),
    ('BVM Adult',          'equipment_room',    2, 1000,      22.00),
    ('BVM Adult',          'backstock', 1, 1100,      22.00),
    ('CPR Pocket Mask',    'equipment_room',    4, null,      6.75),
    ('CPR Pocket Mask',    'backstock', 6, null,      6.75),
    ('Gauze Pads 4x4',     'equipment_room',    40, 300,      0.18),
    ('Gauze Pads 4x4',     'backstock', 100, 600,     0.18),
    ('Adhesive Bandages',  'equipment_room',    50, 365,      0.06),
    ('Adhesive Bandages',  'backstock', 200, 720,     0.06),
    ('Alcohol Prep Pads',  'equipment_room',    30, 30,       0.03),    -- expiring soon in equipment room
    ('Alcohol Prep Pads',  'backstock', 100, 500,     0.03),
    ('Nitrile Gloves (M)', 'equipment_room',    20, 900,      0.22),
    ('Nitrile Gloves (M)', 'backstock', 80, 1000,     0.22),
    ('Nitrile Gloves (L)', 'equipment_room',    8, 900,       0.22),    -- below room par (20)
    ('Nitrile Gloves (L)', 'backstock', 0, 1000,      0.22),
    ('Pulse Oximeter',     'equipment_room',    2, null,      34.00),
    ('Pulse Oximeter',     'backstock', 1, null,      34.00),
    ('BP Cuff (Adult)',    'equipment_room',    2, null,      27.00),
    ('BP Cuff (Adult)',    'backstock', 1, null,      27.00),
    ('Penlight',           'equipment_room',    2, null,      3.00),
    ('Penlight',           'backstock', 4, null,      3.00),
    ('Oral Glucose Gel',   'equipment_room',    4, 200,       5.80),
    ('Oral Glucose Gel',   'backstock', 6, 400,       5.80),
    ('SAM Splint',         'equipment_room',    2, null,      14.95),
    ('SAM Splint',         'backstock', 2, null,      14.95),
    ('Triangular Bandage', 'equipment_room',    4, 1200,      1.40),
    ('Triangular Bandage', 'backstock', 8, 1300,      1.40),
    ('Instant Cold Pack',  'equipment_room',    6, 500,       0.95),
    ('Instant Cold Pack',  'backstock', 12, 650,      0.95),
    ('Emesis Bag',         'equipment_room',    6, null,      0.65),
    ('Emesis Bag',         'backstock', 15, null,     0.65)
),
inserted as (
  insert into public.inventory_lots (item_id, location, status, quantity, expiration_date, unit_cost, received_on)
  select i.id, d.location::public.inventory_location, 'functional', d.qty,
         case when d.exp_days is null then null else current_date + d.exp_days end,
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
