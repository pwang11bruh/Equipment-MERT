# Security Model

## Actors
| Actor | How they authenticate | What they can do |
| --- | --- | --- |
| **Member** | Shared numeric PIN (4–12 digits). On success the server sets a signed, httpOnly cookie, `mert_member`, valid for `MEMBER_SESSION_HOURS` (default 12). | Submit the restock/replacement form. They see item names only and **never stock levels**. |
| **Admin** | One shared Supabase Auth user (email + password) registered in `public.admin_users`. | Everything: read all data, inventory RPCs, catalog, settings and alerts. |
| **Cron** | `Authorization: Bearer $CRON_SECRET` header on `/api/cron/*`. | Refresh alerts and send notifications (service role). |

## Postgres roles
| Role | Access |
| --- | --- |
| `anon` | **None.** All table, sequence and function privileges are revoked. |
| `authenticated` | RLS policies all require `is_admin()`. Inventory tables are **select-only**. Writes go through `SECURITY DEFINER` `admin_*` RPCs that call `_assert_admin()`. For `alerts`, only the `status`, `acknowledged_at` and `resolved_at` columns are updatable. |
| `service_role` | Used only by server code (`src/lib/supabase/service.ts`). Executes `verify_member_pin`, `process_submission` and `refresh_alerts`. |

Tables with RLS enabled and **no policies**, which means no API access at all: `app_secrets` (holds the PIN hash) and `pin_attempts`.

Functions are deny-by-default: migration 0300 revokes EXECUTE from `public`, `anon` and `authenticated` for all existing functions *and* as a default privilege. Any new RPC must be explicitly granted in a migration.

## Member PIN
- Stored as a bcrypt hash (`extensions.crypt`, cost 10) in `app_secrets.member_pin_hash`. Set it with `admin_set_member_pin(pin)`.
- Rate limits are enforced in `verify_member_pin`:
  - 8 failures per client per 15 minutes
  - 40 failures globally per 15 minutes; this stops distributed brute force of a short PIN
- The client identity is `sha256(ip | MEMBER_SESSION_SECRET)` (`clientHash()`). Raw IPs are never stored. Attempts older than 30 days are purged by `_refresh_alerts()`.
- Rotating the PIN does **not** invalidate existing cookies. To force everyone out, rotate `MEMBER_SESSION_SECRET` as well.

## Admin account
- Public signups are disabled (`supabase/config.toml` → `[auth] enable_signup = false`). **Also disable them in the production dashboard** (Authentication → Providers / Sign In).
- Bootstrap steps are in operations/DEPLOYMENT.md: create the user in the dashboard, then insert its id into `admin_users`.
- Because the account is shared, the ledger `actor` is always `'admin'`. Rotate the password when an officer leaves.
- **Username login (ADR-009):** the account is `mertadmin@mert.local`, and admins type just `mertadmin`. Password resets are done in the Supabase dashboard, because email can't be delivered to that address.

## Secrets checklist
- `SUPABASE_SERVICE_ROLE_KEY`, `MEMBER_SESSION_SECRET`, `CRON_SECRET`, `RESEND_API_KEY` and `TWILIO_AUTH_TOKEN` must stay server-side. Never prefix them with `NEXT_PUBLIC_`.
- `src/lib/supabase/service.ts` and `src/lib/member-session.ts` import `server-only`, so the build fails if client code imports them.
