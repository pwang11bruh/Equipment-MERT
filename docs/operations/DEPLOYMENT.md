# Deployment

Target: **Supabase Cloud** (database and auth) plus **Vercel** (Next.js and cron).
Status as of 2026-11-13: **not deployed**. Update this file as each step is done.

## 1. Supabase project
1. Create a project at supabase.com. Pick the region closest to your users and save the DB password in a password manager.
2. Link and push the migrations:
   ```sh
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
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

## 2. Vercel
1. Import the Git repo into Vercel (framework: Next.js).
2. Add every variable from operations/ENVIRONMENT.md under Production (and Preview if wanted).
3. Cron: `vercel.json` (Phase 4) will schedule `/api/cron/daily`. Hobby plans allow one run per day.
4. Set `NEXT_PUBLIC_APP_URL` to the production URL and redeploy.

## 3. Post-deploy checklist
- [ ] The `/submit` PIN works, and a wrong PIN locks out after 8 tries.
- [ ] Admin login works, and a non-registered auth user is refused.
- [ ] A test submission moves stock and appears in the admin submissions page.
- [ ] Running the cron route manually (`curl -H "Authorization: Bearer $CRON_SECRET" …/api/cron/daily`) sends a test email and SMS.

## Applying future migrations
`npx supabase db push`. Check the diff first with `npx supabase db diff --linked`. Never edit applied migrations.
