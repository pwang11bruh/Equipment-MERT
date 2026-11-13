"use server";

import { revalidatePath } from "next/cache";

import { clientHash, endMemberSession, hasMemberSession, startMemberSession } from "@/lib/member-session";
import { createServiceClient } from "@/lib/supabase/service";
import { pinSchema, submissionSchema, type SubmissionInput } from "@/lib/validation/submission";
import type { SubmissionResult } from "@/types/domain";

// ---------------------------------------------------------------------------
// PIN gate
// ---------------------------------------------------------------------------
export type PinState = { error?: string };

export async function verifyPinAction(_prev: PinState, formData: FormData): Promise<PinState> {
  const parsed = pinSchema.safeParse(String(formData.get("pin") ?? ""));
  if (!parsed.success) return { error: "Enter the 4–12 digit team PIN." };

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("verify_member_pin", {
    p_pin: parsed.data,
    p_client_hash: await clientHash(),
  });
  if (error) {
    console.error("verify_member_pin failed", error);
    return { error: "Something went wrong. Try again in a moment." };
  }

  const result = data as { ok: boolean; locked: boolean };
  if (result.locked) return { error: "Too many wrong attempts. Wait 15 minutes and try again." };
  if (!result.ok) return { error: "Incorrect PIN." };

  await startMemberSession();
  revalidatePath("/submit");
  return {};
}

export async function lockAction(): Promise<void> {
  await endMemberSession();
  revalidatePath("/submit");
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------
export type SubmitResponse =
  | { ok: true; result: SubmissionResult }
  | { ok: false; error: string; locked?: boolean };

export async function submitUsageAction(input: SubmissionInput): Promise<SubmitResponse> {
  if (!(await hasMemberSession())) {
    return { ok: false, locked: true, error: "Your session expired. Enter the PIN again." };
  }

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const v = parsed.data;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("process_submission", {
    p_submitted_by_name: v.name,
    p_reason: v.reason,
    p_context: v.context,
    p_lines: v.lines.map((l) => ({
      item_id: l.item_id,
      quantity: l.quantity,
      replacement_cause: v.reason === "replacement" ? l.replacement_cause : null,
    })),
    p_call_reference: v.context === "call" ? v.callReference || undefined : undefined,
    p_notes: v.notes || undefined,
  });

  if (error) {
    console.error("process_submission failed", error);
    // 22023 = validation error raised by process_submission (safe to show).
    const message = error.code === "22023" ? error.message : "Couldn't save your submission. Please try again.";
    return { ok: false, error: message };
  }

  return { ok: true, result: data as unknown as SubmissionResult };
}
