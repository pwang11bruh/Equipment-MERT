import "server-only";

import { publicEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { AlertAudience, AlertSeverity, AlertType } from "@/types/domain";

import { sendEmail, sendSms, type SendResult } from "./providers";

/**
 * Alert notification dispatcher (docs/database/BUSINESS_LOGIC.md §5).
 *
 * Pending = open alert whose severity is above what we last notified about.
 *   info      -> in-app only (never sent)
 *   warning+  -> email (digest)
 *   >= settings.sms_min_severity -> also SMS
 * Routing: audience 'all' -> every active recipient; 'equipment_officer' ->
 * recipients with role equipment_officer.
 *
 * mode "urgent": sent right away (after a member submission or a stock
 *                change by the admin). Includes alerts at/above
 *                sms_min_severity AND every IMMEDIATE_EMAIL_TYPES alert —
 *                e.g. the Equipment Room dropping below par is emailed
 *                immediately (owner request 2026-11-13); SMS still only goes
 *                out for alerts at/above sms_min_severity.
 * mode "digest": everything pending (daily cron).
 *
 * An alert is marked notified only if at least one message about it was
 * actually sent, so nothing is lost while providers aren't configured yet.
 */

const RANK: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 };

/** Alert types that are emailed immediately instead of waiting for the daily digest. */
const IMMEDIATE_EMAIL_TYPES: AlertType[] = ["low_stock_room"];

interface PendingAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  audience: AlertAudience;
  title: string;
  message: string;
  last_notified_severity: AlertSeverity | null;
}

export interface DispatchSummary {
  mode: "urgent" | "digest";
  pendingAlerts: number;
  messages: { sent: number; failed: number; skipped: number };
  notifiedAlerts: number;
}

export async function dispatchAlerts(mode: "urgent" | "digest"): Promise<DispatchSummary> {
  const supabase = createServiceClient();
  const summary: DispatchSummary = { mode, pendingAlerts: 0, messages: { sent: 0, failed: 0, skipped: 0 }, notifiedAlerts: 0 };

  const [{ data: settings }, { data: alerts }, { data: recipients }] = await Promise.all([
    supabase.from("app_settings").select("email_enabled, sms_enabled, sms_min_severity, org_name").eq("id", 1).single(),
    supabase.from("alerts").select("id, alert_type, severity, audience, title, message, last_notified_severity").eq("status", "open"),
    supabase.from("alert_recipients").select("id, name, role, email, phone_e164, notify_email, notify_sms").eq("is_active", true),
  ]);
  if (!settings || !alerts || !recipients) return summary;

  const smsMin = RANK[settings.sms_min_severity as AlertSeverity];
  const pending = (alerts as PendingAlert[])
    .filter((a) => RANK[a.severity] >= RANK.warning)
    .filter((a) => a.last_notified_severity === null || RANK[a.severity] > RANK[a.last_notified_severity])
    .filter((a) => mode === "digest" || RANK[a.severity] >= smsMin || IMMEDIATE_EMAIL_TYPES.includes(a.alert_type))
    .sort((a, b) => RANK[b.severity] - RANK[a.severity] || a.title.localeCompare(b.title));
  summary.pendingAlerts = pending.length;
  if (pending.length === 0) return summary;

  const sentFor = new Set<string>();
  const logRows: Array<Record<string, unknown>> = [];
  const record = (r: SendResult, alertIds: string[], row: Record<string, unknown>) => {
    summary.messages[r.status] += 1;
    if (r.status === "sent") alertIds.forEach((id) => sentFor.add(id));
    logRows.push({ ...row, alert_ids: alertIds, status: r.status, error: r.error ?? null });
  };

  const appUrl = publicEnv.appUrl.replace(/\/$/, "");
  for (const r of recipients) {
    const mine = pending.filter((a) => a.audience === "all" || r.role === "equipment_officer");
    if (mine.length === 0) continue;

    if (settings.email_enabled && r.notify_email && r.email) {
      const { subject, html, text } = renderEmail(mine, appUrl, mode);
      record(await sendEmail({ to: r.email, subject, html, text }), mine.map((a) => a.id), {
        channel: "email", recipient_id: r.id, destination: r.email, subject, body: text,
      });
    }

    const urgent = mine.filter((a) => RANK[a.severity] >= smsMin);
    if (settings.sms_enabled && r.notify_sms && r.phone_e164 && urgent.length > 0) {
      const body = renderSms(urgent, appUrl);
      record(await sendSms({ to: r.phone_e164, body }), urgent.map((a) => a.id), {
        channel: "sms", recipient_id: r.id, destination: r.phone_e164, subject: null, body,
      });
    }
  }

  if (logRows.length) await supabase.from("notification_log").insert(logRows as never);

  const now = new Date().toISOString();
  const notified = pending.filter((a) => sentFor.has(a.id));
  await Promise.all(
    notified.map((a) =>
      supabase.from("alerts").update({ last_notified_severity: a.severity, last_notified_at: now }).eq("id", a.id),
    ),
  );
  summary.notifiedAlerts = notified.length;
  return summary;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function renderEmail(alerts: PendingAlert[], appUrl: string, mode: "urgent" | "digest") {
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const subject =
    mode === "urgent"
      ? `🚨 MERT Equipment: ${alerts[0]!.title}${alerts.length > 1 ? ` (+${alerts.length - 1} more)` : ""}`
      : `MERT Equipment: ${alerts.length} alert${alerts.length === 1 ? "" : "s"}${critical ? ` (${critical} critical)` : ""}`;
  const rows = alerts
    .map(
      (a) => `<tr>
  <td style="padding:8px 12px 8px 0;vertical-align:top"><span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:${a.severity === "critical" ? "#fee2e2;color:#991b1b" : "#fef3c7;color:#92400e"}">${a.severity}</span></td>
  <td style="padding:8px 0;vertical-align:top"><strong>${esc(a.title)}</strong><br><span style="color:#525252">${esc(a.message)}</span></td>
</tr>`,
    )
    .join("");
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#171717;max-width:640px">
<h2 style="font-size:18px;margin:0 0 12px">MERT Equipment alerts</h2>
<table style="border-collapse:collapse">${rows}</table>
<p style="margin-top:20px"><a href="${appUrl}/admin/alerts" style="background:#171717;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none">Open alerts</a></p>
<p style="color:#737373;font-size:12px">You get this because you're listed under Settings → Who gets alerts.</p>
</div>`;
  const text = `MERT Equipment alerts\n\n${alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.title}\n${a.message}`).join("\n\n")}\n\nOpen: ${appUrl}/admin/alerts`;
  return { subject, html, text };
}

function renderSms(alerts: PendingAlert[], appUrl: string) {
  const head = alerts.length === 1 ? `MERT: ${alerts[0]!.message}` : `MERT: ${alerts.length} urgent alerts: ${alerts.map((a) => a.title).join("; ")}`;
  const link = ` ${appUrl}/admin/alerts`;
  return head.length + link.length > 600 ? head.slice(0, 600 - link.length - 1) + "…" + link : head + link;
}
