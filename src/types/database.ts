
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  "public": {
          Tables: {
            "admin_users": {
                  Row: {
                    "created_at": string,"label": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"label"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"label"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"alert_recipients": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"is_active": boolean,"name": string,"notify_email": boolean,"notify_sms": boolean,"phone_e164": string | null,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"notify_email"?: boolean,"notify_sms"?: boolean,"phone_e164"?: string | null,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"notify_email"?: boolean,"notify_sms"?: boolean,"phone_e164"?: string | null,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"alerts": {
                  Row: {
                    "acknowledged_at": string | null,"alert_type": Database["public"]['Enums']["alert_type"],"audience": Database["public"]['Enums']["alert_audience"],"dedupe_key": string,"first_detected_at": string,"id": string,"item_id": string | null,"last_detected_at": string,"last_notified_at": string | null,"last_notified_severity": Database["public"]['Enums']["alert_severity"] | null,"lot_id": string | null,"message": string,"resolved_at": string | null,"severity": Database["public"]['Enums']["alert_severity"],"status": Database["public"]['Enums']["alert_status"],"submission_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"alert_type": Database["public"]['Enums']["alert_type"],"audience"?: Database["public"]['Enums']["alert_audience"],"dedupe_key": string,"first_detected_at"?: string,"id"?: string,"item_id"?: string | null,"last_detected_at"?: string,"last_notified_at"?: string | null,"last_notified_severity"?: Database["public"]['Enums']["alert_severity"] | null,"lot_id"?: string | null,"message": string,"resolved_at"?: string | null,"severity": Database["public"]['Enums']["alert_severity"],"status"?: Database["public"]['Enums']["alert_status"],"submission_id"?: string | null,"title": string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"alert_type"?: Database["public"]['Enums']["alert_type"],"audience"?: Database["public"]['Enums']["alert_audience"],"dedupe_key"?: string,"first_detected_at"?: string,"id"?: string,"item_id"?: string | null,"last_detected_at"?: string,"last_notified_at"?: string | null,"last_notified_severity"?: Database["public"]['Enums']["alert_severity"] | null,"lot_id"?: string | null,"message"?: string,"resolved_at"?: string | null,"severity"?: Database["public"]['Enums']["alert_severity"],"status"?: Database["public"]['Enums']["alert_status"],"submission_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "alerts_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "inventory_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_fefo_violations"
      referencedColumns: ["backstock_lot_id"]
    },{
      foreignKeyName: "alerts_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_fefo_violations"
      referencedColumns: ["room_lot_id"]
    },{
      foreignKeyName: "alerts_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_next_backstock_batch"
      referencedColumns: ["lot_id"]
    },{
      foreignKeyName: "alerts_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"app_secrets": {
                  Row: {
                    "id": number,"member_pin_hash": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"member_pin_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "id"?: number,"member_pin_hash"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"app_settings": {
                  Row: {
                    "email_enabled": boolean,"expiration_warning_days": number,"id": number,"org_name": string,"sms_enabled": boolean,"sms_min_severity": Database["public"]['Enums']["alert_severity"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email_enabled"?: boolean,"expiration_warning_days"?: number,"id"?: number,"org_name"?: string,"sms_enabled"?: boolean,"sms_min_severity"?: Database["public"]['Enums']["alert_severity"],"updated_at"?: string
                  }
                  Update: {
                    "email_enabled"?: boolean,"expiration_warning_days"?: number,"id"?: number,"org_name"?: string,"sms_enabled"?: boolean,"sms_min_severity"?: Database["public"]['Enums']["alert_severity"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inventory_lots": {
                  Row: {
                    "created_at": string,"expiration_date": string | null,"id": string,"item_id": string,"location": Database["public"]['Enums']["inventory_location"],"lot_number": string | null,"notes": string | null,"quantity": number,"received_on": string,"status": Database["public"]['Enums']["equipment_status"],"unit_cost": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expiration_date"?: string | null,"id"?: string,"item_id": string,"location": Database["public"]['Enums']["inventory_location"],"lot_number"?: string | null,"notes"?: string | null,"quantity": number,"received_on"?: string,"status"?: Database["public"]['Enums']["equipment_status"],"unit_cost"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"expiration_date"?: string | null,"id"?: string,"item_id"?: string,"location"?: Database["public"]['Enums']["inventory_location"],"lot_number"?: string | null,"notes"?: string | null,"quantity"?: number,"received_on"?: string,"status"?: Database["public"]['Enums']["equipment_status"],"unit_cost"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    }
                  ]
                },"inventory_movements": {
                  Row: {
                    "actor": string,"expiration_date": string | null,"from_location": Database["public"]['Enums']["inventory_location"] | null,"from_status": Database["public"]['Enums']["equipment_status"] | null,"id": number,"item_id": string,"lot_id": string | null,"movement_type": Database["public"]['Enums']["movement_type"],"occurred_at": string,"quantity": number,"reason": string | null,"submission_id": string | null,"submission_line_id": string | null,"to_location": Database["public"]['Enums']["inventory_location"] | null,"to_status": Database["public"]['Enums']["equipment_status"] | null,"unit_cost": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"expiration_date"?: string | null,"from_location"?: Database["public"]['Enums']["inventory_location"] | null,"from_status"?: Database["public"]['Enums']["equipment_status"] | null,"id"?: never,"item_id": string,"lot_id"?: string | null,"movement_type": Database["public"]['Enums']["movement_type"],"occurred_at"?: string,"quantity": number,"reason"?: string | null,"submission_id"?: string | null,"submission_line_id"?: string | null,"to_location"?: Database["public"]['Enums']["inventory_location"] | null,"to_status"?: Database["public"]['Enums']["equipment_status"] | null,"unit_cost"?: number | null
                  }
                  Update: {
                    "actor"?: string,"expiration_date"?: string | null,"from_location"?: Database["public"]['Enums']["inventory_location"] | null,"from_status"?: Database["public"]['Enums']["equipment_status"] | null,"id"?: never,"item_id"?: string,"lot_id"?: string | null,"movement_type"?: Database["public"]['Enums']["movement_type"],"occurred_at"?: string,"quantity"?: number,"reason"?: string | null,"submission_id"?: string | null,"submission_line_id"?: string | null,"to_location"?: Database["public"]['Enums']["inventory_location"] | null,"to_status"?: Database["public"]['Enums']["equipment_status"] | null,"unit_cost"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "inventory_movements_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "inventory_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_fefo_violations"
      referencedColumns: ["backstock_lot_id"]
    },{
      foreignKeyName: "inventory_movements_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_fefo_violations"
      referencedColumns: ["room_lot_id"]
    },{
      foreignKeyName: "inventory_movements_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_lot_id_fkey"
      columns: ["lot_id"]
isOneToOne: false
      referencedRelation: "v_next_backstock_batch"
      referencedColumns: ["lot_id"]
    },{
      foreignKeyName: "inventory_movements_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_submission_line_id_fkey"
      columns: ["submission_line_id"]
isOneToOne: false
      referencedRelation: "submission_lines"
      referencedColumns: ["id"]
    }
                  ]
                },"item_categories": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"items": {
                  Row: {
                    "category_id": string | null,"created_at": string,"description": string | null,"id": string,"is_archived": boolean,"is_equipment": boolean,"min_backstock_qty": number,"name": string,"room_par_qty": number,"tracks_expiration": boolean,"unit": string,"unit_cost": number | null,"updated_at": string,"vendor": string | null,"vendor_sku": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_archived"?: boolean,"is_equipment"?: boolean,"min_backstock_qty"?: number,"name": string,"room_par_qty"?: number,"tracks_expiration"?: boolean,"unit"?: string,"unit_cost"?: number | null,"updated_at"?: string,"vendor"?: string | null,"vendor_sku"?: string | null
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_archived"?: boolean,"is_equipment"?: boolean,"min_backstock_qty"?: number,"name"?: string,"room_par_qty"?: number,"tracks_expiration"?: boolean,"unit"?: string,"unit_cost"?: number | null,"updated_at"?: string,"vendor"?: string | null,"vendor_sku"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "item_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_log": {
                  Row: {
                    "alert_ids": (string)[],"body": string,"channel": Database["public"]['Enums']["notification_channel"],"created_at": string,"destination": string,"error": string | null,"id": number,"recipient_id": string | null,"status": Database["public"]['Enums']["notification_status"],"subject": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_ids"?: (string)[],"body": string,"channel": Database["public"]['Enums']["notification_channel"],"created_at"?: string,"destination": string,"error"?: string | null,"id"?: never,"recipient_id"?: string | null,"status": Database["public"]['Enums']["notification_status"],"subject"?: string | null
                  }
                  Update: {
                    "alert_ids"?: (string)[],"body"?: string,"channel"?: Database["public"]['Enums']["notification_channel"],"created_at"?: string,"destination"?: string,"error"?: string | null,"id"?: never,"recipient_id"?: string | null,"status"?: Database["public"]['Enums']["notification_status"],"subject"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_log_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "alert_recipients"
      referencedColumns: ["id"]
    }
                  ]
                },"pin_attempts": {
                  Row: {
                    "attempted_at": string,"client_hash": string,"id": number,"success": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"client_hash": string,"id"?: never,"success": boolean
                  }
                  Update: {
                    "attempted_at"?: string,"client_hash"?: string,"id"?: never,"success"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"submission_lines": {
                  Row: {
                    "created_at": string,"discrepancy_qty": number,"id": string,"item_id": string,"quantity": number,"replacement_cause": Database["public"]['Enums']["replacement_cause"] | null,"submission_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"discrepancy_qty"?: number,"id"?: string,"item_id": string,"quantity": number,"replacement_cause"?: Database["public"]['Enums']["replacement_cause"] | null,"submission_id": string
                  }
                  Update: {
                    "created_at"?: string,"discrepancy_qty"?: number,"id"?: string,"item_id"?: string,"quantity"?: number,"replacement_cause"?: Database["public"]['Enums']["replacement_cause"] | null,"submission_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_lines_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_lines_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "submission_lines_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "call_reference": string | null,"context": Database["public"]['Enums']["submission_context"],"created_at": string,"id": string,"notes": string | null,"processed_at": string | null,"reason": Database["public"]['Enums']["submission_reason"],"reversed_at": string | null,"status": Database["public"]['Enums']["submission_status"],"submitted_by_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "call_reference"?: string | null,"context"?: Database["public"]['Enums']["submission_context"],"created_at"?: string,"id"?: string,"notes"?: string | null,"processed_at"?: string | null,"reason": Database["public"]['Enums']["submission_reason"],"reversed_at"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitted_by_name": string
                  }
                  Update: {
                    "call_reference"?: string | null,"context"?: Database["public"]['Enums']["submission_context"],"created_at"?: string,"id"?: string,"notes"?: string | null,"processed_at"?: string | null,"reason"?: Database["public"]['Enums']["submission_reason"],"reversed_at"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitted_by_name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "v_fefo_violations": {
                  Row: {
                    "backstock_expiration": string | null,"backstock_lot_id": string,"backstock_quantity": number,"item_id": string,"item_name": string,"room_expiration": string | null,"room_lot_id": string,"room_quantity": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    }
                  ]
                },"v_item_stock": {
                  Row: {
                    "backstock_qty": number | null,"category_id": string | null,"category_name": string | null,"category_sort_order": number | null,"expired_qty": number | null,"expiring_soon_qty": number | null,"is_archived": boolean,"is_equipment": boolean,"item_id": string,"min_backstock_qty": number,"name": string,"next_backstock_expiration": string | null,"next_room_expiration": string | null,"out_of_service_qty": number | null,"room_par_qty": number,"room_qty": number | null,"tracks_expiration": boolean,"unit": string,"unit_cost": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "item_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"v_lots": {
                  Row: {
                    "created_at": string,"days_to_expiration": number | null,"expiration_date": string | null,"expiry_state": string | null,"fefo_rank": number | null,"id": string,"item_id": string,"item_name": string,"location": Database["public"]['Enums']["inventory_location"],"lot_number": string | null,"notes": string | null,"quantity": number,"received_on": string,"status": Database["public"]['Enums']["equipment_status"],"unit": string,"unit_cost": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    }
                  ]
                },"v_monthly_item_usage": {
                  Row: {
                    "category_id": string | null,"disposed_qty": number | null,"issued_cost": number | null,"issued_qty": number | null,"issued_replacement_qty": number | null,"issued_restock_qty": number | null,"item_id": string,"item_name": string,"month": string | null,"purchase_cost": number | null,"received_qty": number | null,"room_refill_qty": number | null,"room_refills": number | null,"submission_count": number | null,"waste_cost": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    },{
      foreignKeyName: "items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "item_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"v_next_backstock_batch": {
                  Row: {
                    "batch_qty": number | null,"expiration_date": string | null,"item_id": string,"lot_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_lots_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "v_item_stock"
      referencedColumns: ["item_id"]
    }
                  ]
                }
          }
          Functions: {
            "_add_to_lot":
{ Args: { "p_expiration_date": string,"p_item_id": string,"p_location": Database["public"]['Enums']["inventory_location"],"p_lot_number": string,"p_notes"?: string,"p_quantity": number,"p_received_on"?: string,"p_status": Database["public"]['Enums']["equipment_status"],"p_unit_cost": number }; Returns: string
                           },
"_assert_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"_assert_room_fefo":
{ Args: { "p_exclude_lot"?: string,"p_expiration_date": string,"p_item_id": string }; Returns: undefined
                           },
"_lot_move":
{ Args: { "p_actor": string,"p_lot_id": string,"p_movement_type": Database["public"]['Enums']["movement_type"],"p_quantity": number,"p_reason"?: string,"p_submission_id"?: string,"p_submission_line_id"?: string,"p_to_location"?: Database["public"]['Enums']["inventory_location"],"p_to_status"?: Database["public"]['Enums']["equipment_status"] }; Returns: string
                           },
"_refresh_alerts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_adjust_lot":
{ Args: { "p_lot_id": string,"p_new_quantity": number,"p_reason": string }; Returns: undefined
                           },
"admin_dispose_lot":
{ Args: { "p_lot_id": string,"p_quantity": number,"p_reason": string }; Returns: undefined
                           },
"admin_fefo_rebalance":
{ Args: { "p_item_id": string }; Returns: number
                           },
"admin_move_next_batch":
{ Args: { "p_item_id": string,"p_quantity"?: number }; Returns: number
                           },
"admin_receive_stock":
{ Args: { "p_expiration_date"?: string,"p_item_id": string,"p_location"?: Database["public"]['Enums']["inventory_location"],"p_lot_number"?: string,"p_notes"?: string,"p_quantity": number,"p_received_on"?: string,"p_unit_cost"?: number }; Returns: string
                           },
"admin_set_lot_status":
{ Args: { "p_lot_id": string,"p_quantity": number,"p_reason"?: string,"p_status": Database["public"]['Enums']["equipment_status"] }; Returns: string
                           },
"admin_set_member_pin":
{ Args: { "p_pin": string }; Returns: undefined
                           },
"admin_transfer_lot":
{ Args: { "p_lot_id": string,"p_quantity": number,"p_reason"?: string,"p_to_location": Database["public"]['Enums']["inventory_location"] }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"process_submission":
{ Args: { "p_call_reference"?: string,"p_context": Database["public"]['Enums']["submission_context"],"p_lines": Json,"p_notes"?: string,"p_reason": Database["public"]['Enums']["submission_reason"],"p_submitted_by_name": string }; Returns: Json
                           },
"refresh_alerts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"verify_member_pin":
{ Args: { "p_client_hash": string,"p_pin": string }; Returns: Json
                           }
          }
          Enums: {
            "alert_audience": "equipment_officer"|"all","alert_severity": "info"|"warning"|"critical","alert_status": "open"|"acknowledged"|"resolved","alert_type": "low_stock_room"|"low_stock_backstock"|"expiring_soon"|"expired"|"out_of_service"|"fefo_violation"|"stock_discrepancy"|"broken_equipment_reported","equipment_status": "functional"|"out_of_service","inventory_location": "equipment_room"|"backstock","movement_type": "receive"|"issue"|"transfer"|"dispose"|"status_change"|"adjust","notification_channel": "email"|"sms","notification_status": "sent"|"failed"|"skipped","replacement_cause": "expired"|"broken"|"damaged"|"missing"|"other","submission_context": "call"|"bag_check"|"other","submission_reason": "restock"|"replacement","submission_status": "processed"|"flagged"|"reversed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "alert_audience": ["equipment_officer", "all"],"alert_severity": ["info", "warning", "critical"],"alert_status": ["open", "acknowledged", "resolved"],"alert_type": ["low_stock_room", "low_stock_backstock", "expiring_soon", "expired", "out_of_service", "fefo_violation", "stock_discrepancy", "broken_equipment_reported"],"equipment_status": ["functional", "out_of_service"],"inventory_location": ["equipment_room", "backstock"],"movement_type": ["receive", "issue", "transfer", "dispose", "status_change", "adjust"],"notification_channel": ["email", "sms"],"notification_status": ["sent", "failed", "skipped"],"replacement_cause": ["expired", "broken", "damaged", "missing", "other"],"submission_context": ["call", "bag_check", "other"],"submission_reason": ["restock", "replacement"],"submission_status": ["processed", "flagged", "reversed"]
          }
        }
} as const
