"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AlertAudience, AlertSeverity, AlertStatus, AlertType } from "@/types/domain";

import { refreshAlertsAction, setAlertStatusAction } from "./actions";

export interface AlertListRow {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  audience: AlertAudience;
  title: string;
  message: string;
  item_id: string | null;
  itemName: string | null;
  first_detected_at: string;
  resolved_at: string | null;
}

const SEVERITY_VARIANT = { critical: "destructive", warning: "secondary", info: "outline" } as const;
const MANUAL: AlertType[] = ["stock_discrepancy", "broken_equipment_reported"];

export function AlertList({ rows, status }: { rows: AlertListRow[]; status: AlertStatus }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  function apply(ids: string[], next: "acknowledged" | "resolved" | "open") {
    start(async () => {
      const res = await setAlertStatusAction(ids, next);
      if (!res.ok) return void toast.error(res.error);
      setSelected(new Set());
      toast.success(next === "resolved" ? "Resolved" : next === "acknowledged" ? "Acknowledged" : "Re-opened");
    });
  }

  if (rows.length === 0) {
    return <p className="text-muted-foreground py-10 text-center text-sm">Nothing here.</p>;
  }

  const allSelected = selected.size === rows.length;
  return (
    <div className="space-y-3">
      {status !== "resolved" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
              onCheckedChange={(v) => setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set())}
            />
            Select all
          </label>
          {selected.size > 0 && (
            <>
              {status === "open" && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => apply([...selected], "acknowledged")}>
                  Acknowledge {selected.size}
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={pending} onClick={() => apply([...selected], "resolved")}>
                Resolve {selected.size}
              </Button>
            </>
          )}
        </div>
      )}

      <ul className="divide-y rounded-lg border">
        {rows.map((a) => (
          <li key={a.id} className="flex gap-3 p-3">
            {status !== "resolved" && (
              <Checkbox
                className="mt-1"
                checked={selected.has(a.id)}
                onCheckedChange={(v) =>
                  setSelected((s) => {
                    const n = new Set(s);
                    if (v === true) n.add(a.id);
                    else n.delete(a.id);
                    return n;
                  })
                }
                aria-label={`Select ${a.title}`}
              />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={SEVERITY_VARIANT[a.severity]}>{a.severity}</Badge>
                {a.item_id ? (
                  <Link href={`/admin/inventory/${a.item_id}`} className="font-medium hover:underline">
                    {a.title}
                  </Link>
                ) : (
                  <span className="font-medium">{a.title}</span>
                )}
                <span className="text-muted-foreground text-xs">
                  → {a.audience === "all" ? "Officer + board" : "Equipment Officer"}
                  {MANUAL.includes(a.alert_type) && " · resolve by hand"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{a.message}</p>
              <p className="text-muted-foreground text-xs">
                {status === "resolved" && a.resolved_at
                  ? `Resolved ${formatDistanceToNow(new Date(a.resolved_at), { addSuffix: true })}`
                  : `Since ${formatDistanceToNow(new Date(a.first_detected_at), { addSuffix: true })}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
              {status === "open" && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => apply([a.id], "acknowledged")}>
                  Acknowledge
                </Button>
              )}
              {status !== "resolved" ? (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => apply([a.id], "resolved")}>
                  Resolve
                </Button>
              ) : null}
              {status === "acknowledged" && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => apply([a.id], "open")}>
                  Re-open
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RefreshAlertsButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await refreshAlertsAction();
          if (!res.ok) toast.error(res.error);
          else toast.success(res.message);
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} /> Re-check now
    </Button>
  );
}
