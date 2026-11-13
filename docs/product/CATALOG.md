# Item Catalog

Source: the owner's bag-check Google Form (screenshots, 2026-11-13). It is loaded by `supabase/migrations/20261113000400_catalog_and_optional_expiry.sql`.
Compartments, bag quantities and expiration dates were deliberately ignored. Thresholds (`room_par_qty`, `min_backstock_qty`) and costs start at 0/empty and are set in the admin UI.

Each line item on the form became one restockable item. For example, "Assorted gauze pads" became four sizes, "Tapes" became three types, and the glucometry kit was split into its parts.

Legend: **Exp** = tracks expiration (⚑ = only some brands expire). **Equip** = durable equipment (can be marked out of service).

After the first push, edit items in the admin UI, not here. Keep this file as the record of the original import.

## Airway & Breathing

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Adult nasal cannula | each |  |  |  |
| Pediatric nasal cannula | each |  |  |  |
| Adult NRB mask | each | ✓ |  | Hudson RCI brand expires; McKesson has no expiration date |
| Pediatric NRB mask | each |  |  |  |
| Infant NRB mask | each |  |  |  |
| Oxygen tubing | each | ✓⚑ |  | Hudson RCI brand expires; McKesson does not |
| NPA size 16 | each | ✓ |  |  |
| NPA size 24 | each | ✓ |  |  |
| NPA size 26 | each | ✓ |  |  |
| NPA size 32 | each | ✓ |  |  |
| NPA size 34 | each | ✓ |  |  |
| NPA lube packet | packet | ✓ |  |  |
| OPA set (sizes 0–5) | set |  |  | 6 sizes: 0, 1, 2, 3, 4, 5 |
| Portable oxygen cylinder | each |  | ✓ | Must read >700 PSI |
| Oxygen regulator | each |  | ✓ | Must reach 25 LPM |
| Oxygen tank wrench/key | each |  | ✓ |  |
| Adult BVM (700 cc) | each |  |  | With adult mask and PEEP valve |
| Pediatric BVM (450 cc) | each |  |  | With child, infant and neonatal masks and PEEP valve |
| BVM PEEP valve | each |  |  | Set to 5 cmH2O |
| Pocket mask | each |  |  |  |
| Suction catheter + tubing | each | ✓ |  |  |
| Electric suction unit | each |  | ✓ | Fully charged; reaches 300 mmHg in 4 seconds |
| Peak flow meter | each |  | ✓ |  |
| Peak flow mouthpiece | each |  |  |  |
| Nebulizer face mask kit | kit |  |  |  |

## Bleeding & Trauma

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Tourniquet (commercial tactical) | each |  |  |  |
| Multi-trauma dressing (10x30) | each | ✓ |  | "Trauma Dressing" 12x30 is also acceptable |
| Occlusive dressing | each | ✓ |  |  |
| Asherman chest seal | each | ✓ |  |  |
| Burn sheet | each | ✓ |  |  |
| Burn sheet, large (60x90) | each | ✓ |  |  |
| Abdominal pad 8x10 | each |  |  |  |
| Combine pad 5x9 | each |  |  |  |

## Wound Care

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Gauze pad 4x4 | each |  |  |  |
| Gauze pad 3x3 | each |  |  |  |
| Gauze pad 2x2 | each |  |  | Glucometry kit |
| Cloth tape | roll |  |  | Large roll |
| Clear tape | roll |  |  | "McKesson" inner label |
| Hypoallergenic tape | roll |  |  | "Coviden" inner label or labeled hypoallergenic |
| Band-Aid, large | each |  |  | 3/4 x 4 and/or 1x3 |
| Band-Aid, small | each |  |  | 0.5 x 3 |
| Antibiotic ointment packet | packet | ✓ |  |  |
| Alcohol prep pad | each | ✓ |  | Antiseptic wipes / alcohol swabs |
| Sterile water | each | ✓ |  |  |
| Saline bullet (15 mL) | each | ✓ |  |  |
| Triangular bandage | each |  |  |  |
| ACE bandage 3" (hook & loop) | each |  |  | Velcro closure type, NOT cohesive |
| Cling roll, large | roll |  |  |  |
| Cling roll, small | roll |  |  |  |
| Cling roll, circular | roll |  |  |  |
| Nosebleed pincher | each |  |  |  |
| Cold pack | each |  |  |  |
| Hot pack | each |  |  |  |
| Eye wash | bottle | ✓ |  |  |

