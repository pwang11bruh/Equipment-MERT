"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Shared admin account uses a placeholder email domain (ADR-009). */
const ADMIN_EMAIL_DOMAIN = "mert.local";

export type SignInState = { error?: string };

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/admin") && !value.startsWith("/admin/login") ? value : "/admin";
}

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };

  const email = username.includes("@") ? username : `${username}@${ADMIN_EMAIL_DOMAIN}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect username or password." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
