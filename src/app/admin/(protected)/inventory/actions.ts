"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dbError, type ActionResult } from "@/lib/admin/result";
import { createClient } from "@/lib/supabase/server";
import { EQUIPMENT_STATUSES, INVENTORY_LOCATIONS } from "@/types/domain";

// All writes run as the signed-in admin. Inventory quantities change ONLY via
// SQL RPCs (CLAUDE.md hard rule); catalog fields are plain table updates (RLS).

function refresh(itemId?: string) {
  revalidatePath("/admin", "layout");
  if (itemId) revalidatePath(`/admin/inventory/${itemId}`);
}

const qty = z.coerce.number().int().min(1, "Quantity must be at least 1").max(100000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

// ---------------------------------------------------------------------------
// Stock movements
// ---------------------------------------------------------------------------
const receiveSchema = z
  .object({
    itemId: z.uuid(),
    quantity: qty,
    location: z.enum(INVENTORY_LOCATIONS),
    noExpiry: z.boolean(),
    expirationDate: isoDate.optional().or(z.literal("")),
    lotNumber: z.string().trim().max(60).optional(),
    unitCost: z.union([z.literal(""), z.coerce.number().min(0).max(100000)]).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.noExpiry || !!v.expirationDate, {
    path: ["expirationDate"],
    message: "Enter the expiration date, or tick “No expiration date”.",
  });

export async function receiveStockAction(input: z.input<typeof receiveSchema>, tracksExpiration: boolean): Promise<ActionResult> {
  const parsed = receiveSchema.safeParse(tracksExpiration ? input : { ...input, noExpiry: true });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_receive_stock", {
    p_item_id: v.itemId,
    p_quantity: v.quantity,
    p_location: v.location,
    p_expiration_date: v.noExpiry || !v.expirationDate ? undefined : v.expirationDate,
    p_lot_number: v.lotNumber || undefined,
    p_unit_cost: v.unitCost === "" || v.unitCost === undefined ? undefined : v.unitCost,
    p_notes: v.notes || undefined,
  });
  if (error) return dbError(error, "Couldn't receive stock.");
  refresh(v.itemId);
  return { ok: true, message: `Received ${v.quantity}.` };
}

export async function moveNextBatchAction(itemId: string, quantity: number | null): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_move_next_batch", {
    p_item_id: itemId,
    p_quantity: quantity ?? undefined,
  });
  if (error) return dbError(error, "Couldn't move the batch.");
  refresh(itemId);
  return data === 0
    ? { ok: false, error: "Backstock has no usable stock for this item. Reorder." }
    : { ok: true, data: data ?? 0, message: `Moved ${data} to the Equipment Room.` };
}

export async function rebalanceAction(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_fefo_rebalance", { p_item_id: itemId });
  if (error) return dbError(error, "Couldn't update the records.");
  refresh(itemId);
  return { ok: true, message: "Records updated to match the swap." };
}

const lotActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("transfer"), lotId: z.uuid(), quantity: qty, to: z.enum(INVENTORY_LOCATIONS), reason: z.string().trim().max(300).optional() }),
  z.object({ kind: z.literal("status"), lotId: z.uuid(), quantity: qty, status: z.enum(EQUIPMENT_STATUSES), reason: z.string().trim().max(300).optional() }),
  z.object({ kind: z.literal("dispose"), lotId: z.uuid(), quantity: qty, reason: z.string().trim().min(1, "Give a reason").max(300) }),
  z.object({
    kind: z.literal("adjust"),
    lotId: z.uuid(),
    newQuantity: z.coerce.number().int().min(0).max(100000),
    reason: z.string().trim().min(1, "Give a reason").max(300),
  }),
]);
export type LotActionInput = z.input<typeof lotActionSchema>;

