# Project Status

**Last updated:** 2026-11-13
**Current phase:** Phase 2 (member submission portal) is ✅ built and waiting on owner testing. Phase 3 (admin portal) is next.

## Current state

### Done
- The Next.js 15 (App Router, TypeScript, Turbopack) app is scaffolded with Tailwind v4 and shadcn/ui (radix-nova style). Installed components: button, card, input, label, select, textarea, badge, table, tabs, dialog, sonner, separator, alert.
- **Storage model (ADR-008):**
  - The **Equipment Room** is the member-accessible pool; FEFO is enforced so only the earliest-expiring batch goes in.
  - **Backstock** is the locked reserve.
  - Members' submissions *issue* items from the room.
  - Below par, the Equipment Officer and the board get *"Equipment Room X is low. Move next batch (Exp: D) from Backstock."*
- **Database schema is complete and tested** (`supabase/migrations/`):
  - `0100_core_schema`: enums, tables and indexes.
  - `0200_inventory_logic`: views, lot primitives, `process_submission`, the admin RPCs (FEFO-gated transfers), the alerts engine with audience routing, and the PIN verification.
  - `0300_security`: RLS and grants.
  - `seed.sql`: 20 sample items, lots set up to trigger every alert type, dev PIN `1234`, and dev admin `admin@mert.local` / `mert-admin-dev`.
- The migrations were verified against a plain Postgres 17 with stubbed Supabase auth and roles. Checked so far:
  - Issuing from the room
  - The "move next batch" message, and the "no usable backstock, reorder" variant
  - Discrepancy flags
  - The broken-equipment alert
  - The FEFO gate rejecting a later batch
  - FEFO rebalance
  - Auto-resolve
  - PIN rate limiting
  - RLS isolation
- Server plumbing is in place:
  - Supabase clients: `src/lib/supabase/{server,client,service,middleware}.ts`.
  - `src/middleware.ts` guards `/admin/*`.
  - Signed member PIN cookie: `src/lib/member-session.ts`.
  - Typed env: `src/lib/env.ts`.
  - Domain types: `src/types/domain.ts`.
- A git repository is initialised and the foundation is committed on `main`.
- `npm run typecheck`, `npm run lint` and `npm run build` all pass.

- **Hosted Supabase:** project `MERT Equipment`, ref `szaapavpgjrtatfmpuug`, us-east-1.
  - It is linked, and migrations 0100–0300 are pushed.
  - `.env.local` has the URL and keys, plus the CLI token and DB password, all gitignored.
  - The live check passed: anon is denied on tables, views and RPCs; the service role works.
- `src/types/database.ts` is generated from the live project, and all Supabase clients are typed with `Database`.

- **Admin account bootstrapped:** auth user `mertadmin@mert.local` (confirmed) is registered in `admin_users`. Admins log in with the username **`mertadmin`** (ADR-009).
- Public sign-ups are **disabled** on the hosted project (verified via the Management API: `disable_signup = true`).

- **Phase 2 is built:** `/submit` (PIN gate, A–Z list with search, restock/replacement, steppers, success screen, lock); `/admin/login` (username `mertadmin`); the protected admin layout; a placeholder dashboard; and Settings → member PIN.
  - Smoke-tested against the live project: routes and redirects work, the catalog renders (115 items A–Z) only behind a valid PIN cookie, no stock fields reach members, and a tampered cookie is rejected.
  - Not yet tested: an end-to-end real submission (it would write to the live DB) and real phones.

### Pending
- The member PIN is not set yet. Until it is, `verify_member_pin` always fails. The owner will set it from the admin Settings page (Phase 3), or we add a minimal settings page earlier.
- **Catalog:** migration 0400 is **pushed to the hosted project** and verified: 115 items in 10 categories. All par and minimum thresholds are 0 (alerts off) until the owner sets them in the admin UI. No stock (lots) has been entered yet.

### Not done yet
- Notification dispatch (Resend/Twilio) and `/api/cron/daily` are not built.
- There is no git remote (GitHub) yet; Vercel deployment will need one.

## Next up
1. **Owner:** sign in at `/admin/login` as `mertadmin` and set the member PIN under Settings.
2. **Owner:** try `/submit` on a phone. Until stock is entered, every submission is flagged with a "recount" alert, because the Equipment Room is empty in the records.
3. **Phase 3 (admin portal):**
   - inventory table
   - receive stock, with expiry or a "no expiry" checkbox
   - the "Move next batch to Equipment Room" action
   - par and minimum editing per item
   - alerts inbox (acknowledge / resolve)
   - submissions log
   Initial stock counts can then be entered.
4. Deploy to Vercel (needs a GitHub repo) so phones can reach it outside `localhost`.

## Known issues / caveats
- **Shared admin account:** the audit trail cannot distinguish which admin acted; the ledger `actor` is always `'admin'`. This is accepted per the owner's decision (ADR-002).
- **Units-issued assumption:** `process_submission` assumes members took the earliest-expiring room units. This normally holds because the room only holds the earliest batch, unless the room has two batches after a partial refill. Periodic counts with `admin_adjust_lot` correct any drift.
- **FEFO rebalance tie-break:** when room and backstock lots share the same expiration date, the tie is broken by received date, so it may write a no-op-looking swap between equal-dated lots. This is harmless.
- **Vercel Hobby cron frequency:** Vercel Hobby cron runs at most once a day. That is fine for the daily digest. Immediate critical alerts will be sent inline after a submission (Phase 4).
- **Local Docker:** not installed. Local SQL testing uses Homebrew `postgresql@17` (BUSINESS_LOGIC.md §7).
