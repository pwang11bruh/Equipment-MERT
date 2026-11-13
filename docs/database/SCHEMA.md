# Database Schema

Source of truth: `supabase/migrations/*.sql`. This file explains it. Update it whenever you add a migration.

## Migrations
| File | Contents |
| --- | --- |
| `20261113000100_core_schema.sql` | Extensions, enums, tables, indexes, `set_updated_at` trigger |
| `20261113000200_inventory_logic.sql` | Views, lot primitives, `process_submission`, admin RPCs, alerts engine, PIN functions |
| `20261113000300_security.sql` | Grants, RLS enablement, policies |

## Entity overview
```
item_categories 1─* items 1─* inventory_lots
                       │            │
                       │            └─* inventory_movements *─1 submissions 1─* submission_lines
                       └─* alerts (item_id / lot_id / submission_id)
alert_recipients 1─* notification_log
admin_users ─ auth.users      app_settings (singleton)      app_secrets (singleton)      pin_attempts
```

## Enums
| Enum | Values |
| --- | --- |
| `inventory_location` | `equipment_room` (member-accessible pool), `backstock` (locked reserve) |
| `equipment_status` | `functional`, `out_of_service` |
| `submission_reason` | `restock` (items used), `replacement` (items bad/missing) |
| `submission_context` | `call`, `bag_check`, `other` |
| `replacement_cause` | `expired`, `broken`, `damaged`, `missing`, `other` |
| `submission_status` | `processed`, `flagged`, `reversed` (reversal is not implemented yet) |
| `movement_type` | `receive`, `issue` (member took it for a bag), `transfer`, `dispose`, `status_change`, `adjust` |
| `alert_type` | `low_stock_room`, `low_stock_backstock`, `expiring_soon`, `expired`, `out_of_service`, `fefo_violation`, `stock_discrepancy`, `broken_equipment_reported` |
| `alert_audience` | `equipment_officer`, `all` (officer + board) |
| `alert_severity` | `info` < `warning` < `critical` (the declaration order is used in comparisons) |
| `alert_status` | `open`, `acknowledged`, `resolved` |
| `notification_channel` / `notification_status` | `email`, `sms` / `sent`, `failed`, `skipped` |

## Tables

### `items`: catalog
Columns: `name` (unique, case-insensitive), `category_id`, `description`, `unit` (each/pair/kit…), `tracks_expiration`, `is_equipment` (can be marked out of service instead of disposed), `room_par_qty` (equipment room par; alert below it), `min_backstock_qty` (reorder below it; 0 disables either alert), `unit_cost` (default cost), `vendor`, `vendor_sku`, `is_archived` (hidden from the member form and from alerts).

### `item_categories`
`name` (unique) and `sort_order`; used to group the member form.

### `inventory_lots`: on-hand stock
One row per (item, location, status, expiration_date, lot_number, unit_cost). Other columns: `quantity ≥ 0`, `received_on`, `notes`.
Lots at 0 are kept rather than deleted, so ledger links survive; the views filter on `quantity > 0`.
**Never written directly**: the API role has no write grant. See BUSINESS_LOGIC.md.

### `inventory_movements`: append-only ledger
Fields:
- `movement_type`, `quantity`; positive except for `adjust`, which stores the signed delta
- `from_location`/`to_location`, `from_status`/`to_status`
- snapshots of `unit_cost` and `expiration_date`
- `submission_id`, `submission_line_id`, `reason`
- `actor`: `admin`, `member:<name>` or `system`

All analytics derive from this table.

### `submissions` / `submission_lines`
These hold the member form. Each line stores `quantity`, `replacement_cause` and `discrepancy_qty` (the member took more than the records show in the equipment room).

### `alerts`
- `audience` (`equipment_officer` | `all`) routes notifications.
- `dedupe_key` identifies the condition, e.g. `low_room:<item>`, `low_backstock:<item>`, `expiring:<lot>`, `expired:<lot>`, `oos:<lot>`, `fefo:<item>`, `discrepancy:<line>`, `broken:<line>`. A partial unique index allows only one non-resolved alert per key.
- `last_notified_severity` and `last_notified_at` are used by the dispatcher.

### `alert_recipients`
`name`, `role` (`equipment_officer` | `board` | `other`), `email`, `phone_e164` (validated `+15551234567`), `notify_email`, `notify_sms`, `is_active`.

### `notification_log`
One row per email or SMS attempt. Columns: `channel`, `destination`, `subject`, `body`, `alert_ids[]`, `status`, `error`.

### `app_settings` (singleton, id = 1)
`org_name`, `expiration_warning_days` (default 60), `sms_min_severity` (default `critical`), `email_enabled`, `sms_enabled`.

### `app_secrets` (singleton, no API access)
`member_pin_hash` (bcrypt).

### `pin_attempts`
`client_hash`, `success`, `attempted_at`. Used for rate limiting and purged after 30 days.

### `admin_users`
`user_id` → `auth.users.id`. This is the shared admin account.

## Views (all `security_invoker`, so RLS applies)
| View | One row per | Key columns |
| --- | --- | --- |
| `v_item_stock` | item | `room_qty`, `backstock_qty` (usable only: functional and not expired), `expired_qty`, `expiring_soon_qty`, `out_of_service_qty`, `next_room_expiration`, `next_backstock_expiration`, plus thresholds |
| `v_next_backstock_batch` | item with usable backstock | `lot_id`, `expiration_date`, `batch_qty`: the batch the officer should move into the room next |
| `v_lots` | lot with qty > 0 | `days_to_expiration`, `expiry_state` (`no_expiry`/`expired`/`expiring_soon`/`ok`), `fefo_rank` (1 = use first; null if unusable) |
| `v_fefo_violations` | (room lot, earlier-expiring backstock lot) pair | `item_id`, `room_expiration`, `backstock_expiration` |
| `v_monthly_item_usage` | month × item | `issued_qty`, `issued_restock_qty`, `issued_replacement_qty`, `submission_count`, `disposed_qty`, `received_qty`, `room_refill_qty`, `room_refills`, `issued_cost`, `waste_cost`, `purchase_cost` |

## Functions (RPC surface)
| Function | Caller | Purpose |
| --- | --- | --- |
| `is_admin()` | authenticated | Used by RLS and the admin layout |
| `verify_member_pin(pin, client_hash)` → `{ok, locked}` | service_role | PIN gate with rate limiting |
| `process_submission(name, reason, context, lines jsonb, call_ref?, notes?)` → `{submission_id, status, lines[]}` | service_role | Issues items from the equipment room (FEFO) |
| `refresh_alerts()` → open count | admin, service_role | Recompute alerts |
| `admin_set_member_pin(pin)` | admin | Rotate the member PIN |
| `admin_receive_stock(item, qty, location='backstock', exp?, lot#?, cost?, received_on?, notes?)` → lot id | admin | New stock (FEFO-checked if received into the room) |
| `admin_transfer_lot(lot, qty, to_location, reason?)` | admin | Move between the room and backstock. Moving into the room is FEFO-enforced. |
| `admin_set_lot_status(lot, qty, status, reason?)` | admin | Mark functional or out of service |
| `admin_dispose_lot(lot, qty, reason)` | admin | Throw away |
| `admin_adjust_lot(lot, new_qty, reason)` | admin | Physical count correction |
| `admin_fefo_rebalance(item)` → moves | admin | After a physical swap, align the records with FEFO |

Internal helpers have no grants: `_assert_admin`, `_assert_room_fefo`, `_add_to_lot`, `_lot_move`, `_refresh_alerts` and `set_updated_at`.
