# Business Logic

All inventory rules live in Postgres (`20261113000200_inventory_logic.sql`). TypeScript code only calls the RPCs.

## 0. Storage model (ADR-008)
| Location | Who touches it | Rule |
| --- | --- | --- |
| `equipment_room` | Members take items from here to restock their bags | It must only hold the **earliest-expiring batch(es)** of each item |
| `backstock` | Only the Equipment Officer (admin) | Members never see it and the form cannot draw from it. The officer moves the next batch into the room when an alert says so. |

Bags are **not tracked**. When a member takes an item for a bag, it leaves inventory (movement `issue`).

## 0.5 Items that expire only for some brands
`tracks_expiration = true` means the item **may** carry an expiry date. Examples: SuperSani wipes expire and SaniZide don't; Hudson RCI NRB masks and O2 tubing expire and McKesson don't.
- `admin_receive_stock` accepts a null date for these, meaning "this unit has no expiry".
- The admin UI must ask for the date and offer an explicit **"No expiration date on this unit"** checkbox.
- Lots without a date sort **last** in FEFO.

## 1. Usable stock
A unit is **usable** when its lot is `functional` **and** not expired (`expiration_date is null or >= today`).
Par checks, FEFO ranking and issuing only consider usable units. Expired units still count in `expired_qty` and raise `expired` alerts until someone disposes of them.

## 2. FEFO (First-Expired-First-Out)
- **Order:** `expiration_date ASC NULLS LAST, received_on, created_at, id`. The same order is used everywhere.
- **Invariant:** every usable equipment-room lot expires **no later than** every usable backstock lot.
- **Enforced on the way in:**
  - `admin_transfer_lot(..., 'equipment_room')` and `admin_receive_stock(..., 'equipment_room')` call `_assert_room_fefo`.
  - That check rejects the move if usable backstock holds an earlier-expiring batch, with the message *"FEFO: backstock has a batch expiring … that must go to the equipment room first"*.
  - Out-of-service and expired stock can never go into the room.
- **Highlight:** `v_lots.fefo_rank` is computed across both locations (1 = use next). `v_next_backstock_batch` gives the batch the officer should move next. A batch is all usable backstock units sharing the earliest expiry.
- **Detect drift:** stock with an *earlier* date can be received into backstock after the room was filled. `v_fefo_violations` catches this, and `_refresh_alerts` raises a `fefo_violation` alert (warning).
- **Move next batch:** `admin_move_next_batch(item, qty?)` is the one-tap response to the low-room alert. It moves the earliest usable backstock batch (oldest received first), optionally only `qty` units, and never more than one batch per call.
- **Fix drift:** the officer physically swaps the units, then presses "Mark swapped", which calls `admin_fefo_rebalance(item)`.
  - The room quantity stays the same and is re-assigned to the earliest-expiring usable lots: room → backstock first, then backstock → room.
  - Records never change without a physical action (ADR-006).

## 3. Member submission (`process_submission`)
The input is the member's name, reason (`restock` = bag items were used; `replacement` = bag items were expired/broken/damaged/missing), context, optional call #, notes, and lines of `{item_id, quantity, replacement_cause}`. Everything runs in one transaction with row locks.

For each line of quantity *q*:
1. **Issue *q* from the equipment room.** Go through usable room lots in FEFO order, writing an `issue` movement for each. Backstock is never touched.
2. **Discrepancy.** If the records show fewer than *q* usable units in the room, the gap is stored in `discrepancy_qty`. The submission is `flagged`, and a `stock_discrepancy` alert (warning) asks the officer to recount.
3. **Broken equipment.** For a `replacement` with cause `broken`/`damaged` on an `is_equipment` item, a `broken_equipment_reported` alert (info) asks the officer to collect the old unit. The old unit was in a bag, so it was never in inventory.
4. Finally, `_refresh_alerts()` runs. This is what raises *"Equipment Room X is low. Move next batch…"*.

Validation:
- the name is required (max 120 chars)
- 1 to 50 lines
- each quantity is 1 to 500
- the item must exist and not be archived
- a replacement without a cause defaults to `other`

## 4. Alerts engine (`_refresh_alerts`)
It is idempotent and recomputes every condition from scratch. `audience` decides who the notification dispatcher contacts.

