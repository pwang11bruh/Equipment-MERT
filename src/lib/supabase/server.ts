import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client bound to the current request's auth cookies.
 * Use in Server Components, Server Actions and Route Handlers for ADMIN data.
 * Every query runs as the signed-in user, so RLS (is_admin()) applies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** Returns true when the current request belongs to the registered admin account. */
export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}