## Splinting & Immobilization

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| SAM splint (standard) | each |  |  |  |
| SAM splint (junior) | each |  |  |  |
| Adult C-collar | each |  |  |  |
| Pediatric C-collar | each |  |  | Most have a pink strip |

## Medications

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Oral glucose packet (15 g) | packet | ✓ |  |  |
| Activated charcoal tube (50 g) | tube | ✓ |  |  |
| Activated charcoal tube (25 g) | tube | ✓ |  |  |
| Aspirin / ASA bottle | bottle | ✓ |  |  |
| Naloxone / Narcan | packet | ✓ |  |  |
| Adult EpiPen (0.30 mg) | each | ✓ |  |  |
| Pediatric EpiPen (0.15 mg) | each | ✓ |  |  |
| Albuterol sulfate packet (5 doses) | packet | ✓ |  |  |
| Saline inhalation solution (3 mL) | each | ✓ |  | ROW saline for nebulizer |

## Diagnostics & Monitoring

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Penlight | each |  | ✓ |  |
| Adult BP cuff | each |  | ✓ |  |
| Large adult/thigh BP cuff | each |  | ✓ |  |
| Child BP cuff | each |  | ✓ |  |
| Adult stethoscope | each |  | ✓ |  |
| Pediatric stethoscope | each |  | ✓ |  |
| Pulse oximeter | each |  | ✓ |  |
| Thermometer | each |  | ✓ |  |
| Thermometer probe cover | each |  |  |  |
| Glucose meter | each |  | ✓ | Must be calibrated within the last 7 days |
| Lancet | each | ✓ |  | Purple and blue sizes |
| Glucose test strip | each | ✓ |  |  |
| Carbon monoxide detector | each |  | ✓ | 1B bag |

## AED

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| AED unit | each |  | ✓ |  |
| Adult AED pads | set | ✓ |  |  |
| Pediatric AED pads | set | ✓ |  |  |

## PPE & Infection Control

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Disposable exam gloves | pair |  |  | Assorted sizes |
| Germicidal wipes | each | ✓⚑ |  | SuperSani expires; SaniZide does not |
| Hand sanitizer bottle | bottle | ✓ |  | Store in a ziplock bag |
| N95 respirator mask | each |  |  |  |
| Eye protection / goggles | pair |  |  |  |
| Medical gown | each |  |  |  |
| Shoe covers | pair |  |  | Surgical foot coverings |
| Work gloves | pair |  |  | NOT disposable |
| High-visibility safety vest | each |  |  |  |
| Biohazard bag | each |  |  |  |
| Sharps shuttle | each |  |  |  |

## General Supplies

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| Pen | each |  |  |  |
| Trauma shears | pair |  | ✓ |  |
| Emesis / convenience bag | each |  |  |  |
| Paper cup | each |  |  |  |
| Emergency blanket | each |  |  | Unopened package |
| Tweezers | each |  | ✓ |  |
| Triage tag | each |  |  | Regional-approved format, plastic packaging |
| Bulb syringe | each |  |  |  |
| Sterile OB kit | kit | ✓ |  | Check expiry from the outside label; do not open |
| Razor | each |  |  | Keep inside a black bag |
| Nail polish remover pad | each |  |  |  |
| Tongue depressor | each |  |  |  |
| Handlight | each |  | ✓ |  |
| Feminine pad | each |  |  |  |
| Tampon | each |  |  |  |

## Forms & References

| Item | Unit | Exp | Equip | Notes |
| --- | --- | --- | --- | --- |
| TOC form | each |  |  |  |
| Refusal form | each |  |  |  |
| Penn Resource Card | each |  |  | Optional |
| Clipboard | each |  |  |  |
| Emergency Response Guidebook (2024) | each |  |  | Latest version: 2024 |
| PA BLS Protocols (2023) | each |  |  | Latest update: 2023 |

**Total:** 115 items in 10 categories.
