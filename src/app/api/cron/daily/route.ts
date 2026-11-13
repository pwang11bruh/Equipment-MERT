import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { dispatchAlerts } from "@/lib/notifications/dispatch";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily job (Vercel Cron, see vercel.json). Recomputes alerts — catches items
 * crossing the expiration window overnight — then sends the digest.
 * Auth: `Authorization: Bearer $CRON_SECRET` (Vercel sends this automatically).
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: openAlerts, error } = await supabase.rpc("refresh_alerts");
  if (error) {
    console.error("[cron] refresh_alerts failed", error);
    return NextResponse.json({ error: "refresh_alerts failed" }, { status: 500 });
  }

  const summary = await dispatchAlerts("digest");
  console.log("[cron] daily", { openAlerts, ...summary });
  return NextResponse.json({ ok: true, openAlerts, ...summary });
}
