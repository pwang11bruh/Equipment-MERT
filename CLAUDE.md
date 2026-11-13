# CLAUDE.md: agent instructions for the MERT Equipment Portal

This is a mobile-friendly inventory portal for a Medical Emergency Response Team.
Stack: Next.js 15 (App Router) + shadcn/ui + Tailwind v4 + Supabase.

## Before you do anything
1. Read `docs/README.md`, then `docs/STATUS.md`. They tell you where the project is and what's next.
2. Read the docs relevant to your task: the schema, business logic, security or architecture overview.

## Hard rules
- **Inventory math lives in SQL.** Never change `inventory_lots` quantities from TypeScript. Call the RPCs (`process_submission`, `admin_*`). Every change must land in `inventory_movements`.
- **Migrations are immutable.** To change the schema, add a new one with `npm run db:new <name>`. Any new function must be explicitly `grant execute`d (functions are deny-by-default).
- **Members never see stock.** Anything reachable without the admin login must not expose quantities.
- **The service-role client** (`src/lib/supabase/service.ts`) is only for the uses listed in that file and in `docs/architecture/SECURITY.md`.
- **Quality gates:** `npm run typecheck && npm run lint && npm run build` must pass before you finish.
- **Node** is Homebrew keg-only: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`.

## Keep the docs alive (mandatory)
Follow the maintenance protocol in `docs/README.md`. At minimum, every session that changes code must:
- update `docs/STATUS.md` (Last updated, Current state, Next up, Known issues)
- tick items in `docs/ROADMAP.md`
- add a line to `docs/CHANGELOG.md`
- update the schema, logic or security docs for any SQL change, and `src/types/domain.ts` for any type change
- add an ADR to `docs/DECISIONS.md` for any non-obvious choice
