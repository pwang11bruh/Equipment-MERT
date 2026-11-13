# Project Status

**Last updated:** 2026-11-13
**Current phase:** Phases 1–5 are built. Phase 4 email and SMS are waiting on owner accounts (Resend, Twilio). Next: deploy (GitHub, then Vercel).

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

- **Phase 3 is built:** dashboard, inventory (A–Z, filters, bulk pars), item page (batches, receive, move next batch, batch actions, FEFO swap, settings, history), new item, alerts inbox, submissions log, and full settings (PIN, recipients, alert options). Migration 0500 (`admin_move_next_batch`) is pushed.
  - Verified: typecheck, lint and build pass, and every page query runs against the live DB.
  - Not yet verified: click-through as the admin. The agent can't sign in, because the admin password is known only to the owner.

- **Phase 4 (notifications) is built:**
  - the provider wrappers
  - the urgent/digest dispatcher
  - `/api/cron/daily`, tested: 401 without the secret; with it, it refreshes alerts and logs "skipped" sends because no providers are configured
  - `vercel.json` cron
  - Settings provider status and "send test"
- **Phase 5 (reports) is built:** `/admin/reports` (charts verified visually with sample data in headless Chrome), the per-item table, and CSV exports. `/api/export/*` returns 401 without admin.
- **Fixed:** the app-wide serif font bug (Geist variables moved to `<html>`).

### Pending
- The member PIN is not set yet. Until it is, `verify_member_pin` always fails. The owner will set it from the admin Settings page (Phase 3), or we add a minimal settings page earlier.
- **Catalog:** migration 0400 is **pushed to the hosted project** and verified: 115 items in 10 categories. All par and minimum thresholds are 0 (alerts off) until the owner sets them in the admin UI. No stock (lots) has been entered yet.

### Not done yet
- Notification dispatch (Resend/Twilio) and `/api/cron/daily` are not built.
- There is no git remote (GitHub) yet; Vercel deployment will need one.

## Next up
1. **Owner:** publish to GitHub (VS Code → Source Control → Publish Branch, private). Then Vercel: import the repo, paste `.env.vercel`, deploy, and set `NEXT_PUBLIC_APP_URL`. See DEPLOYMENT.md §2–3.
2. **Owner:** Resend in test mode (DEPLOYMENT.md §4). It only delivers to the Resend sign-up address until a domain is verified.
3. **Owner:** enter real stock and pars; clear test submissions before go-live.
4. **Later:** a domain for Resend (to email the whole board) and Twilio (texts).
5. **Hardening (Phase 6):** a committed SQL test script, Playwright e2e, a submission-reversal RPC, and a PWA manifest.

## Known issues / caveats
- **Shared admin account:** the audit trail cannot distinguish which admin acted; the ledger `actor` is always `'admin'`. This is accepted per the owner's decision (ADR-002).
- **Units-issued assumption:** `process_submission` assumes members took the earliest-expiring room units. This normally holds because the room only holds the earliest batch, unless the room has two batches after a partial refill. Periodic counts with `admin_adjust_lot` correct any drift.
- **FEFO rebalance tie-break:** when room and backstock lots share the same expiration date, the tie is broken by received date, so it may write a no-op-looking swap between equal-dated lots. This is harmless.
- **Vercel Hobby cron frequency:** Vercel Hobby cron runs at most once a day. That is fine for the daily digest. Immediate critical alerts will be sent inline after a submission (Phase 4).
- **Notification log grows daily while providers are unset:** each run logs `skipped` rows for pending alerts. This is harmless; consider pruning once providers are live.
- **Local Docker:** not installed. Local SQL testing uses Homebrew `postgresql@17` (BUSINESS_LOGIC.md §7).
