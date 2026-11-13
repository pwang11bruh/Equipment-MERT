"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/admin/format";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { ItemStock } from "@/types/domain";

import { saveThresholdsAction } from "./actions";

export type InventoryRow = ItemStock & { nextBatchExp: string | null; nextBatchQty: number | null };

type Filter = "all" | "attention" | "below_par" | "reorder" | "expiry" | "oos" | "no_par";

const FILTERS: { value: Filter; label: string; test: (r: InventoryRow) => boolean }[] = [
  { value: "all", label: "All", test: () => true },
  { value: "attention", label: "Needs attention", test: (r) => flags(r).length > 0 },
  { value: "below_par", label: "Room below par", test: (r) => belowPar(r) },
  { value: "reorder", label: "Reorder", test: (r) => needsReorder(r) },
  { value: "expiry", label: "Expiring / expired", test: (r) => r.expired_qty > 0 || r.expiring_soon_qty > 0 },
  { value: "oos", label: "Out of service", test: (r) => r.out_of_service_qty > 0 },
  { value: "no_par", label: "Par not set", test: (r) => r.room_par_qty === 0 },
];

const belowPar = (r: InventoryRow) => r.room_par_qty > 0 && r.room_qty < r.room_par_qty;
const needsReorder = (r: InventoryRow) => r.min_backstock_qty > 0 && r.backstock_qty < r.min_backstock_qty;

function flags(r: InventoryRow) {
  const f: { label: string; tone: "destructive" | "secondary" | "outline" }[] = [];
  if (belowPar(r)) f.push({ label: r.room_qty === 0 ? "Room empty" : "Below par", tone: "destructive" });
  if (needsReorder(r)) f.push({ label: "Reorder", tone: "secondary" });
  if (r.expired_qty > 0) f.push({ label: `${r.expired_qty} expired`, tone: "destructive" });
  if (r.expiring_soon_qty > 0) f.push({ label: `${r.expiring_soon_qty} expiring`, tone: "secondary" });
  if (r.out_of_service_qty > 0) f.push({ label: `${r.out_of_service_qty} out of service`, tone: "outline" });
  return f;
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, { par: string; min: string }>>({});
  const [saving, startSaving] = useTransition();

  const visible = useMemo(() => {
    const test = FILTERS.find((f) => f.value === filter)!.test;
    return rows.filter((r) => (showArchived || !r.is_archived) && test(r) && matchesSearch(r.name, query));
  }, [rows, filter, query, showArchived]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.value, rows.filter((r) => !r.is_archived && f.test(r)).length])),
    [rows],
  );

  const dirty = Object.entries(draft).filter(([id, d]) => {
    const r = rows.find((x) => x.item_id === id)!;
    return String(r.room_par_qty) !== d.par || String(r.min_backstock_qty) !== d.min;
  });

  function startEditing() {
    setDraft(Object.fromEntries(rows.map((r) => [r.item_id, { par: String(r.room_par_qty), min: String(r.min_backstock_qty) }])));
    setEditing(true);
  }

  function save() {
    startSaving(async () => {
      const res = await saveThresholdsAction(
        dirty.map(([itemId, d]) => ({ itemId, roomParQty: d.par || "0", minBackstockQty: d.min || "0" })),
      );
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setEditing(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${rows.length} items…`}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="archived" className="text-sm font-normal">
            Show archived
          </Label>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              <X /> Cancel
            </Button>
            <Button onClick={save} disabled={saving || dirty.length === 0}>
              {saving ? "Saving…" : `Save ${dirty.length || ""} change${dirty.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={startEditing}>
            <Pencil /> Edit pars & minimums
          </Button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-medium",
              filter === f.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {f.label} <span className="opacity-70">{counts[f.value]}</span>
          </button>
        ))}
      </div>

      {editing && (
        <p className="text-muted-foreground text-sm">
          <b>Room par</b>: the Equipment Room alerts the officer and board when it drops below this.{" "}
          <b>Backstock min</b>: reorder alert below this. Use 0 to turn an alert off.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Equipment Room</th>
              <th className="px-3 py-2 text-right font-medium">Backstock</th>
              <th className="px-3 py-2 font-medium">Next to expire</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((r) => {
              const f = flags(r);
              const nextExp = r.next_room_expiration ?? r.next_backstock_expiration;
              return (
                <tr key={r.item_id} className={cn("hover:bg-muted/40", r.is_archived && "opacity-60")}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/inventory/${r.item_id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {r.category_name ?? "Uncategorized"} · {r.unit}
                      {r.is_archived && " · archived"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {editing ? (
                      <ThresholdInput
                        label="par"
                        value={draft[r.item_id]?.par ?? ""}
                        onChange={(v) => setDraft((d) => ({ ...d, [r.item_id]: { ...d[r.item_id]!, par: v } }))}
                        prefix={`${r.room_qty} /`}
                      />
                    ) : (
                      <span className={cn(belowPar(r) && "text-destructive font-semibold")}>
                        {r.room_qty}
                        <span className="text-muted-foreground font-normal"> / {r.room_par_qty || "–"}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {editing ? (
                      <ThresholdInput
                        label="min"
                        value={draft[r.item_id]?.min ?? ""}
                        onChange={(v) => setDraft((d) => ({ ...d, [r.item_id]: { ...d[r.item_id]!, min: v } }))}
                        prefix={`${r.backstock_qty} / min`}
                      />
                    ) : (
                      <span className={cn(needsReorder(r) && "text-destructive font-semibold")}>
                        {r.backstock_qty}
                        <span className="text-muted-foreground font-normal"> / min {r.min_backstock_qty || "–"}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.tracks_expiration ? formatDate(nextExp) : <span className="text-muted-foreground">No expiry</span>}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {f.length === 0 ? (
                        <span className="text-muted-foreground text-xs">OK</span>
                      ) : (
                        f.map((x) => (
                          <Badge key={x.label} variant={x.tone}>
                            {x.label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-10 text-center">
                  No items match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThresholdInput({
  value,
  onChange,
  prefix,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{prefix}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-20 text-right"
        aria-label={label}
      />
    </span>
  );
}
