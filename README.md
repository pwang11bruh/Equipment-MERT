# MERT Equipment Portal

A mobile-friendly web portal for managing MERT (Medical Emergency Response Team) equipment bags:
- members log restocks and replacements with a shared PIN
- admins get a live inventory with FEFO (first-expired-first-out) tracking
- expiration and low-stock alerts go out by email, SMS and in-app
- usage and spend analytics

**Stack:** Next.js 15 · React 19 · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth, RLS) · Resend · Twilio · Vercel

## Quick start
```sh
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"   # if Node 22 came from Homebrew
npm install
cp .env.example .env.local      # fill in (docs/operations/ENVIRONMENT.md)
npm run db:start && npm run db:reset   # local Supabase (needs Docker)
npm run dev
```

## Documentation
Everything lives in **[docs/](docs/README.md)**. Start with [docs/STATUS.md](docs/STATUS.md).
