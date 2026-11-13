-- =============================================================================
-- MERT Equipment Portal — Core schema
-- -----------------------------------------------------------------------------
-- Tables, enums, indexes and housekeeping triggers.
-- Business logic (FEFO, submissions, alerts) lives in 20261113000200_*.sql.
-- Security (RLS + grants) lives in 20261113000300_*.sql.
-- See docs/database/SCHEMA.md for the narrative explanation of every table.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
-- Where a unit physically is (ADR-003, revised ADR-008):
--   equipment_room = accessible pool members restock their bags from. FEFO
--                    invariant: it only holds the earliest-expiring batch(es).
--   backstock      = locked reserve; only the Equipment Officer moves stock
--                    from here into the equipment room.
-- Bags are NOT tracked: once a member takes an item for a bag it has left
-- inventory (movement_type 'issue').
create type public.inventory_location as enum ('equipment_room', 'backstock');

-- Functionality of a lot. Consumables are always 'functional'; durable
-- equipment (BP cuffs, pulse oximeters...) can be flagged 'out_of_service'.
create type public.equipment_status as enum ('functional', 'out_of_service');

-- Why a member took items from the equipment room for a bag.
--   restock     = bag items were USED (e.g. on a call)
--   replacement = bag items were expired / broken / damaged / missing
create type public.submission_reason as enum ('restock', 'replacement');
create type public.submission_context as enum ('call', 'bag_check', 'other');
create type public.replacement_cause as enum ('expired', 'broken', 'damaged', 'missing', 'other');
create type public.submission_status as enum ('processed', 'flagged', 'reversed');

-- Every change to inventory_lots is written to the movement ledger.
--   receive        new stock entered (purchase/donation)
--   issue          taken from the equipment room by a member for a bag
--   transfer       moved between equipment_room <-> backstock
--   dispose        thrown away (expired, damaged, missing)
--   status_change  functional <-> out_of_service
--   adjust         manual count correction by an admin
create type public.movement_type as enum ('receive', 'issue', 'transfer', 'dispose', 'status_change', 'adjust');

create type public.alert_type as enum (
  'low_stock_room',            -- equipment room below par -> move next batch
  'low_stock_backstock',       -- backstock below minimum -> reorder
  'expiring_soon',
  'expired',
  'out_of_service',
  'fefo_violation',            -- room holds stock expiring later than backstock
  'stock_discrepancy',         -- member took more than records show in the room
  'broken_equipment_reported'  -- member replaced broken/damaged equipment
);
-- Who an alert is routed to by the notification dispatcher.
create type public.alert_audience as enum ('equipment_officer', 'all');
-- Declaration order matters: comparisons like severity > 'warning' rely on it.
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.alert_status as enum ('open', 'acknowledged', 'resolved');
create type public.notification_channel as enum ('email', 'sms');
create type public.notification_status as enum ('sent', 'failed', 'skipped');

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin identity
-- ---------------------------------------------------------------------------
-- The portal has ONE shared admin login (a Supabase Auth user). Its auth uid is
-- registered here. RLS checks membership in this table (via is_admin()) rather
-- than "any authenticated user", so an accidentally-created auth user gets no
-- access.
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  label      text not null default 'Shared admin account',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Settings (singleton row, id = 1)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id                       smallint primary key default 1 check (id = 1),
  org_name                 text not null default 'MERT',
  -- "2 months before expiration" warning window.
  expiration_warning_days  integer not null default 60 check (expiration_warning_days between 1 and 365),
  -- Alerts at/above this severity are also sent by SMS (email gets everything).
  sms_min_severity         public.alert_severity not null default 'critical',
  email_enabled            boolean not null default true,
  sms_enabled              boolean not null default true,
  updated_at               timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Secrets that must never be readable through the API (no RLS policies at all,
-- only SECURITY DEFINER functions touch it).
create table public.app_secrets (
  id               smallint primary key default 1 check (id = 1),
  member_pin_hash  text,             -- bcrypt hash of the shared member PIN
  updated_at       timestamptz not null default now()
);
insert into public.app_secrets (id) values (1);

