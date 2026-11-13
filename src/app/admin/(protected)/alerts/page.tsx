import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { AlertSeverity, AlertStatus } from "@/types/domain";

import { AlertList, RefreshAlertsButton, type AlertListRow } from "./alert-list";

export const metadata = { title: "Alerts · MERT Equipment" };

const TABS: { value: AlertStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
];
const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status: AlertStatus = TABS.some((t) => t.value === raw) ? (raw as AlertStatus) : "open";

  const supabase = await createClient();
  const [{ data }, ...counts] = await Promise.all([
    supabase
      .from("alerts")
      .select("id, alert_type, severity, audience, title, message, item_id, first_detected_at, last_detected_at, resolved_at, items(name)")
      .eq("status", status)
      .order(status === "resolved" ? "resolved_at" : "first_detected_at", { ascending: false })
      .limit(status === "resolved" ? 100 : 500),
    ...TABS.map((t) => supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", t.value)),
  ]);

  const rows: AlertListRow[] = (data ?? [])
    .map((a) => ({ ...a, itemName: a.items?.name ?? null }))
    .sort((a, b) => (status === "resolved" ? 0 : SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (a.itemName ?? "").localeCompare(b.itemName ?? "")));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alerts</h1>
          <p className="text-muted-foreground text-sm">
            Alerts clear themselves once the problem is fixed (e.g. stock moved, expired units disposed). Recount and
            broken-equipment reports must be resolved by hand.
          </p>
        </div>
        <RefreshAlertsButton />
      </div>

      <nav className="flex gap-1 border-b">
        {TABS.map((t, i) => (
          <Link
            key={t.value}
            href={`/admin/alerts?status=${t.value}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              status === t.value ? "border-primary font-medium" : "text-muted-foreground border-transparent",
            )}
          >
            {t.label} <span className="text-muted-foreground">{counts[i]?.count ?? 0}</span>
          </Link>
        ))}
      </nav>

      <AlertList rows={rows} status={status} />
    </div>
  );
}
