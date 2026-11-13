# Changelog

Newest first. Format: `YYYY-MM-DD: summary (area)`.

## 2026-11-13
- Storage model changed to Equipment Room + locked Backstock (ADR-008). Members issue from the room; the officer gets a "move next batch" alert; FEFO is enforced on room transfers; alerts gained an `audience` column. Migrations 0100/0200 were edited in place, since none had been applied anywhere yet (db).
- Project scaffolded: Next.js 15, Tailwind v4, shadcn/ui and Supabase CLI config (setup).
- Added the core schema, inventory logic and security migrations, plus the dev seed (db).
- Added Supabase clients, admin middleware, the member PIN session cookie and env validation (app).
- Created the documentation system under `docs/` and `CLAUDE.md` (docs).
