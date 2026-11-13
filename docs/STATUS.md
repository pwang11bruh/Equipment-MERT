# Project Status

**Last updated:** 2026-11-13
**Current phase:** Phase 1 (foundation) is ✅ complete. The hosted Supabase project is being set up. Phase 2 (member submission portal) is next.

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

### In progress
- **Hosted Supabase project.** The owner chose a hosted project over local Docker. Steps are in operations/DEPLOYMENT.md §1: log in to the CLI, create the project, link, `db push`, bootstrap the admin, set the PIN, and fill `.env.local`.

### Not done yet
- `src/types/database.ts` (generated types) does not exist yet. Once linked, run `npx supabase gen types typescript --linked > src/types/database.ts`.
- None of the UI routes exist yet except the placeholder landing page: no `/submit`, no `/admin/*`.
- Notification dispatch (Resend/Twilio) and `/api/cron/daily` are not built.
- There is no git remote (GitHub) yet; Vercel deployment will need one.

## Next up (Phase 2: member submission portal)
1. `/submit` page: PIN gate (server action → `verify_member_pin` → `startMemberSession`).
2. Mobile form with these fields:
   - name
   - reason (restock / replacement)
   - context (call / bag check / other)
   - optional call #
   - a multi-line item picker grouped by category, with quantity steppers
   - a cause per line when the reason is replacement
3. A server action that validates the input with zod, checks `hasMemberSession()`, and calls `process_submission` via the service client.
4. A success screen. Members never see stock counts. If the result is `flagged` (a discrepancy), say thanks and that the Equipment Officer has been notified.

See [ROADMAP.md](ROADMAP.md) for the later phases.

## Known issues / caveats
- **Shared admin account:** the audit trail cannot distinguish which admin acted; the ledger `actor` is always `'admin'`. This is accepted per the owner's decision (ADR-002).
- **Units-issued assumption:** `process_submission` assumes members took the earliest-expiring room units. This normally holds because the room only holds the earliest batch, unless the room has two batches after a partial refill. Periodic counts with `admin_adjust_lot` correct any drift.
- **FEFO rebalance tie-break:** when room and backstock lots share the same expiration date, the tie is broken by received date, so it may write a no-op-looking swap between equal-dated lots. This is harmless.
- **Vercel Hobby cron frequency:** Vercel Hobby cron runs at most once a day. That is fine for the daily digest. Immediate critical alerts will be sent inline after a submission (Phase 4).
- **Local Docker:** not installed. Local SQL testing uses Homebrew `postgresql@17` (BUSINESS_LOGIC.md §7).
