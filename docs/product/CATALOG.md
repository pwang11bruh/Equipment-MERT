# Item Catalog

Source: the owner's bag-check Google Form (screenshots, 2026-11-13). It is loaded by `supabase/migrations/20261113000400_catalog_and_optional_expiry.sql`.
Compartments, bag quantities and expiration dates were deliberately ignored. Thresholds (`room_par_qty`, `min_backstock_qty`) and costs start at 0/empty and are set in the admin UI.

Each line item on the form became one restockable item. For example, "Assorted gauze pads" became four sizes, "Tapes" became three types, and the glucometry kit was split into its parts.

Ordering: categories and items are listed **alphabetically**, in this file and in the app.

Legend: **Exp** = tracks expiration (⚑ = only some brands expire). **Equip** = durable equipment (can be marked out of service).

After the first push, edit items in the admin UI, not here. Keep this file as the record of the original import.

## AED

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Adult AED pads | set | ✓ |  |  |
| AED unit | each |  | ✓ |  |
| Pediatric AED pads | set | ✓ |  |  |

## Airway & Breathing

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Adult BVM (700 cc) | each |  |  | With adult mask and PEEP valve |
| Adult nasal cannula | each |  |  |  |
| Adult NRB mask | each | ✓ |  | Hudson RCI brand expires; McKesson has no expiration date |
| BVM PEEP valve | each |  |  | Set to 5 cmH2O |
| Electric suction unit | each |  | ✓ | Fully charged; reaches 300 mmHg in 4 seconds |
| Infant NRB mask | each |  |  |  |
| Nebulizer face mask kit | kit |  |  |  |
| NPA lube packet | packet | ✓ |  |  |
| NPA size 16 | each | ✓ |  |  |
| NPA size 24 | each | ✓ |  |  |
| NPA size 26 | each | ✓ |  |  |
| NPA size 32 | each | ✓ |  |  |
| NPA size 34 | each | ✓ |  |  |
| OPA set (sizes 0–5) | set |  |  | 6 sizes: 0, 1, 2, 3, 4, 5 |
| Oxygen regulator | each |  | ✓ | Must reach 25 LPM |
| Oxygen tank wrench/key | each |  | ✓ |  |
| Oxygen tubing | each | ✓⚑ |  | Hudson RCI brand expires; McKesson does not |
| Peak flow meter | each |  | ✓ |  |
| Peak flow mouthpiece | each |  |  |  |
| Pediatric BVM (450 cc) | each |  |  | With child, infant and neonatal masks and PEEP valve |
| Pediatric nasal cannula | each |  |  |  |
| Pediatric NRB mask | each |  |  |  |
| Pocket mask | each |  |  |  |
| Portable oxygen cylinder | each |  | ✓ | Must read >700 PSI |
| Suction catheter + tubing | each | ✓ |  |  |

## Bleeding & Trauma

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Abdominal pad 8x10 | each |  |  |  |
| Asherman chest seal | each | ✓ |  |  |
| Burn sheet | each | ✓ |  |  |
| Burn sheet, large (60x90) | each | ✓ |  |  |
| Combine pad 5x9 | each |  |  |  |
| Multi-trauma dressing (10x30) | each | ✓ |  | "Trauma Dressing" 12x30 is also acceptable |
| Occlusive dressing | each | ✓ |  |  |
| Tourniquet (commercial tactical) | each |  |  |  |

## Diagnostics & Monitoring

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Adult BP cuff | each |  | ✓ |  |
| Adult stethoscope | each |  | ✓ |  |
| Carbon monoxide detector | each |  | ✓ | 1B bag |
| Child BP cuff | each |  | ✓ |  |
| Glucose meter | each |  | ✓ | Must be calibrated within the last 7 days |
| Glucose test strip | each | ✓ |  |  |
| Lancet | each | ✓ |  | Purple and blue sizes |
| Large adult/thigh BP cuff | each |  | ✓ |  |
| Pediatric stethoscope | each |  | ✓ |  |
| Penlight | each |  | ✓ |  |
| Pulse oximeter | each |  | ✓ |  |
| Thermometer probe cover | each |  |  |  |
| Thermometer | each |  | ✓ |  |

