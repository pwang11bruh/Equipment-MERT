import Link from "next/link";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { MonthlyItemUsage } from "@/types/domain";

import { SpendChart, TopItemsChart, UsageChart, type MonthPoint } from "./charts";
import { ItemReportTable, type ItemReportRow } from "./item-report-table";

export const metadata = { title: "Reports · MERT Equipment" };

const RANGES = [3, 6, 12, 24] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const { months: raw } = await searchParams;
  const months = RANGES.includes(Number(raw) as (typeof RANGES)[number]) ? Number(raw) : 6;
  const start = startOfMonth(subMonths(new Date(), months - 1));
  const startIso = format(start, "yyyy-MM-dd");

  const supabase = await createClient();
  const [{ data: usageData }, { data: subs }, { data: items }] = await Promise.all([
    supabase.from("v_monthly_item_usage").select("*").gte("month", startIso),
    supabase.from("submissions").select("created_at").gte("created_at", start.toISOString()),
    supabase.from("items").select("id, name, category_id, item_categories(name)"),
  ]);
  const usage = (usageData ?? []) as unknown as MonthlyItemUsage[];

  // ---- monthly series (every month in range, zero-filled) -------------------
  const monthKeys = Array.from({ length: months }, (_, i) => format(addMonths(start, i), "yyyy-MM"));
  const byMonth = new Map<string, MonthPoint>(
    monthKeys.map((k) => [k, { key: k, label: format(parseISO(`${k}-01`), months > 12 ? "MMM yy" : "MMM"), restock: 0, replacement: 0, purchases: 0, waste: 0, submissions: 0 }]),
  );
  for (const u of usage) {
    const p = byMonth.get(u.month.slice(0, 7));
    if (!p) continue;
    p.restock += u.issued_restock_qty;
    p.replacement += u.issued_replacement_qty;
    p.purchases += Number(u.purchase_cost);
    p.waste += Number(u.waste_cost);
  }
  for (const s of subs ?? []) {
    const p = byMonth.get(format(new Date(s.created_at), "yyyy-MM"));
    if (p) p.submissions += 1;
  }
  const series = [...byMonth.values()];

  // ---- per-item rollup -------------------------------------------------------
  const itemInfo = new Map((items ?? []).map((i) => [i.id, { name: i.name, category: i.item_categories?.name ?? "Uncategorized" }]));
  const perItem = new Map<string, ItemReportRow>();
  for (const u of usage) {
    const info = itemInfo.get(u.item_id);
    const row =
      perItem.get(u.item_id) ??
      { itemId: u.item_id, name: info?.name ?? u.item_name, category: info?.category ?? "", issued: 0, restock: 0, replacement: 0, submissions: 0, roomRefills: 0, purchases: 0, waste: 0 };
    row.issued += u.issued_qty;
    row.restock += u.issued_restock_qty;
    row.replacement += u.issued_replacement_qty;
    row.submissions += u.submission_count;
    row.roomRefills += u.room_refills;
    row.purchases += Number(u.purchase_cost);
    row.waste += Number(u.waste_cost);
    perItem.set(u.item_id, row);
  }
  const itemRows = [...perItem.values()];
  const top = [...itemRows].filter((r) => r.issued > 0).sort((a, b) => b.issued - a.issued || a.name.localeCompare(b.name)).slice(0, 10);

  const totals = series.reduce(
    (t, p) => ({ issued: t.issued + p.restock + p.replacement, subs: t.subs + p.submissions, purchases: t.purchases + p.purchases, waste: t.waste + p.waste }),
    { issued: 0, subs: 0, purchases: 0, waste: 0 },
  );
  const rangeLabel = `${format(start, "MMM yyyy")} – ${format(new Date(), "MMM yyyy")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-muted-foreground text-sm">{rangeLabel}</p>
        </div>
        {/* Filters: one row above the charts */}
        <div className="bg-muted flex gap-1 rounded-lg p-1" role="group" aria-label="Time range">
          {RANGES.map((m) => (
            <Link
              key={m}
              href={`/admin/reports?months=${m}`}
              className={cn("rounded-md px-3 py-1 text-sm", m === months ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
            >
              {m === 24 ? "2 yrs" : `${m} mo`}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Units taken by members" value={totals.issued.toLocaleString()} />
        <Tile label="Member submissions" value={totals.subs.toLocaleString()} />
        <Tile label="Purchases" value={formatMoney(totals.purchases)} />
        <Tile label="Waste (expired, broken, damaged)" value={formatMoney(totals.waste)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Units taken per month</CardTitle>
            <CardDescription>Restocks after use vs. replacements of expired/broken/missing items.</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Spending per month</CardTitle>
            <CardDescription>Stock purchased vs. value lost to waste. Uses unit costs entered when receiving.</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendChart data={series} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most-used items</CardTitle>
          <CardDescription>Top 10 by units taken in this period.</CardDescription>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No usage recorded in this period yet.</p>
          ) : (
            <TopItemsChart data={top.map((t) => ({ name: t.name, issued: t.issued }))} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>By item</CardTitle>
            <CardDescription>Restock frequency and cost per item. Click a column to sort.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton href={`/api/export/usage?months=${months}`} label="Monthly usage" />
            <ExportButton href={`/api/export/movements?months=${months}`} label="All movements" />
            <ExportButton href="/api/export/inventory" label="Current inventory" />
          </div>
        </CardHeader>
        <CardContent>
          <ItemReportTable rows={itemRows} months={months} />
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ExportButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} download>
        <Download /> {label} CSV
      </a>
    </Button>
  );
}
