"use server";

import { createClient } from "@/lib/supabase/server";
import { pinSchema } from "@/lib/validation/submission";

export type SetPinState = { error?: string; success?: boolean };

export async function setMemberPinAction(_prev: SetPinState, formData: FormData): Promise<SetPinState> {
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (pin !== confirm) return { error: "The two PINs don't match." };

  // Runs as the signed-in admin; the RPC itself enforces is_admin().
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_member_pin", { p_pin: parsed.data });
  if (error) {
    console.error("admin_set_member_pin failed", error);
    return { error: "Couldn't update the PIN. Make sure you're signed in as the admin." };
  }
  return { success: true };
}
