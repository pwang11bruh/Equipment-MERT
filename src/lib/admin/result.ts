import type { PostgrestError } from "@supabase/supabase-js";

/** Uniform return type for admin server actions. */
export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

/**
 * Turn a Postgres/PostgREST error into something an admin can act on.
 * Messages from our own RAISE EXCEPTION (P0001) are written for humans
 * (e.g. the FEFO gate), so they are passed through verbatim.
 */
export function dbError(error: PostgrestError | null, fallback = "Something went wrong."): ActionResult<never> {
  if (!error) return { ok: false, error: fallback };
  console.error("[admin action]", error);
  if (error.code === "P0001" || error.code === "22023") return { ok: false, error: error.message };
  if (error.code === "42501") return { ok: false, error: "You need to be signed in as the admin." };
  if (error.code === "23505") return { ok: false, error: "That name is already used." };
  if (error.code === "23514") return { ok: false, error: "One of the values isn't allowed." };
  return { ok: false, error: fallback };
}
