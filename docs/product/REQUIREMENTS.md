# Product Requirements

## Original brief (from the project owner, 2026-11-13)

A modern, mobile-friendly web portal for the MERT (Medical Emergency Response
Team) equipment bag management system.

1. **Mobile-friendly submission portal.** After a call or bag check, members select an item type, a quantity, and whether it's a **restock** or a **replacement**.
2. **Live master inventory database.** It tracks:
   - item name and type
   - quantity
   - expiration dates
   - functionality status (functional or out of service)
   - location (active bag or backstock)
3. **FEFO (First-Expired-First-Out).**
   - Highlight or restrict active-bag use to the items closest to expiration, keeping later-expiring items in backstock.
   - Automated notification when items reach **2 months before expiration**.
4. **Automated stock alerts.** Alert the Equipment Officer and board members when items drop below minimum levels.
5. **Reporting and analytics.** A dashboard with usage trends, restock frequency, and funding/budget analysis over time, plus export.

## Clarifications (owner answers, 2026-11-13)

| Question | Answer | Consequence |
| --- | --- | --- |
| How do people sign in? | Only admins see inventory. There is **one shared admin account** used by all admins. Everyone else uses a **shared PIN** and can only submit the form when taking out items. | ADR-002. Members never see stock levels. There is no per-admin audit trail. |
| Do individual bags matter? | No. From an inventory perspective, bags don't matter. | Bags are not tracked (ADR-003, later superseded by ADR-008 below). |
| Storage & FEFO (owner update, 2026-11-13) | Two locations: **Equipment Room** (active pool; only the earliest-expiring batch lives here) and **Backstock** (reserve, locked from the member form). A member restock deducts from the Equipment Room. When the room drops below par, the Equipment Officer is told: *"Equipment Room gauze is low. Move next batch (Exp: [Date]) from Backstock."* | ADR-008 supersedes ADR-003. |
| Submissions apply immediately? | Yes | ADR-006 |
| How should members find items? (2026-11-13) | One A–Z list of all items with a search box | ADR-010 |
| When should the room par alert go out? (2026-11-13) | **As soon as the count reaches par**, by **email and text, immediately** | Migration 0600 (`<=`); `IMMEDIATE_TYPES` in `dispatch.ts` |
| Which services? (2026-11-13) | GitHub, Vercel, Resend | Texting still needs an SMS provider (Resend is email-only); see STATUS |
| Alert channels? | **Email + SMS + in-app.** | Resend for email, Twilio for SMS, and an alerts table for in-app (ADR-005). |
| Budget detail? | **Unit cost only** (no budget targets). | `unit_cost` on items and lots. Spend analytics come from the movement ledger. Budgets are out of scope. |

## Glossary

- **Equipment Room**: the accessible pool members restock their bags from. It only holds the earliest-expiring batch.
- **Backstock**: the locked reserve. Only the Equipment Officer moves batches from here into the Equipment Room.
- **Batch**: the units of an item that share an expiration date.
- **Lot**: a group of identical units of one item sharing location, status, expiration date and cost.
- **Par**: the target quantity of an item in the Equipment Room. Below par, the officer is alerted to move the next batch.
- **Restock** (submission): bag items were *used*, typically on a call, and the member refilled the bag from the Equipment Room.
- **Replacement** (submission): bag items were expired, broken, damaged or missing, and the member swapped in units from the Equipment Room.
- **FEFO**: First-Expired-First-Out. The Equipment Room always holds the units that expire soonest.
