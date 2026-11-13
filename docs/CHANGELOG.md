# Changelog

Newest first. Format: `YYYY-MM-DD: summary (area)`.

## 2026-11-13
- Phase 4: Resend/Twilio providers, urgent and digest alert dispatch, `/api/cron/daily`, `vercel.json` cron, and Settings provider status plus "send test" (app).
- Phase 5: `/admin/reports` (charts, per-item table) and CSV exports (app).
- Fix: the app font fell back to serif because the Geist CSS variables were scoped to `<body>`; they are now on `<html>` (app).
- Phase 3: admin dashboard, inventory, item detail with batch actions, new item, alerts inbox, submissions log, and full settings. Migration 0500 `admin_move_next_batch` was added and pushed (app/db).
- Phase 2: the `/submit` member flow (PIN gate, A–Z search picker with synonyms, steppers, replacement causes, success and discrepancy messaging, lock); admin username login; protected admin layout; placeholder dashboard; Settings → member PIN (app).
- Migration 0400 pushed to the hosted project; the catalog is live (ops).
- Decision: the member form shows one A–Z list of all items with a search box, without category grouping (ADR-010) (product).
- Categories and items are displayed alphabetically (owner request). The migration 0400 category `sort_order` was reassigned A–Z, and the convention is documented in OVERVIEW (app/docs).
- Migration 0400 adds the real catalog from the owner's bag-check form: 115 items in 10 type-based categories, with no thresholds yet. The expiry date on receive is now optional, for items that expire only for some brands. The seed now uses real item names (db).
- Shared admin `mertadmin@mert.local` registered in `admin_users`; public sign-ups confirmed disabled; ADR-009 username login (ops).
- Hosted Supabase project `szaapavpgjrtatfmpuug` linked and migrations pushed. Generated `src/types/database.ts`; Supabase clients are now typed (ops/app).
- Equipment Room low-stock alerts (`low_stock_room`) now notify the Equipment Officer and the board (`audience = 'all'`) (db).
- Storage model changed to Equipment Room + locked Backstock (ADR-008). Members issue from the room; the officer gets a "move next batch" alert; FEFO is enforced on room transfers; alerts gained an `audience` column. Migrations 0100/0200 were edited in place, since none had been applied anywhere yet (db).
- Project scaffolded: Next.js 15, Tailwind v4, shadcn/ui and Supabase CLI config (setup).
- Added the core schema, inventory logic and security migrations, plus the dev seed (db).
- Added Supabase clients, admin middleware, the member PIN session cookie and env validation (app).
- Created the documentation system under `docs/` and `CLAUDE.md` (docs).
