# Local Development

## Prerequisites
- **Node 22 LTS.** On the owner's Mac it was installed with `brew install node@22`, which is keg-only, so add it to your PATH:
  ```sh
  echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
  ```
- **Docker Desktop** is needed only for the full local Supabase stack. It is not installed yet as of 2026-11-13.
- The Supabase CLI is a dev dependency (`npx supabase …`), so there is no global install.

## Option A: full local stack (recommended once Docker is installed)
```sh
npm install
npm run db:start          # starts Postgres/Auth/Studio and prints the URL + anon + service_role keys
npm run db:reset          # applies supabase/migrations/* then supabase/seed.sql
cp .env.example .env.local  # paste the keys from db:start; generate secrets (see ENVIRONMENT.md)
npm run db:types          # generate src/types/database.ts
npm run dev               # http://localhost:3000
```
- Studio: http://127.0.0.1:54323
- Dev admin login: `admin@mert.local` / `mert-admin-dev`
- Dev member PIN: `1234`

## Option B: use a hosted Supabase dev project (no Docker)
```sh
set -a; source .env.local; set +a   # SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD
npx supabase link --project-ref <ref>
npx supabase db push --remote       # apply migrations
# seed.sql is NOT applied by db push; for sample data run it in the SQL editor
```
Then fill `.env.local` with that project's URL and keys.

## Option C: just test SQL (no Docker, no Supabase)
See database/BUSINESS_LOGIC.md §7. This uses Homebrew `postgresql@17` with a stubbed `auth` schema.

## Everyday commands
| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run typecheck` / `npm run lint` / `npm run build` | Quality gates; all three must pass before you finish a task |
| `npm run db:new <name>` | Create a new timestamped migration |
| `npm run db:reset` | Rebuild the local DB from migrations and seed |
| `npm run db:push` | Push new migrations to the linked hosted project (needs `.env.local` sourced) |
| `npm run db:types` | Regenerate `src/types/database.ts` from the linked project (`db:types:local` for Docker) |
| `npx shadcn@latest add <component>` | Add a shadcn/ui component |