export async function lotAction(itemId: string, input: LotActionInput): Promise<ActionResult> {
  const parsed = lotActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const v = parsed.data;
  const supabase = await createClient();

  let error;
  switch (v.kind) {
    case "transfer":
      ({ error } = await supabase.rpc("admin_transfer_lot", {
        p_lot_id: v.lotId, p_quantity: v.quantity, p_to_location: v.to, p_reason: v.reason || undefined,
      }));
      break;
    case "status":
      ({ error } = await supabase.rpc("admin_set_lot_status", {
        p_lot_id: v.lotId, p_quantity: v.quantity, p_status: v.status, p_reason: v.reason || undefined,
      }));
      break;
    case "dispose":
      ({ error } = await supabase.rpc("admin_dispose_lot", { p_lot_id: v.lotId, p_quantity: v.quantity, p_reason: v.reason }));
      break;
    case "adjust":
      ({ error } = await supabase.rpc("admin_adjust_lot", { p_lot_id: v.lotId, p_new_quantity: v.newQuantity, p_reason: v.reason }));
      break;
  }
  if (error) return dbError(error, "Couldn't update the lot.");
  refresh(itemId);
  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  categoryId: z.uuid().nullable(),
  unit: z.string().trim().min(1).max(30),
  description: z.string().trim().max(300).optional(),
  tracksExpiration: z.boolean(),
  isEquipment: z.boolean(),
  roomParQty: z.coerce.number().int().min(0).max(100000),
  minBackstockQty: z.coerce.number().int().min(0).max(100000),
  unitCost: z.union([z.literal(""), z.coerce.number().min(0).max(100000)]).optional(),
  vendor: z.string().trim().max(120).optional(),
  vendorSku: z.string().trim().max(120).optional(),
  isArchived: z.boolean(),
});
export type ItemFormInput = z.input<typeof itemSchema>;

function toRow(v: z.output<typeof itemSchema>) {
  return {
    name: v.name,
    category_id: v.categoryId,
    unit: v.unit,
    description: v.description || null,
    tracks_expiration: v.tracksExpiration,
    is_equipment: v.isEquipment,
    room_par_qty: v.roomParQty,
    min_backstock_qty: v.minBackstockQty,
    unit_cost: v.unitCost === "" || v.unitCost === undefined ? null : v.unitCost,
    vendor: v.vendor || null,
    vendor_sku: v.vendorSku || null,
    is_archived: v.isArchived,
  };
}

export async function updateItemAction(itemId: string, input: ItemFormInput): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.from("items").update(toRow(parsed.data)).eq("id", itemId);
  if (error) return dbError(error, "Couldn't save the item.");
  // Thresholds changed -> recompute alerts now rather than at the next cron.
  await supabase.rpc("refresh_alerts");
  refresh(itemId);
  return { ok: true, message: "Item saved." };
}

export async function createItemAction(input: ItemFormInput): Promise<ActionResult<string>> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").insert(toRow(parsed.data)).select("id").single();
  if (error) return dbError(error, "Couldn't create the item.");
  await supabase.rpc("refresh_alerts");
  refresh();
  return { ok: true, data: data.id, message: "Item created." };
}

// Bulk threshold editor (inventory page "Edit pars").
const thresholdsSchema = z.array(
  z.object({
    itemId: z.uuid(),
    roomParQty: z.coerce.number().int().min(0).max(100000),
    minBackstockQty: z.coerce.number().int().min(0).max(100000),
  }),
).max(500);

export async function saveThresholdsAction(rows: z.input<typeof thresholdsSchema>): Promise<ActionResult> {
  const parsed = thresholdsSchema.safeParse(rows);
  if (!parsed.success) return { ok: false, error: "Pars and minimums must be whole numbers ≥ 0." };
  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map((r) =>
      supabase
        .from("items")
        .update({ room_par_qty: r.roomParQty, min_backstock_qty: r.minBackstockQty })
        .eq("id", r.itemId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbError(failed.error, "Some thresholds didn't save.");
  await supabase.rpc("refresh_alerts");
  refresh();
  return { ok: true, message: `Saved ${parsed.data.length} item${parsed.data.length === 1 ? "" : "s"}.` };
}
