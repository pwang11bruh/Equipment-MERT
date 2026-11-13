# Environment Variables

Template: `/.env.example`. Validation: `src/lib/env.ts`. Keep all three in sync.

| Variable | Scope | Required | Where to get it |
| --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | CLI only | for CLI | supabase.com/dashboard/account/tokens. Lets the Supabase CLI act on the owner's account. **Not** used by the app; never set it in Vercel. |
| `SUPABASE_DB_PASSWORD` | CLI only | for CLI | The password chosen when the project was created (reset it under Project Settings → Database). Used by `db push`. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | yes | Supabase → Project Settings → API, or the output of `supabase start` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | yes | Same place (the anon/publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | yes | Same place (service_role/secret key). **Never expose it.** |
| `MEMBER_SESSION_SECRET` | server | yes | `openssl rand -base64 48` (min 32 chars). Rotating it logs out all members. |
| `MEMBER_SESSION_HOURS` | server | no (12) | How long a PIN unlock lasts |
| `CRON_SECRET` | server | yes in prod | `openssl rand -hex 32`. Vercel sends it as `Authorization: Bearer …` to cron routes. |
| `NEXT_PUBLIC_APP_URL` | public | yes in prod | e.g. `https://mert-equipment.vercel.app`; used for links in alerts |
| `RESEND_API_KEY` | server | for email | resend.com → API Keys. Also verify a sending domain. |
| `ALERT_EMAIL_FROM` | server | for email | e.g. `MERT Equipment <alerts@yourdomain.org>`; the domain must be verified in Resend |
| `TWILIO_ACCOUNT_SID` | server | for SMS | Twilio Console |
| `TWILIO_AUTH_TOKEN` | server | for SMS | Twilio Console |
| `TWILIO_FROM_NUMBER` | server | for SMS | A Twilio phone number in E.164 format. US numbers need A2P 10DLC registration. |

If an email or SMS variable is empty, that channel is skipped and logged as `skipped` in `notification_log`.

## Using the CLI with `.env.local`
The Supabase CLI does not read `.env.local` by itself. Export it into the shell first:
```sh
set -a; source .env.local; set +a
npx supabase db push --remote     # or: npm run db:push
npm run db:types
```
