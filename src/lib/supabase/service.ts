import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. BYPASSES RLS. Server-only.
 * Allowed uses (keep this list in sync with docs/architecture/SECURITY.md):
 *   - verify_member_pin()       (member PIN gate)
 *   - process_submission()      (after a valid member session)
 *   - reading the item catalog for the member form (names only, no stock)
 *   - cron: refresh_alerts() + notification dispatch
 */
export function createServiceClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