| Type | Condition | Severity | Audience | Key |
| --- | --- | --- | --- | --- |
| `low_stock_room` | `room_par_qty > 0` and usable room qty < par | critical if 0, else warning | **all** (officer + board) | `low_room:<item>` |
| `low_stock_backstock` | `min_backstock_qty > 0` and usable backstock < min | critical if 0, else warning | **all** (officer + board) | `low_backstock:<item>` |
| `expired` | functional lot past its expiry | critical in room, warning in backstock | equipment_officer | `expired:<lot>` |
| `expiring_soon` | expires within `expiration_warning_days` (default 60 ≈ 2 months) | warning | equipment_officer | `expiring:<lot>` |
| `out_of_service` | lot status `out_of_service` | info | equipment_officer | `oos:<lot>` |
| `fefo_violation` | row in `v_fefo_violations` | warning | equipment_officer | `fefo:<item>` |
| `stock_discrepancy` | raised by `process_submission` | warning | equipment_officer | `discrepancy:<line>` |
| `broken_equipment_reported` | raised by `process_submission` | info | equipment_officer | `broken:<line>` |

The `low_stock_room` message follows the owner's wording:
- *"Equipment Room Gauze Pads 4x4 is low (5 of 40 each). Move next batch (Exp: 2028-07-05, 100 each) from Backstock."*
- When there is no usable backstock: *"… No usable backstock — reorder."*

Lifecycle:
- **Insert or update by key.** The message is refreshed, and an acknowledged alert whose severity escalates is re-opened.
- **Auto-resolve.** Condition alerts not re-detected in this run are resolved.
- **Event alerts** (`stock_discrepancy`, `broken_equipment_reported`) are never auto-resolved; an admin resolves them.
- **Manual resolve vs acknowledge.** If an admin manually resolves an alert whose condition still holds, it comes back on the next refresh. Use *acknowledge* to say "I know about this".

When it runs:
- after every submission and every admin RPC
- daily from cron (Phase 4)
- on demand via `refresh_alerts()`

## 5. Notifications (`src/lib/notifications/dispatch.ts`)
An alert should be notified when it is `open` **and** either `last_notified_severity is null` or `severity > last_notified_severity`.

Who gets it:
- `audience = 'equipment_officer'` goes to recipients with role `equipment_officer`.
- `audience = 'all'` goes to every active recipient.

Channels by severity:
- **info:** in-app only
- **warning:** email digest
- **at or above `sms_min_severity` (default `critical`):** email and SMS

After sending, set `last_notified_severity` and `last_notified_at`, and write one row per attempt to `notification_log`. The toggles `app_settings.email_enabled` and `sms_enabled` are respected.
- **Two modes:**
  - **urgent:** runs right after each member submission and each admin batch action (dispose, adjust, move, status), via `after()`. Threshold edits do not trigger it.
    - It emails alerts at or above `sms_min_severity`, **plus every `low_stock_room` alert ("Equipment Room X is low"), whatever its severity** (owner request, 2026-11-13: email immediately when an item drops below par).
    - SMS still goes only to alerts at or above `sms_min_severity`.
  - **digest:** the daily cron. It sends everything pending at warning or above.
- **Nothing is lost while providers are missing.** An alert is marked notified only if at least one message about it was actually **sent**. While Resend or Twilio isn't configured, sends are logged as `skipped` and the alert stays pending.
- The SMS body is capped at about 600 characters and ends with a link to `/admin/alerts`.

## 6. Analytics (`v_monthly_item_usage`, from `inventory_movements`)
| Metric | Definition |
| --- | --- |
| Usage | `issued_qty`, split into `issued_restock_qty` (used on calls) and `issued_replacement_qty` |
| Member activity | `submission_count` |
| Officer restock frequency | `room_refills` (number of backstock → room transfers) and `room_refill_qty` |
| Spend | `purchase_cost` (receive × unit cost) |
| Waste | `waste_cost` = disposed stock + replacements caused by expired/broken/damaged items |

Cost comes from the lot's `unit_cost` snapshot, falling back to `items.unit_cost`.

## 7. Testing the SQL without Docker
Use a plain Postgres 17 (Homebrew `postgresql@17`) with a stub that creates:
- the `anon`, `authenticated` and `service_role` roles
- an `auth` schema with `users`, `identities`, `uid()` and `role()`, reading `request.jwt.claim.sub` / `request.jwt.claim.role`
- an `extensions` schema

Apply the migrations in order, then `seed.sql`. To act as the admin:

```sql
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
```

Turning this into a committed test script is on the roadmap (Phase 6).
