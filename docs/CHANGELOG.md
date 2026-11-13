# Changelog

Newest first. Format: `YYYY-MM-DD: summary (area)`.

## 2026-11-13
- Migration 0400 adds the real catalog from the owner's bag-check form: 115 items in 10 type-based categories, with no thresholds yet. The expiry date on receive is now optional, for items that expire only for some brands. The seed now uses real item names (db).
- Shared admin `mertadmin@mert.local` registered in `admin_users`; public sign-ups confirmed disabled; ADR-009 username login (ops).
- Hosted Supabase project `szaapavpgjrtatfmpuug` linked and migrations pushed. Generated `src/types/database.ts`; Supabase clients are now typed (ops/app).
- Equipment Room low-stock alerts (`low_stock_room`) now notify the Equipment Officer and the board (`audience = 'all'`) (db).
- Storage model changed to Equipment Room + locked Backstock (ADR-008). Members issue from the room; the officer gets a "move next batch" alert; FEFO is enforced on room transfers; alerts gained an `audience` column. Migrations 0100/0200 were edited in place, since none had been applied anywhere yet (db).
- Project scaffolded: Next.js 15, Tailwind v4, shadcn/ui and Supabase CLI config (setup).
- Added the core schema, inventory logic and security migrations, plus the dev seed (db).
- Added Supabase clients, admin middleware, the member PIN session cookie and env validation (app).
- Created the documentation system under `docs/` and `CLAUDE.md` (docs).
