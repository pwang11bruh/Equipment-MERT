"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client. Used ONLY by the admin UI (login, realtime).
 * Members never use this: the anon role has no table access at all.
 */
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
