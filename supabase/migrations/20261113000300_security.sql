-- =============================================================================
-- MERT Equipment Portal — Security: RLS policies & grants
-- -----------------------------------------------------------------------------
-- Access model (see docs/architecture/SECURITY.md):
--   anon           -> NOTHING. Members never talk to Supabase directly; the
--                     Next.js server verifies the PIN and calls
--                     process_submission() with the service_role key.
--   authenticated  -> only rows/RPCs gated by is_admin() (the single shared
--                     admin account registered in admin_users).
--   service_role   -> server-side only (route handlers, cron).
-- Inventory tables are READ-ONLY for the admin through the API; all writes go
-- through SECURITY DEFINER RPCs so the movement ledger stays complete.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Functions: nothing is executable by API roles unless granted below.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.refresh_alerts() to authenticated, service_role;
grant execute on function public.admin_set_member_pin(text) to authenticated;
grant execute on function public.admin_receive_stock(uuid, integer, public.inventory_location, date, text, numeric, date, text) to authenticated;
grant execute on function public.admin_transfer_lot(uuid, integer, public.inventory_location, text) to authenticated;
grant execute on function public.admin_set_lot_status(uuid, integer, public.equipment_status, text) to authenticated;
grant execute on function public.admin_dispose_lot(uuid, integer, text) to authenticated;
grant execute on function public.admin_adjust_lot(uuid, integer, text) to authenticated;
grant execute on function public.admin_fefo_rebalance(uuid) to authenticated;

-- Server-only entry points.
grant execute on function public.verify_member_pin(text, text) to service_role;
grant execute on function public.process_submission(text, public.submission_reason, public.submission_context, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Tables: anon gets nothing at all (defence in depth on top of RLS).
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- Secrets & rate-limit log: no API role may touch them.
revoke all on public.app_secrets from authenticated;
revoke all on public.pin_attempts from authenticated;

-- Ledger-backed tables: admin reads, RPCs write.
revoke insert, update, delete on public.inventory_lots from authenticated;
revoke insert, update, delete on public.inventory_movements from authenticated;
revoke insert, update, delete on public.submissions from authenticated;
revoke insert, update, delete on public.submission_lines from authenticated;
revoke insert, update, delete on public.notification_log from authenticated;
revoke insert, update, delete on public.admin_users from authenticated;

-- Alerts: admin may only change workflow columns (acknowledge / resolve).
revoke insert, update, delete on public.alerts from authenticated;
grant update (status, acknowledged_at, resolved_at) on public.alerts to authenticated;

-- Settings: single row, admin may update but not insert/delete.
revoke insert, delete on public.app_settings from authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admin_users          enable row level security;
alter table public.app_settings         enable row level security;
alter table public.app_secrets          enable row level security;
alter table public.pin_attempts         enable row level security;
alter table public.item_categories      enable row level security;
alter table public.items                enable row level security;
alter table public.inventory_lots       enable row level security;
alter table public.submissions          enable row level security;
alter table public.submission_lines     enable row level security;
alter table public.inventory_movements  enable row level security;
alter table public.alerts               enable row level security;
alter table public.alert_recipients     enable row level security;
alter table public.notification_log     enable row level security;

-- app_secrets, pin_attempts: RLS on with NO policies => no API access.

create policy "admin reads own row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create policy "admin reads settings" on public.app_settings
  for select to authenticated using ((select public.is_admin()));
create policy "admin updates settings" on public.app_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Catalog & recipients: full CRUD for the admin.
create policy "admin manages categories" on public.item_categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages items" on public.items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages recipients" on public.alert_recipients
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Read-only (writes via RPC).
create policy "admin reads lots" on public.inventory_lots
  for select to authenticated using ((select public.is_admin()));
create policy "admin reads movements" on public.inventory_movements
  for select to authenticated using ((select public.is_admin()));
create policy "admin reads submissions" on public.submissions
  for select to authenticated using ((select public.is_admin()));
create policy "admin reads submission lines" on public.submission_lines
  for select to authenticated using ((select public.is_admin()));
create policy "admin reads notification log" on public.notification_log
  for select to authenticated using ((select public.is_admin()));

create policy "admin reads alerts" on public.alerts
  for select to authenticated using ((select public.is_admin()));
create policy "admin updates alerts" on public.alerts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
