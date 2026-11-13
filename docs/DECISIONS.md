# Architecture Decision Records

Add new ADRs at the bottom and never delete old ones. If a decision is reversed, mark the old ADR "Superseded by ADR-XXX".

---

## ADR-001: Stack is Next.js App Router + shadcn/ui + Supabase, deployed on Vercel
**Date:** 2026-11-13 · **Status:** Accepted
The owner chose this stack. Supabase provides Postgres, Auth and RLS. Vercel
hosts Next.js and provides cron. Business logic lives in **Postgres functions**
so that inventory invariants hold regardless of which client calls them.

## ADR-002: One shared admin account plus a shared member PIN
**Date:** 2026-11-13 · **Status:** Accepted (owner decision)
- Admins share a single Supabase Auth user, registered in `admin_users`. RLS checks `is_admin()` rather than "any authenticated user", so a stray auth user gets no access. Public signups are disabled.
- Members never authenticate with Supabase. They enter a shared numeric PIN, and the server verifies it via `verify_member_pin`, which stores a bcrypt hash and rate-limits attempts. On success the server sets an HMAC-signed httpOnly cookie. Submissions are written via the service-role key with `process_submission`.
- **Tradeoff:** there is no per-admin audit trail. Member identity is whatever name the member types. Accepted for simplicity.

## ADR-003: Location is only `active` or `backstock`; bags are not modelled
**Date:** 2026-11-13 · **Status:** Superseded by ADR-008
The owner said bags don't matter for inventory. All units in any bag count as `active`, and par and minimums are totals across all bags.

## ADR-004: Lot-based inventory with an append-only movement ledger
**Date:** 2026-11-13 · **Status:** Accepted
Quantities live on `inventory_lots`, where a lot is one item with one location, status, expiry and cost. Lots are needed for FEFO and expiry alerts.
Every change goes through `_lot_move`, `_add_to_lot` or the admin RPCs, which write to `inventory_movements`. The API cannot write lots directly.
The ledger is the single source for analytics: usage, restock frequency and spend.

## ADR-005: Alerts are rows; notifications are dispatched by the app
**Date:** 2026-11-13 · **Status:** Accepted
`_refresh_alerts()` is idempotent and condition-based. It upserts by `dedupe_key`, re-opens acknowledged alerts when their severity escalates, and auto-resolves alerts whose condition has cleared.
Sending email (Resend) and SMS (Twilio) happens in Next.js, not in the database. This keeps provider secrets out of Postgres and makes failures visible in `notification_log`.
The dispatcher notifies when `last_notified_severity` is null or lower than the current severity, so the same condition is not spammed daily. Severity routing:
- `info`: in-app only
- `warning`: email
- at or above `sms_min_severity` (default `critical`): email and SMS

## ADR-006: Submissions auto-apply FEFO; a physical swap is confirmed by an admin
**Date:** 2026-11-13 · **Status:** Accepted
Member submissions are applied immediately, with no approval queue, so inventory stays live:
- Items are issued from the equipment room in FEFO order (see ADR-008).
- Problems flag the submission and raise an alert.

When backstock holds stock that expires sooner than what is in the equipment room, the system raises a `fefo_violation` alert but **does not move records on its own**, because nothing has physically moved yet. After physically swapping the units, the Equipment Officer presses "Mark swapped", which calls `admin_fefo_rebalance`.

## ADR-007: Expiration warning window is a setting (default 60 days)
**Date:** 2026-11-13 · **Status:** Accepted
"2 months before expiration" is implemented as `app_settings.expiration_warning_days = 60` so it can be tuned without a migration.

## ADR-008: Equipment Room + locked Backstock; bags leave inventory
**Date:** 2026-11-13 · **Status:** Accepted (owner decision; supersedes ADR-003)
The locations are `equipment_room` and `backstock`.
- **Equipment room.** This is the accessible pool members restock their bags from. It must hold only the earliest-expiring batch(es).
- **Backstock.** This is a locked reserve. Members cannot see it or draw from it; only the Equipment Officer moves stock out of it.

How it works:
- A member submission **issues** items from the equipment room. They leave inventory, because bags are not tracked.
- When the room drops below `room_par_qty`, the Equipment Officer gets: *"Equipment Room X is low. Move next batch (Exp: D) from Backstock."*
- FEFO is enforced when stock goes into the room (`_assert_room_fefo`).

Consequences:
- **No member-side shortfall.** Members cannot take from backstock. If they take more than the records show in the room, that is a *discrepancy*, which means a recount is needed.
- **Broken equipment.** A broken item replaced from a bag was never in inventory, so it raises an informational alert instead of creating an out-of-service lot.
- **Routing.** Alerts carry an `audience`. Operational alerts go to the Equipment Officer; reorder (low backstock) alerts go to the officer and the board.
- **Migrations.** The original 0100/0200 migrations were edited in place for this change rather than amended, because they had never been applied to any shared environment.
