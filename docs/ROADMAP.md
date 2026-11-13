# Roadmap

Tick each box when it is done, in the same change as the code, and keep [STATUS.md](STATUS.md) in sync.

## Phase 1: Foundation ✅
- [x] Scaffold Next.js 15, TypeScript, Tailwind v4 and shadcn/ui
- [x] Supabase project config (`supabase/config.toml`, public signups disabled)
- [x] Core schema: catalog, lots, submissions, movement ledger, alerts, recipients, notification log
- [x] FEFO views and rebalance RPC
- [x] `process_submission`: FEFO issue from the equipment room, with discrepancy flags
- [x] Alerts engine: equipment room below par ("move next batch"), low backstock (reorder), expiring within 60 days, expired, out of service, FEFO violation, stock discrepancy, broken equipment reported
- [x] Equipment Room / Backstock model with FEFO enforced on transfers (ADR-008)
- [x] RLS and grants; shared-PIN verification with rate limiting
- [x] Supabase clients, middleware, member session cookie, env validation
- [x] Documentation system (`docs/`, `CLAUDE.md`)

## Phase 2: Member submission portal (mobile)
- [x] `/submit` PIN gate page and server action
- [x] Submission form (zod; plain React state, not React Hook Form): a **single A–Z list of all items with a search box** (ADR-010) and quantity steppers
- [x] Server action that calls `process_submission`
- [x] Confirmation screen with discrepancy messaging
- [x] "Lock" button and session expiry handling
- [ ] Real-device test on iOS Safari and Android Chrome
- [ ] PWA manifest and icons ("Add to Home Screen")

## Phase 3: Admin portal
- [x] `/admin/login` (username + password; username → `<name>@mert.local`, ADR-009)
- [x] Admin layout with nav, guarded by `isAdminRequest()`
- [x] Dashboard: KPIs, setup checklist, open alerts, recent submissions
- [x] Inventory: A–Z stock table with search, filter chips and bulk "Edit pars & minimums"; item page with FEFO-ranked batches and expiry badges
- [x] Batch actions: receive (expiry or "no expiry"), "Move next batch" (`admin_move_next_batch`, migration 0500), move between locations, mark out-of-service or functional, dispose, correct count, "I swapped them" (FEFO rebalance)
- [x] Item catalog: create, edit and archive (thresholds, unit cost, vendor, member hint, flags)
- [x] Submissions log with a flagged filter and pagination
- [x] Alerts inbox: open / acknowledged / resolved tabs, bulk acknowledge and resolve, re-check now
- [x] Settings: member PIN, expiration warning days, SMS threshold, email/SMS toggles, alert recipients CRUD
- [ ] Owner click-through test of every admin action (agent can't sign in: no access to the admin password)

## Phase 4: Notifications
- [ ] `src/lib/notifications/{email,sms,dispatch}.ts` (Resend, Twilio)
- [ ] `/api/cron/daily`: `refresh_alerts`, then a digest email per recipient (routed by `alerts.audience`) and SMS for alerts at or above `sms_min_severity`; update `last_notified_*`; write to `notification_log`
- [ ] Immediate dispatch of critical alerts after a submission (`after()` in the server action)
- [ ] `vercel.json` cron schedule

## Phase 5: Reporting & analytics
- [ ] Usage trends chart (issued per month and per item/category; restock vs replacement)
- [ ] Restock frequency: member submissions and officer room refills per item per month
- [ ] Spend analysis: purchases, issued cost and waste (expired/broken/damaged) cost
- [ ] CSV export for inventory, movements and usage

## Phase 6: Deploy & hardening
- [ ] Create the production Supabase project; `supabase db push`
- [x] Bootstrap the shared admin user (`mertadmin`)
- [ ] Set the production member PIN
- [ ] Deploy to Vercel with env vars and cron
- [ ] Automated tests for the SQL logic (pgTAP or a script) and e2e tests (Playwright) for the submit flow
- [ ] Submission reversal RPC (undo a mistaken submission)

## Ideas / later
- QR codes on backstock shelves that deep-link to `/submit?item=<id>`
- Barcode scanning for receiving stock
- Realtime dashboard updates via Supabase Realtime
