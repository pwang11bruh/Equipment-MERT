"use server";

import { revalidatePath } from "next/cache";

import { dbError, type ActionResult } from "@/lib/admin/result";
import { createClient } from "@/lib/supabase/server";

/**
 * Acknowledge = "I know, working on it" (stays visible; re-opens if it gets worse).
 * Resolve     = "done". Condition alerts come back on the next refresh if the
 *               problem still exists, so prefer fixing the stock over resolving.
 */
export async function setAlertStatusAction(ids: string[], status: "acknowledged" | "resolved" | "open"): Promise<ActionResult> {
  if (ids.length === 0) return { ok: true };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const patch =
    status === "acknowledged"
      ? { status, acknowledged_at: now }
      : status === "resolved"
        ? { status, resolved_at: now }
        : { status, acknowledged_at: null };
  const { error } = await supabase.from("alerts").update(patch).in("id", ids);
  if (error) return dbError(error, "Couldn't update the alert.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function refreshAlertsAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("refresh_alerts");
  if (error) return dbError(error, "Couldn't refresh alerts.");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Alerts are up to date." };
}