## Forms & References

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Clipboard | each |  |  |  |
| Emergency Response Guidebook (2024) | each |  |  | Latest version: 2024 |
| PA BLS Protocols (2023) | each |  |  | Latest update: 2023 |
| Penn Resource Card | each |  |  | Optional |
| Refusal form | each |  |  |  |
| TOC form | each |  |  |  |

## General Supplies

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Bulb syringe | each |  |  |  |
| Emergency blanket | each |  |  | Unopened package |
| Emesis / convenience bag | each |  |  |  |
| Feminine pad | each |  |  |  |
| Handlight | each |  | ✓ |  |
| Nail polish remover pad | each |  |  |  |
| Paper cup | each |  |  |  |
| Pen | each |  |  |  |
| Razor | each |  |  | Keep inside a black bag |
| Sterile OB kit | kit | ✓ |  | Check expiry from the outside label; do not open |
| Tampon | each |  |  |  |
| Tongue depressor | each |  |  |  |
| Trauma shears | pair |  | ✓ |  |
| Triage tag | each |  |  | Regional-approved format, plastic packaging |
| Tweezers | each |  | ✓ |  |

## Medications

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Activated charcoal tube (25 g) | tube | ✓ |  |  |
| Activated charcoal tube (50 g) | tube | ✓ |  |  |
| Adult EpiPen (0.30 mg) | each | ✓ |  |  |
| Albuterol sulfate packet (5 doses) | packet | ✓ |  |  |
| Aspirin / ASA bottle | bottle | ✓ |  |  |
| Naloxone / Narcan | packet | ✓ |  |  |
| Oral glucose packet (15 g) | packet | ✓ |  |  |
| Pediatric EpiPen (0.15 mg) | each | ✓ |  |  |
| Saline inhalation solution (3 mL) | each | ✓ |  | ROW saline for nebulizer |

## PPE & Infection Control

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Biohazard bag | each |  |  |  |
| Disposable exam gloves | pair |  |  | Assorted sizes |
| Eye protection / goggles | pair |  |  |  |
| Germicidal wipes | each | ✓⚑ |  | SuperSani expires; SaniZide does not |
| Hand sanitizer bottle | bottle | ✓ |  | Store in a ziplock bag |
| High-visibility safety vest | each |  |  |  |
| Medical gown | each |  |  |  |
| N95 respirator mask | each |  |  |  |
| Sharps shuttle | each |  |  |  |
| Shoe covers | pair |  |  | Surgical foot coverings |
| Work gloves | pair |  |  | NOT disposable |

## Splinting & Immobilization

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Adult C-collar | each |  |  |  |
| Pediatric C-collar | each |  |  | Most have a pink strip |
| SAM splint (junior) | each |  |  |  |
| SAM splint (standard) | each |  |  |  |

## Wound Care

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| ACE bandage 3" (hook & loop) | each |  |  | Velcro closure type, NOT cohesive |
| Alcohol prep pad | each | ✓ |  | Antiseptic wipes / alcohol swabs |
| Antibiotic ointment packet | packet | ✓ |  |  |
| Band-Aid, large | each |  |  | 3/4 x 4 and/or 1x3 |
| Band-Aid, small | each |  |  | 0.5 x 3 |
| Clear tape | roll |  |  | "McKesson" inner label |
| Cling roll, circular | roll |  |  |  |
| Cling roll, large | roll |  |  |  |
| Cling roll, small | roll |  |  |  |
| Cloth tape | roll |  |  | Large roll |
| Cold pack | each |  |  |  |
| Eye wash | bottle | ✓ |  |  |
| Gauze pad 2x2 | each |  |  | Glucometry kit |
| Gauze pad 3x3 | each |  |  |  |
| Gauze pad 4x4 | each |  |  |  |
| Hot pack | each |  |  |  |
| Hypoallergenic tape | roll |  |  | "Coviden" inner label or labeled hypoallergenic |
| Nosebleed pincher | each |  |  |  |
| Saline bullet (15 mL) | each | ✓ |  |  |
| Sterile water | each | ✓ |  |  |
| Triangular bandage | each |  |  |  |

**Total:** 115 items in 10 categories.
