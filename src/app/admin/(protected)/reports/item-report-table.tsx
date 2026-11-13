"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";

import { formatMoney } from "@/lib/admin/format";

export interface ItemReportRow {
  itemId: string;
  name: string;
  category: string;
  issued: number;
  restock: number;
  replacement: number;
  submissions: number;
  roomRefills: number;
  purchases: number;
  waste: number;
}

type Key = keyof Omit<ItemReportRow, "itemId">;
const COLUMNS: { key: Key; label: string; numeric?: boolean; money?: boolean }[] = [
  { key: "name", label: "Item" },
  { key: "issued", label: "Units taken", numeric: true },
  { key: "replacement", label: "…as replacements", numeric: true },
  { key: "submissions", label: "Submissions", numeric: true },
  { key: "roomRefills", label: "Room refills", numeric: true },
  { key: "purchases", label: "Purchased", numeric: true, money: true },
  { key: "waste", label: "Waste", numeric: true, money: true },
];

export function ItemReportTable({ rows, months }: { rows: ItemReportRow[]; months: number }) {
  // Default A–Z (owner preference); click a header to sort by that column.
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        const c = typeof av === "string" ? av.localeCompare(bv as string, undefined, { sensitivity: "base" }) : (av as number) - (bv as number);
        return c * sort.dir || a.name.localeCompare(b.name);
      }),
    [rows, sort],
  );

  if (rows.length === 0) return <p className="text-muted-foreground py-6 text-center text-sm">No activity in this period.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-muted-foreground text-left">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} className={c.numeric ? "py-2 pl-3 text-right font-medium" : "py-2 pr-3 font-medium"}>
                <button
                  type="button"
                  className="hover:text-foreground inline-flex items-center gap-1"
                  onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : c.numeric ? -1 : 1 }))}
                >
                  {c.label}
                  {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                </button>
              </th>
            ))}
            <th className="py-2 pl-3 text-right font-medium">Per month</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((r) => (
            <tr key={r.itemId}>
              <td className="py-2 pr-3">
                <Link href={`/admin/inventory/${r.itemId}`} className="hover:underline">
                  {r.name}
                </Link>
                <span className="text-muted-foreground block text-xs">{r.category}</span>
              </td>
              {COLUMNS.slice(1).map((c) => (
                <td key={c.key} className="py-2 pl-3 text-right tabular-nums">
                  {c.money ? formatMoney(r[c.key] as number) : (r[c.key] as number).toLocaleString()}
                </td>
              ))}
              <td className="text-muted-foreground py-2 pl-3 text-right tabular-nums">{(r.issued / months).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
