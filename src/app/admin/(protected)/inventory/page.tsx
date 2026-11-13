import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { byName } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/server";
import type { ItemStock } from "@/types/domain";

import { InventoryTable, type InventoryRow } from "./inventory-table";

export const metadata = { title: "Inventory · MERT Equipment" };

export default async function InventoryPage() {
  const supabase = await createClient();
  const [{ data: stock, error }, { data: batches }] = await Promise.all([
    supabase.from("v_item_stock").select("*"),
    supabase.from("v_next_backstock_batch").select("item_id, expiration_date, batch_qty"),
  ]);
  if (error) throw new Error(error.message);

  const batchByItem = new Map((batches ?? []).map((b) => [b.item_id, b]));
  const rows: InventoryRow[] = ((stock ?? []) as unknown as ItemStock[])
    .map((s) => ({
      ...s,
      name: s.name,
      nextBatchExp: batchByItem.get(s.item_id)?.expiration_date ?? null,
      nextBatchQty: batchByItem.get(s.item_id)?.batch_qty ?? null,
    }))
    .sort(byName);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground text-sm">
            Usable stock only: expired and out-of-service units are counted separately.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/new">
            <Plus /> New item
          </Link>
        </Button>
      </div>
      <InventoryTable rows={rows} />
    </div>
  );
}