-- Failed/successful PIN attempts, used for brute-force rate limiting.
create table public.pin_attempts (
  id            bigint generated always as identity primary key,
  client_hash   text not null,        -- sha256(ip + secret) computed server-side
  success       boolean not null,
  attempted_at  timestamptz not null default now()
);
create index pin_attempts_client_time_idx on public.pin_attempts (client_hash, attempted_at desc);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.item_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.items (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  category_id        uuid references public.item_categories (id) on delete set null,
  description        text,
  unit               text not null default 'each',           -- each, box, pair, pack...
  tracks_expiration  boolean not null default true,
  -- Durable equipment can be marked out of service instead of being disposed.
  is_equipment       boolean not null default false,
  -- Thresholds (all in `unit`s). 0 disables the corresponding alert.
  room_par_qty       integer not null default 0 check (room_par_qty >= 0),      -- equipment room: alert below par
  min_backstock_qty  integer not null default 0 check (min_backstock_qty >= 0), -- backstock: reorder below this
  -- Default cost; each received lot snapshots its own unit_cost.
  unit_cost          numeric(10, 2) check (unit_cost is null or unit_cost >= 0),
  vendor             text,
  vendor_sku         text,
  is_archived        boolean not null default false,       -- hidden from the member form
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index items_name_unique_idx on public.items (lower(name));
create index items_category_idx on public.items (category_id);

create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory lots
-- ---------------------------------------------------------------------------
-- A lot = a group of identical units of one item that share location, status,
-- expiration date and cost. Quantity on hand = sum of lot quantities.
-- Lots are written ONLY through the functions in migration 0200 so that every
-- change lands in inventory_movements.
create table public.inventory_lots (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.items (id) on delete restrict,
  location         public.inventory_location not null,
  status           public.equipment_status not null default 'functional',
  quantity         integer not null check (quantity >= 0),
  expiration_date  date,                       -- null = does not expire
  lot_number       text,
  received_on      date not null default current_date,
  unit_cost        numeric(10, 2) check (unit_cost is null or unit_cost >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index inventory_lots_fefo_idx
  on public.inventory_lots (item_id, location, status, expiration_date nulls last, received_on)
  where quantity > 0;
create index inventory_lots_expiration_idx on public.inventory_lots (expiration_date) where quantity > 0;

create trigger inventory_lots_updated_at before update on public.inventory_lots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Member submissions (the mobile form)
-- ---------------------------------------------------------------------------
create table public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  submitted_by_name  text not null check (length(trim(submitted_by_name)) between 1 and 120),
  reason             public.submission_reason not null,
  context            public.submission_context not null default 'call',
  call_reference     text,                 -- optional run/call number
  notes              text,
  status             public.submission_status not null default 'processed',
  processed_at       timestamptz,
  reversed_at        timestamptz,
  created_at         timestamptz not null default now()
);
create index submissions_created_idx on public.submissions (created_at desc);

create table public.submission_lines (
  id                 uuid primary key default gen_random_uuid(),
  submission_id      uuid not null references public.submissions (id) on delete cascade,
  item_id            uuid not null references public.items (id) on delete restrict,
  quantity           integer not null check (quantity > 0 and quantity <= 500),
  replacement_cause  public.replacement_cause,   -- required when reason = replacement
  -- Units the member took that the records say were NOT in the equipment
  -- room: the system count has drifted from reality (recount needed).
  discrepancy_qty    integer not null default 0 check (discrepancy_qty >= 0),
  created_at         timestamptz not null default now()
);
create index submission_lines_submission_idx on public.submission_lines (submission_id);
create index submission_lines_item_idx on public.submission_lines (item_id);

-- ---------------------------------------------------------------------------
-- Movement ledger (append-only; source of truth for analytics)
-- ---------------------------------------------------------------------------
create table public.inventory_movements (
  id                  bigint generated always as identity primary key,
  occurred_at         timestamptz not null default now(),
  item_id             uuid not null references public.items (id) on delete restrict,
  lot_id              uuid references public.inventory_lots (id) on delete set null,
  movement_type       public.movement_type not null,
  quantity            integer not null check (quantity <> 0),  -- positive except for 'adjust' (signed delta)
  from_location       public.inventory_location,
  to_location         public.inventory_location,
  from_status         public.equipment_status,
  to_status           public.equipment_status,
  unit_cost           numeric(10, 2),          -- snapshot at time of movement
  expiration_date     date,                    -- snapshot of the lot's expiry
  submission_id       uuid references public.submissions (id) on delete set null,
  submission_line_id  uuid references public.submission_lines (id) on delete set null,
  reason              text,
  actor               text not null            -- 'admin', 'member:<name>', 'system'
);
create index inventory_movements_item_time_idx on public.inventory_movements (item_id, occurred_at desc);
create index inventory_movements_type_time_idx on public.inventory_movements (movement_type, occurred_at desc);
create index inventory_movements_submission_idx on public.inventory_movements (submission_id);

-- ---------------------------------------------------------------------------
-- Alerts & notifications
-- ---------------------------------------------------------------------------
create table public.alerts (
  id                      uuid primary key default gen_random_uuid(),
  alert_type              public.alert_type not null,
  severity                public.alert_severity not null,
  status                  public.alert_status not null default 'open',
  audience                public.alert_audience not null default 'equipment_officer',
  item_id                 uuid references public.items (id) on delete cascade,
  lot_id                  uuid references public.inventory_lots (id) on delete cascade,
  submission_id           uuid references public.submissions (id) on delete cascade,
  title                   text not null,
  message                 text not null,
  -- Stable identity of the underlying condition, e.g. 'low_room:<item_id>'.
  -- Only one non-resolved alert may exist per key (see partial index).
  dedupe_key              text not null,
  first_detected_at       timestamptz not null default now(),
  last_detected_at        timestamptz not null default now(),
  acknowledged_at         timestamptz,
  resolved_at             timestamptz,
  -- Highest severity we have already notified recipients about. The dispatcher
  -- re-notifies when severity escalates above this.
  last_notified_severity  public.alert_severity,
  last_notified_at        timestamptz
);
create unique index alerts_open_dedupe_idx on public.alerts (dedupe_key) where status <> 'resolved';
create index alerts_status_idx on public.alerts (status, severity desc, first_detected_at desc);

create table public.alert_recipients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null default 'board' check (role in ('equipment_officer', 'board', 'other')),
  email         text,
  phone_e164    text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  notify_email  boolean not null default true,
  notify_sms    boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (email is not null or phone_e164 is not null)
);
create trigger alert_recipients_updated_at before update on public.alert_recipients
  for each row execute function public.set_updated_at();

create table public.notification_log (
  id            bigint generated always as identity primary key,
  channel       public.notification_channel not null,
  recipient_id  uuid references public.alert_recipients (id) on delete set null,
  destination   text not null,
  subject       text,
  body          text not null,
  alert_ids     uuid[] not null default '{}',
  status        public.notification_status not null,
  error         text,
  created_at    timestamptz not null default now()
);
create index notification_log_created_idx on public.notification_log (created_at desc);
