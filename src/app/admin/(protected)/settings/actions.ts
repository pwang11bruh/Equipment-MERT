"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbError, type ActionResult } from "@/lib/admin/result";
import { createClient } from "@/lib/supabase/server";
import { pinSchema } from "@/lib/validation/submission";

// ---------------------------------------------------------------------------
// Member PIN
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Alert settings (app_settings singleton)
// ---------------------------------------------------------------------------
const settingsSchema = z.object({
  expirationWarningDays: z.coerce.number().int().min(1, "At least 1 day").max(365),
  smsMinSeverity: z.enum(["info", "warning", "critical"]),
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
});

export async function saveAlertSettingsAction(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      expiration_warning_days: v.expirationWarningDays,
      sms_min_severity: v.smsMinSeverity,
      email_enabled: v.emailEnabled,
      sms_enabled: v.smsEnabled,
    })
    .eq("id", 1);
  if (error) return dbError(error, "Couldn't save settings.");
  await supabase.rpc("refresh_alerts"); // warning window may have changed
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Settings saved." };
}

// ---------------------------------------------------------------------------
// Alert recipients
// ---------------------------------------------------------------------------
const recipientSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    role: z.enum(["equipment_officer", "board", "other"]),
    email: z.union([z.literal(""), z.email("Invalid email")]),
    phone: z
      .string()
      .trim()
      .transform((s) => s.replace(/[\s().-]/g, ""))
      .transform((s) => (s && !s.startsWith("+") ? (s.length === 10 ? `+1${s}` : `+${s}`) : s))
      .refine((s) => s === "" || /^\+[1-9][0-9]{7,14}$/.test(s), "Phone must look like +1 555 123 4567"),
    notifyEmail: z.boolean(),
    notifySms: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => v.email || v.phone, { message: "Add an email or a phone number", path: ["email"] })
  .refine((v) => !v.notifySms || v.phone, { message: "Add a phone number to get texts", path: ["phone"] })
  .refine((v) => !v.notifyEmail || v.email, { message: "Add an email to get emails", path: ["email"] });

export type RecipientInput = z.input<typeof recipientSchema>;

function recipientRow(v: z.output<typeof recipientSchema>) {
  return {
    name: v.name,
    role: v.role,
    email: v.email || null,
    phone_e164: v.phone || null,
    notify_email: v.notifyEmail,
    notify_sms: v.notifySms,
    is_active: v.isActive,
  };
}

export async function saveRecipientAction(id: string | null, input: RecipientInput): Promise<ActionResult> {
  const parsed = recipientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("alert_recipients").update(recipientRow(parsed.data)).eq("id", id)
    : await supabase.from("alert_recipients").insert(recipientRow(parsed.data));
  if (error) return dbError(error, "Couldn't save the recipient.");
  revalidatePath("/admin/settings");
  return { ok: true, message: id ? "Recipient updated." : "Recipient added." };
}

export async function deleteRecipientAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("alert_recipients").delete().eq("id", id);
  if (error) return dbError(error, "Couldn't remove the recipient.");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Recipient removed." };
}
