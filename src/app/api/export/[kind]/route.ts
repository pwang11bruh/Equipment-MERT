import { NextResponse, type NextRequest } from "next/server";
import { format, startOfMonth, subMonths } from "date-fns";

import { byName } from "@/lib/admin/format";
import { toCsv } from "@/lib/csv";
import { createClient, isAdminRequest } from "@/lib/supabase/server";
import type { ItemStock, MonthlyItemUsage } from "@/types/domain";

export const dynamic = "force-dynamic";

/**
 * Admin-only CSV exports (Reports page).
 *   /api/export/inventory            current stock per item (A–Z)
 *   /api/export/usage?months=12      monthly usage/spend per item
 *   /api/export/movements?months=12  full movement ledger
 * Queries run as the signed-in admin, so RLS applies on top of the check below.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kind } = await params;
  const months = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("months") ?? "12", 10) || 12, 1), 120);
  const since = startOfMonth(subMonths(new Date(), months - 1));
  const supabase = await createClient();
  const stamp = format(new Date(), "yyyy-MM-dd");

  let csv: string;
  let filename: string;

  if (kind === "inventory") {
    const { data, error } = await supabase.from("v_item_stock").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = ((data ?? []) as unknown as ItemStock[]).sort(byName);
    csv = toCsv(
      ["Item", "Category", "Unit", "Equipment Room (usable)", "Room par", "Backstock (usable)", "Backstock min", "Expired", "Expiring soon", "Out of service", "Next room expiration", "Next backstock expiration", "Unit cost", "Archived"],
      rows.map((r) => [r.name, r.category_name, r.unit, r.room_qty, r.room_par_qty, r.backstock_qty, r.min_backstock_qty, r.expired_qty, r.expiring_soon_qty, r.out_of_service_qty, r.next_room_expiration, r.next_backstock_expiration, r.unit_cost, r.is_archived]),
    );
    filename = `mert-inventory-${stamp}.csv`;
  } else if (kind === "usage") {
    const { data, error } = await supabase.from("v_monthly_item_usage").select("*").gte("month", format(since, "yyyy-MM-dd"));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = ((data ?? []) as unknown as MonthlyItemUsage[]).sort((a, b) => a.month.localeCompare(b.month) || a.item_name.localeCompare(b.item_name));
    csv = toCsv(
      ["Month", "Item", "Issued (total)", "Issued for restock", "Issued for replacement", "Submissions", "Disposed", "Received", "Moved to Equipment Room", "Room refills", "Issued cost", "Waste cost", "Purchase cost"],
      rows.map((r) => [r.month.slice(0, 7), r.item_name, r.issued_qty, r.issued_restock_qty, r.issued_replacement_qty, r.submission_count, r.disposed_qty, r.received_qty, r.room_refill_qty, r.room_refills, r.issued_cost, r.waste_cost, r.purchase_cost]),
    );
    filename = `mert-usage-${months}mo-${stamp}.csv`;
  } else if (kind === "movements") {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("occurred_at, movement_type, quantity, from_location, to_location, from_status, to_status, expiration_date, unit_cost, reason, actor, items(name)")
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: true })
      .limit(50000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    csv = toCsv(
      ["When", "Item", "Type", "Quantity", "From", "To", "From status", "To status", "Expiration", "Unit cost", "Reason", "By"],
      (data ?? []).map((m) => [
        format(new Date(m.occurred_at), "yyyy-MM-dd HH:mm"),
        m.items?.name,
        m.movement_type,
        m.quantity,
        m.from_location,
        m.to_location,
        m.from_status,
        m.to_status,
        m.expiration_date,
        m.unit_cost,
        m.reason,
        m.actor.startsWith("member:") ? m.actor.slice(7) : m.actor,
      ]),
    );
    filename = `mert-movements-${months}mo-${stamp}.csv`;
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
