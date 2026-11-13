import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCATION_LABEL, byName, expiryLabel, formatDate, formatMoney } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ItemStock, LotView } from "@/types/domain";

import { ItemForm } from "../item-form";
import { LotActions } from "./lot-actions";
import { ReceiveStockDialog } from "./receive-stock-dialog";
import { MoveNextBatchDialog, RebalanceButton } from "./stock-actions";

const MOVEMENT_LABEL: Record<string, string> = {
  receive: "Received",
  issue: "Taken by member",
  transfer: "Moved",
  dispose: "Disposed",
  status_change: "Status changed",
  adjust: "Count adjusted",
};

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const [{ data: item }, { data: stockRow }, { data: lots }, { data: batch }, { count: fefoCount }, { data: movements }, { data: alerts }, { data: categories }] =
    await Promise.all([
      supabase.from("items").select("*").eq("id", id).maybeSingle(),
      supabase.from("v_item_stock").select("*").eq("item_id", id).maybeSingle(),
      supabase.from("v_lots").select("*").eq("item_id", id),
      supabase.from("v_next_backstock_batch").select("*").eq("item_id", id).maybeSingle(),
      supabase.from("v_fefo_violations").select("item_id", { count: "exact", head: true }).eq("item_id", id),
      supabase
        .from("inventory_movements")
        .select("id, occurred_at, movement_type, quantity, from_location, to_location, to_status, expiration_date, reason, actor")
        .eq("item_id", id)
        .order("occurred_at", { ascending: false })
        .limit(30),
      supabase.from("alerts").select("id, severity, title, message").eq("item_id", id).eq("status", "open"),
      supabase.from("item_categories").select("id, name"),
    ]);
  if (!item || !stockRow) notFound();

  const stock = stockRow as unknown as ItemStock;
  const lotRows = ((lots ?? []) as unknown as LotView[]).sort(
    (a, b) =>
      (a.fefo_rank ?? 9999) - (b.fefo_rank ?? 9999) ||
      (a.expiration_date ?? "9999").localeCompare(b.expiration_date ?? "9999"),
  );
  const shortfall = Math.max(stock.room_par_qty - stock.room_qty, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/inventory" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
          <ArrowLeft className="size-4" /> Inventory
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{item.name}</h1>
            <p className="text-muted-foreground text-sm">
              {stock.category_name ?? "Uncategorized"} · {item.unit}
              {item.tracks_expiration ? " · tracks expiration" : " · no expiration"}
              {item.is_equipment && " · equipment"}
              {item.is_archived && " · archived"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MoveNextBatchDialog
              itemId={item.id}
              unit={item.unit}
              batchQty={batch?.batch_qty ?? 0}
              batchExp={batch?.expiration_date ?? null}
              suggested={shortfall}
            />
            <ReceiveStockDialog itemId={item.id} unit={item.unit} tracksExpiration={item.tracks_expiration} defaultCost={item.unit_cost} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Equipment Room" value={stock.room_qty} sub={`par ${stock.room_par_qty || "not set"}`} bad={stock.room_par_qty > 0 && stock.room_qty < stock.room_par_qty} />
        <Stat label="Backstock" value={stock.backstock_qty} sub={`min ${stock.min_backstock_qty || "not set"}`} bad={stock.min_backstock_qty > 0 && stock.backstock_qty < stock.min_backstock_qty} />
        <Stat label="Expired / expiring" value={`${stock.expired_qty} / ${stock.expiring_soon_qty}`} sub="next 60 days" bad={stock.expired_qty > 0} />
        <Stat label="Out of service" value={stock.out_of_service_qty} sub={formatMoney(item.unit_cost) + " each"} />
      </div>

      {(fefoCount ?? 0) > 0 && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>FEFO swap needed</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Backstock holds units that expire sooner than what’s in the Equipment Room. Physically swap them, then
              update the records.
            </p>
            <RebalanceButton itemId={item.id} />
          </AlertDescription>
        </Alert>
      )}

      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {alerts.map((a) => (
                <li key={a.id} className="flex gap-2">
                  <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "secondary" : "outline"}>
                    {a.severity}
                  </Badge>
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Lots */}
      <Card>
        <CardHeader>
          <CardTitle>Stock by batch</CardTitle>
          <CardDescription>
            Ordered first-expired-first-out. #1 is the batch to use next; the Equipment Room should only hold the top
            batches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lotRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No stock recorded. Use “Receive stock” to add some.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-muted-foreground text-left">
                  <tr>
                    <th className="py-2 pr-3 font-medium">FEFO</th>
                    <th className="py-2 pr-3 font-medium">Location</th>
                    <th className="py-2 pr-3 text-right font-medium">Qty</th>
                    <th className="py-2 pr-3 font-medium">Expires</th>
                    <th className="py-2 pr-3 font-medium">Lot #</th>
                    <th className="py-2 pr-3 font-medium">Received</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lotRows.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 pr-3">
                        {l.fefo_rank ? (
                          <Badge variant={l.fefo_rank === 1 ? "default" : "outline"}>#{l.fefo_rank}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {LOCATION_LABEL[l.location]}
                        {l.status === "out_of_service" && (
                          <Badge variant="outline" className="ml-2">
                            out of service
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{l.quantity}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={cn(l.expiry_state === "expired" && "text-destructive font-medium", l.expiry_state === "expiring_soon" && "font-medium text-amber-600")}>
                          {l.expiration_date ? formatDate(l.expiration_date) : "No expiry"}
                        </span>
                        {l.expiration_date && (
                          <span className="text-muted-foreground block text-xs">{expiryLabel(l.expiry_state, l.days_to_expiration)}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{l.lot_number ?? "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(l.received_on)}</td>
                      <td className="py-2 text-right">
                        <LotActions
                          itemId={item.id}
                          isEquipment={item.is_equipment}
                          lot={{ id: l.id, location: l.location, status: l.status, quantity: l.quantity, expiryState: l.expiry_state }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item settings */}
      <Card>
        <CardHeader>
          <CardTitle>Item settings</CardTitle>
          <CardDescription>Name, thresholds, cost and how the item is tracked.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemForm item={item} categories={(categories ?? []).sort(byName)} />
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Last 30 changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {!movements?.length ? (
            <p className="text-muted-foreground text-sm">No history yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {movements.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                  <span className="text-muted-foreground w-32 shrink-0 text-xs">{format(new Date(m.occurred_at), "MMM d, h:mm a")}</span>
                  <span className="font-medium">
                    {MOVEMENT_LABEL[m.movement_type] ?? m.movement_type} {m.quantity > 0 && m.movement_type === "adjust" ? "+" : ""}
                    {m.quantity}
                  </span>
                  <span className="text-muted-foreground">
                    {m.from_location && m.to_location && m.from_location !== m.to_location
                      ? `${LOCATION_LABEL[m.from_location]} → ${LOCATION_LABEL[m.to_location]}`
                      : m.from_location
                        ? LOCATION_LABEL[m.from_location]
                        : m.to_location
                          ? LOCATION_LABEL[m.to_location]
                          : ""}
                    {m.to_status === "out_of_service" && m.movement_type === "status_change" ? " · out of service" : ""}
                    {m.expiration_date ? ` · exp ${formatDate(m.expiration_date)}` : ""}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {m.actor.startsWith("member:") ? m.actor.slice(7) : m.actor}
                    {m.reason ? ` · ${m.reason}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, bad }: { label: string; value: number | string; sub: string; bad?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", bad && "text-destructive")}>{value}</p>
      <p className="text-muted-foreground text-xs">{sub}</p>
    </div>
  );
}
