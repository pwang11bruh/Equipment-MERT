import "server-only";

import { serverEnv } from "@/lib/env";

/**
 * Thin wrappers around Resend (email) and Twilio (SMS) REST APIs.
 * If a provider isn't configured, sends return { status: "skipped" } so the
 * rest of the app works without accounts (ADR-005, operations/ENVIRONMENT.md).
 */

export type SendResult = { status: "sent" | "failed" | "skipped"; error?: string };

export function emailConfigured(): boolean {
  const env = serverEnv();
  return !!(env.RESEND_API_KEY && env.ALERT_EMAIL_FROM);
}

export function smsConfigured(): boolean {
  const env = serverEnv();
  return !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const env = serverEnv();
  if (!emailConfigured()) return { status: "skipped", error: "Email provider not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.ALERT_EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) return { status: "failed", error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendSms(msg: { to: string; body: string }): Promise<SendResult> {
  const env = serverEnv();
  if (!smsConfigured()) return { status: "skipped", error: "SMS provider not configured" };
  try {
    const sid = env.TWILIO_ACCOUNT_SID!;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: msg.to, From: env.TWILIO_FROM_NUMBER!, Body: msg.body }),
    });
    if (!res.ok) return { status: "failed", error: `Twilio ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}
