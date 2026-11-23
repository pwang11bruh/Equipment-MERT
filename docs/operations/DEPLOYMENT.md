# Deployment

Target: **Supabase Cloud** (database and auth) plus **Vercel** (Next.js and cron).
Status as of 2026-11-13:
- **Supabase project:** `MERT Equipment`, ref `szaapavpgjrtatfmpuug`, region us-east-1, URL `https://szaapavpgjrtatfmpuug.supabase.co`.
  - ✅ Linked and migrations 0100–0300 pushed.
  - ✅ API keys are in `.env.local`.
  - ✅ Live RLS check passed: anon is denied on tables, views and RPCs.
  - ✅ Admin bootstrapped: `mertadmin@mert.local` (login username `mertadmin`) is in `admin_users`.
  - ✅ Public sign-ups are disabled.
  - ✅ Migration 0400 (catalog, 115 items) pushed.
  - ⏳ Member PIN, thresholds and initial stock counts are still to do.
- **GitHub:** `pwang11bruh/Equipment-MERT` (private). **Vercel:** project `equipment-mert`, live at **https://equipment-mert.vercel.app**. It auto-deploys on every push to `main`. All 6 required env vars are set (verified 2026-11-23 via `/api/health`). ⏳ `NEXT_PUBLIC_APP_URL` still needs adding.
- **Resend:** test mode chosen (no domain yet). **Twilio:** deferred (email-only).

Update this file as each step is done.

## 1. Supabase project
1. Create a project at supabase.com. Pick the region closest to your users and save the DB password in a password manager.
2. Link and push the migrations. Set `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in `.env.local` first.
   ```sh
   set -a; source .env.local; set +a
   npx supabase link --project-ref <ref>
   npx supabase db push --remote      # --remote is required: without it the CLI targets the local stack
   npm run db:types
   ```
3. Under **Authentication → Sign In / Providers**, turn off "Allow new users to sign up". Keep the Email provider enabled.
4. **Bootstrap the shared admin account:**
   - Authentication → Users → *Add user* → email + strong password, with "Auto confirm" checked.
   - In the SQL editor:
     ```sql
     insert into public.admin_users (user_id, label)
     select id, 'Shared admin account' from auth.users where email = '<admin email>';
     ```
5. **Set the member PIN.** Either use the admin Settings page once it is built, or run this in the SQL editor:
   ```sql
   update public.app_secrets
      set member_pin_hash = extensions.crypt('<PIN>', extensions.gen_salt('bf', 10)), updated_at = now()
    where id = 1;
   ```
6. Enter the catalog: either through the admin UI, or adapt the item section of `supabase/seed.sql`.

## 2. GitHub (code hosting)
The GitHub CLI isn't installed, so VS Code's built-in publishing is used:
1. VS Code → **Source Control** panel (branch icon) → **Publish Branch** (or ⋯ → *Publish to GitHub*).
2. Sign in to GitHub in the browser pop-up, choose **Publish to GitHub private repository**, and name it `mert-equipment`.
3. Afterwards, `git push` works normally. The local `main` branch tracks `origin/main`.

## 3. Vercel (web hosting)
1. Sign up at vercel.com **with GitHub**, then *Add New → Project* → import `mert-equipment`. The framework is auto-detected as Next.js.
2. Before deploying, open **Environment Variables** and paste the contents of the gitignored file **`.env.vercel`** (generated from `.env.local` without the CLI-only secrets). Vercel accepts a pasted .env block.
3. Deploy. Copy the production URL (e.g. `https://mert-equipment.vercel.app`), add `NEXT_PUBLIC_APP_URL=<that URL>` in Vercel env vars, and redeploy. Also update `NEXT_PUBLIC_APP_URL` in `.env.local` for local runs if you want links to point at production.
4. Cron: `vercel.json` schedules `/api/cron/daily` at 12:00 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set.
5. Optional: Supabase → Authentication → URL Configuration → Site URL = the Vercel URL. Password login doesn't need it, but it's tidy.

## 4. Resend (email). Test mode until MERT has a domain
1. Sign up at resend.com, create an **API key** (sending access), and add `RESEND_API_KEY` to `.env.local` and Vercel.
2. With no verified domain, set `ALERT_EMAIL_FROM="MERT Equipment <onboarding@resend.dev>"`. **Test mode can only deliver to the email address the Resend account was created with.** Sends to anyone else fail (they are logged as `failed` in `notification_log`).
3. Make sure that address is a recipient in Settings → Who gets alerts, and press **send test**.
4. **To email the whole board:** buy or verify a domain (~$10–15/yr), add it in Resend → Domains, add the DNS records it shows, then change `ALERT_EMAIL_FROM` to e.g. `alerts@yourdomain.org`.

## 5. Twilio (texts). Deferred by owner choice
Texts are coded (room-at-par alerts plus anything ≥ `sms_min_severity`) but stay `skipped` until `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` are set. US numbers need A2P 10DLC registration.

## Troubleshooting
- **Check `/api/health` first.** It lists which required env vars the deployment can see (names only) and returns `ok: true` when all are present.
- **`MIDDLEWARE_INVOCATION_FAILED` on `/admin`, or a 500 on `/api/cron/daily`, means the env vars are missing.** `NEXT_PUBLIC_*` values are baked in at **build** time, so after fixing env vars you must **Redeploy**.
- **Pasting a .env file creates only one variable.** If the paste goes into the *Value* box, or the whole file becomes one variable (it happened once, as a variable named `envvercel`), delete it. Re-paste into the **Key** field, which splits the file into rows, or add each of the six keys separately.

## 6. Post-deploy checklist
- [ ] The `/submit` PIN works, and a wrong PIN locks out after 8 tries.
- [ ] Admin login works, and a non-registered auth user is refused.
- [ ] A test submission moves stock and appears in the admin submissions page.
- [ ] Running the cron route manually (`curl -H "Authorization: Bearer $CRON_SECRET" …/api/cron/daily`) sends a test email and SMS.

## Applying future migrations
`npx supabase db push`. Check the diff first with `npx supabase db diff --linked`. Never edit applied migrations.
