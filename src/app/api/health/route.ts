import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Deployment health check: reports WHICH required env vars are present
 * (booleans only, never values) so a misconfigured deploy is easy to diagnose.
 * Keep the list in sync with src/lib/env.ts and docs/operations/ENVIRONMENT.md.
 */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MEMBER_SESSION_SECRET",
  "CRON_SECRET",
] as const;
const OPTIONAL = ["NEXT_PUBLIC_APP_URL", "MEMBER_SESSION_HOURS", "RESEND_API_KEY", "ALERT_EMAIL_FROM", "TWILIO_ACCOUNT_SID"] as const;

export function GET() {
  const present = (k: string) => !!process.env[k];
  const missing = REQUIRED.filter((k) => !present(k));
  const secretLongEnough = (process.env.MEMBER_SESSION_SECRET ?? "").length >= 32;
  return NextResponse.json(
    {
      ok: missing.length === 0 && secretLongEnough,
      missing,
      memberSessionSecretLongEnough: secretLongEnough,
      optional: Object.fromEntries(OPTIONAL.map((k) => [k, present(k)])),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
