/**
 * Hand-written domain types mirroring the database (supabase/migrations).
 *
 * Once the project is linked to a Supabase instance, also generate the full
 * typed client schema with `npm run db:types` (writes src/types/database.ts)
 * and pass `Database` as the generic to the Supabase clients.
 * If you change an enum or view in SQL, update this file in the same change.
 */

/** equipment_room = accessible pool members restock from; backstock = locked reserve. */
export const INVENTORY_LOCATIONS = ["equipment_room", "backstock"] as const;
export type InventoryLocation = (typeof INVENTORY_LOCATIONS)[number];

export const EQUIPMENT_STATUSES = ["functional", "out_of_service"] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const SUBMISSION_REASONS = ["restock", "replacement"] as const;
export type SubmissionReason = (typeof SUBMISSION_REASONS)[number];

export const SUBMISSION_CONTEXTS = ["call", "bag_check", "other"] as const;
export type SubmissionContext = (typeof SUBMISSION_CONTEXTS)[number];

export const REPLACEMENT_CAUSES = ["expired", "broken", "damaged", "missing", "other"] as const;
export type ReplacementCause = (typeof REPLACEMENT_CAUSES)[number];

export type SubmissionStatus = "processed" | "flagged" | "reversed";
export type MovementType = "receive" | "issue" | "transfer" | "dispose" | "status_change" | "adjust";

export type AlertType =
  | "low_stock_room"
  | "low_stock_backstock"
  | "expiring_soon"
  | "expired"
  | "out_of_service"
  | "fefo_violation"
  | "stock_discrepancy"
  | "broken_equipment_reported";
export type AlertAudience = "equipment_officer" | "all";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type ExpiryState = "no_expiry" | "expired" | "expiring_soon" | "ok";

/** Row of public.v_item_stock */
export interface ItemStock {
  item_id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  category_sort_order: number | null;
  unit: string;
  is_equipment: boolean;
  tracks_expiration: boolean;
  is_archived: boolean;
  room_par_qty: number;
  min_backstock_qty: number;
  unit_cost: number | null;
  room_qty: number;
  backstock_qty: number;
  expired_qty: number;
  expiring_soon_qty: number;
  out_of_service_qty: number;
  next_room_expiration: string | null;
  next_backstock_expiration: string | null;
}

/** Row of public.v_lots */
export interface LotView {
  id: string;
  item_id: string;
  item_name: string;
  unit: string;
  location: InventoryLocation;
  status: EquipmentStatus;
  quantity: number;
  expiration_date: string | null;
  lot_number: string | null;
  received_on: string;
  unit_cost: number | null;
  notes: string | null;
  days_to_expiration: number | null;
  expiry_state: ExpiryState;
  /** 1 = use first. Null for unusable lots (expired / out of service). */
  fefo_rank: number | null;
}

/** Row of public.alerts */
export interface Alert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  audience: AlertAudience;
  item_id: string | null;
  lot_id: string | null;
  submission_id: string | null;
  title: string;
  message: string;
  dedupe_key: string;
  first_detected_at: string;
  last_detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  last_notified_severity: AlertSeverity | null;
  last_notified_at: string | null;
}

/** Row of public.v_next_backstock_batch */
export interface NextBackstockBatch {
  item_id: string;
  lot_id: string;
  expiration_date: string | null;
  batch_qty: number;
}

/** Row of public.v_monthly_item_usage */
export interface MonthlyItemUsage {
  month: string;
  item_id: string;
  item_name: string;
  category_id: string | null;
  issued_qty: number;
  issued_restock_qty: number;
  issued_replacement_qty: number;
  submission_count: number;
  disposed_qty: number;
  received_qty: number;
  room_refill_qty: number;
  room_refills: number;
  issued_cost: number;
  waste_cost: number;
  purchase_cost: number;
}

/** Input line for process_submission() */
export interface SubmissionLineInput {
  item_id: string;
  quantity: number;
  replacement_cause?: ReplacementCause | null;
}

/** Return value of process_submission() */
export interface SubmissionResult {
  submission_id: string;
  status: "processed" | "flagged";
  lines: Array<{
    item_id: string;
    item_name: string;
    quantity: number;
    /** Units taken that records said were not in the equipment room (recount needed). */
    discrepancy_qty: number;
  }>;
}
