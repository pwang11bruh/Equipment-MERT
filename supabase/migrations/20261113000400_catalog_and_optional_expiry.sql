-- =============================================================================
-- MERT Equipment Portal — Real catalog + optional expiry on receive
-- -----------------------------------------------------------------------------
-- 1. admin_receive_stock(): an expiration date is no longer REQUIRED for items
--    with tracks_expiration = true. Some items expire only for certain brands
--    (e.g. SuperSani wipes expire, SaniZide don't; Hudson RCI masks/tubing
--    expire, McKesson don't). The admin UI asks for a date and offers an
--    explicit "this unit has no expiration date" checkbox. Lots without a date
--    sort LAST in FEFO, which is correct (use the expiring units first).
-- 2. Initial catalog from the owner's bag-check form (2026-11-13). Quantities,
--    par levels and costs are intentionally 0/NULL: thresholds are set later in
--    the admin UI (0 = alert disabled). See docs/product/CATALOG.md.
-- =============================================================================

create or replace function public.admin_receive_stock(
  p_item_id uuid,
  p_quantity integer,
  p_location public.inventory_location default 'backstock',
  p_expiration_date date default null,
  p_lot_number text default null,
  p_unit_cost numeric default null,
  p_received_on date default current_date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items%rowtype;
  v_cost numeric;
  v_exp date;
  v_location public.inventory_location := coalesce(p_location, 'backstock');
  v_lot_id uuid;
begin
  perform public._assert_admin();

  select * into v_item from public.items where id = p_item_id;
  if not found then raise exception 'Unknown item'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;

  -- Items that never expire ignore any date passed in. Items that (may)
  -- expire keep the date if given; null means "this unit has no expiry".
  v_exp := case when v_item.tracks_expiration then p_expiration_date end;
  if v_exp is not null and v_exp < current_date then
    raise exception 'Cannot receive stock that is already expired (%)', to_char(v_exp, 'YYYY-MM-DD');
  end if;
  if v_location = 'equipment_room' then
    perform public._assert_room_fefo(p_item_id, v_exp);
  end if;

  v_cost := coalesce(p_unit_cost, v_item.unit_cost);
  v_lot_id := public._add_to_lot(
    p_item_id, v_location, 'functional', p_quantity, v_exp,
    nullif(trim(p_lot_number), ''), v_cost, p_received_on, nullif(trim(p_notes), ''));

  insert into public.inventory_movements
    (item_id, lot_id, movement_type, quantity, to_location, to_status, unit_cost, expiration_date, reason, actor)
  values
    (p_item_id, v_lot_id, 'receive', p_quantity, v_location, 'functional',
     v_cost, v_exp, nullif(trim(p_notes), ''), 'admin');

  perform public._refresh_alerts();
  return v_lot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categories (grouping for the member form; by item type, not bag compartment).
-- Display order is ALPHABETICAL (owner request): sort_order follows A–Z, and
-- items are always listed A–Z by name within a category.
-- ---------------------------------------------------------------------------
insert into public.item_categories (name, sort_order) values
  ('AED',                             10),
  ('Airway & Breathing',              20),
  ('Bleeding & Trauma',               30),
  ('Diagnostics & Monitoring',        40),
  ('Forms & References',              50),
  ('General Supplies',                60),
  ('Medications',                     70),
  ('PPE & Infection Control',         80),
  ('Splinting & Immobilization',      90),
  ('Wound Care',                      100)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Items
--   tracks_expiration: the item (or some brands of it) carries an expiry date
--   is_equipment:      durable gear that can be marked out of service
-- ---------------------------------------------------------------------------
insert into public.items (name, category_id, unit, tracks_expiration, is_equipment, description)
select v.name, c.id, v.unit, v.exp, v.equip, v.descr
from (values
  -- Airway & Breathing
  ('Adult nasal cannula',                 'Airway & Breathing', 'each',  false, false, null),
  ('Pediatric nasal cannula',             'Airway & Breathing', 'each',  false, false, null),
  ('Adult NRB mask',                      'Airway & Breathing', 'each',  true,  false, 'Hudson RCI brand expires; McKesson has no expiration date'),
  ('Pediatric NRB mask',                  'Airway & Breathing', 'each',  false, false, null),
  ('Infant NRB mask',                     'Airway & Breathing', 'each',  false, false, null),
  ('Oxygen tubing',                       'Airway & Breathing', 'each',  true,  false, 'Hudson RCI brand expires; McKesson does not'),
  ('NPA size 16',                         'Airway & Breathing', 'each',  true,  false, null),
  ('NPA size 24',                         'Airway & Breathing', 'each',  true,  false, null),
  ('NPA size 26',                         'Airway & Breathing', 'each',  true,  false, null),
  ('NPA size 32',                         'Airway & Breathing', 'each',  true,  false, null),
  ('NPA size 34',                         'Airway & Breathing', 'each',  true,  false, null),
  ('NPA lube packet',                     'Airway & Breathing', 'packet',true,  false, null),
  ('OPA set (sizes 0–5)',                 'Airway & Breathing', 'set',   false, false, '6 sizes: 0, 1, 2, 3, 4, 5'),
  ('Portable oxygen cylinder',            'Airway & Breathing', 'each',  false, true,  'Must read >700 PSI'),
  ('Oxygen regulator',                    'Airway & Breathing', 'each',  false, true,  'Must reach 25 LPM'),
  ('Oxygen tank wrench/key',              'Airway & Breathing', 'each',  false, true,  null),
  ('Adult BVM (700 cc)',                  'Airway & Breathing', 'each',  false, false, 'With adult mask and PEEP valve'),
  ('Pediatric BVM (450 cc)',              'Airway & Breathing', 'each',  false, false, 'With child, infant and neonatal masks and PEEP valve'),
  ('BVM PEEP valve',                      'Airway & Breathing', 'each',  false, false, 'Set to 5 cmH2O'),
  ('Pocket mask',                         'Airway & Breathing', 'each',  false, false, null),
  ('Suction catheter + tubing',           'Airway & Breathing', 'each',  true,  false, null),
  ('Electric suction unit',               'Airway & Breathing', 'each',  false, true,  'Fully charged; reaches 300 mmHg in 4 seconds'),
  ('Peak flow meter',                     'Airway & Breathing', 'each',  false, true,  null),
  ('Peak flow mouthpiece',                'Airway & Breathing', 'each',  false, false, null),
  ('Nebulizer face mask kit',             'Airway & Breathing', 'kit',   false, false, null),
  -- Bleeding & Trauma
  ('Tourniquet (commercial tactical)',    'Bleeding & Trauma',  'each',  false, false, null),
  ('Multi-trauma dressing (10x30)',       'Bleeding & Trauma',  'each',  true,  false, '"Trauma Dressing" 12x30 is also acceptable'),
  ('Occlusive dressing',                  'Bleeding & Trauma',  'each',  true,  false, null),
  ('Asherman chest seal',                 'Bleeding & Trauma',  'each',  true,  false, null),
  ('Burn sheet',                          'Bleeding & Trauma',  'each',  true,  false, null),
  ('Burn sheet, large (60x90)',           'Bleeding & Trauma',  'each',  true,  false, null),
  ('Abdominal pad 8x10',                  'Bleeding & Trauma',  'each',  false, false, null),
  ('Combine pad 5x9',                     'Bleeding & Trauma',  'each',  false, false, null),
  -- Wound Care
  ('Gauze pad 4x4',                       'Wound Care',         'each',  false, false, null),
  ('Gauze pad 3x3',                       'Wound Care',         'each',  false, false, null),
  ('Gauze pad 2x2',                       'Wound Care',         'each',  false, false, 'Glucometry kit'),
  ('Cloth tape',                          'Wound Care',         'roll',  false, false, 'Large roll'),
  ('Clear tape',                          'Wound Care',         'roll',  false, false, '"McKesson" inner label'),
  ('Hypoallergenic tape',                 'Wound Care',         'roll',  false, false, '"Coviden" inner label or labeled hypoallergenic'),
  ('Band-Aid, large',                     'Wound Care',         'each',  false, false, '3/4 x 4 and/or 1x3'),
  ('Band-Aid, small',                     'Wound Care',         'each',  false, false, '0.5 x 3'),
  ('Antibiotic ointment packet',          'Wound Care',         'packet',true,  false, null),
  ('Alcohol prep pad',                    'Wound Care',         'each',  true,  false, 'Antiseptic wipes / alcohol swabs'),
  ('Sterile water',                       'Wound Care',         'each',  true,  false, null),
  ('Saline bullet (15 mL)',               'Wound Care',         'each',  true,  false, null),
  ('Triangular bandage',                  'Wound Care',         'each',  false, false, null),
  ('ACE bandage 3" (hook & loop)',        'Wound Care',         'each',  false, false, 'Velcro closure type, NOT cohesive'),
  ('Cling roll, large',                   'Wound Care',         'roll',  false, false, null),
  ('Cling roll, small',                   'Wound Care',         'roll',  false, false, null),
  ('Cling roll, circular',                'Wound Care',         'roll',  false, false, null),
  ('Nosebleed pincher',                   'Wound Care',         'each',  false, false, null),
  ('Cold pack',                           'Wound Care',         'each',  false, false, null),
  ('Hot pack',                            'Wound Care',         'each',  false, false, null),
  ('Eye wash',                            'Wound Care',         'bottle',true,  false, null),
  -- Splinting & Immobilization
  ('SAM splint (standard)',               'Splinting & Immobilization', 'each', false, false, null),
  ('SAM splint (junior)',                 'Splinting & Immobilization', 'each', false, false, null),
  ('Adult C-collar',                      'Splinting & Immobilization', 'each', false, false, null),
  ('Pediatric C-collar',                  'Splinting & Immobilization', 'each', false, false, 'Most have a pink strip'),
  -- Medications
  ('Oral glucose packet (15 g)',          'Medications',        'packet',true,  false, null),
  ('Activated charcoal tube (50 g)',      'Medications',        'tube',  true,  false, null),
  ('Activated charcoal tube (25 g)',      'Medications',        'tube',  true,  false, null),
  ('Aspirin / ASA bottle',                'Medications',        'bottle',true,  false, null),
  ('Naloxone / Narcan',                   'Medications',        'packet',true,  false, null),
  ('Adult EpiPen (0.30 mg)',              'Medications',        'each',  true,  false, null),
  ('Pediatric EpiPen (0.15 mg)',          'Medications',        'each',  true,  false, null),
  ('Albuterol sulfate packet (5 doses)',  'Medications',        'packet',true,  false, null),
  ('Saline inhalation solution (3 mL)',   'Medications',        'each',  true,  false, 'ROW saline for nebulizer'),
  -- Diagnostics & Monitoring
  ('Penlight',                            'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Adult BP cuff',                       'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Large adult/thigh BP cuff',           'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Child BP cuff',                       'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Adult stethoscope',                   'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Pediatric stethoscope',               'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Pulse oximeter',                      'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Thermometer',                         'Diagnostics & Monitoring', 'each', false, true,  null),
  ('Thermometer probe cover',             'Diagnostics & Monitoring', 'each', false, false, null),
  ('Glucose meter',                       'Diagnostics & Monitoring', 'each', false, true,  'Must be calibrated within the last 7 days'),
  ('Lancet',                              'Diagnostics & Monitoring', 'each', true,  false, 'Purple and blue sizes'),
  ('Glucose test strip',                  'Diagnostics & Monitoring', 'each', true,  false, null),
  ('Carbon monoxide detector',            'Diagnostics & Monitoring', 'each', false, true,  '1B bag'),
  -- AED
  ('AED unit',                            'AED',                'each',  false, true,  null),
  ('Adult AED pads',                      'AED',                'set',   true,  false, null),
  ('Pediatric AED pads',                  'AED',                'set',   true,  false, null),
  -- PPE & Infection Control
  ('Disposable exam gloves',              'PPE & Infection Control', 'pair', false, false, 'Assorted sizes'),
  ('Germicidal wipes',                    'PPE & Infection Control', 'each', true,  false, 'SuperSani expires; SaniZide does not'),
  ('Hand sanitizer bottle',               'PPE & Infection Control', 'bottle', true, false, 'Store in a ziplock bag'),
  ('N95 respirator mask',                 'PPE & Infection Control', 'each', false, false, null),
  ('Eye protection / goggles',            'PPE & Infection Control', 'pair', false, false, null),
  ('Medical gown',                        'PPE & Infection Control', 'each', false, false, null),
  ('Shoe covers',                         'PPE & Infection Control', 'pair', false, false, 'Surgical foot coverings'),
  ('Work gloves',                         'PPE & Infection Control', 'pair', false, false, 'NOT disposable'),
  ('High-visibility safety vest',         'PPE & Infection Control', 'each', false, false, null),
  ('Biohazard bag',                       'PPE & Infection Control', 'each', false, false, null),
  ('Sharps shuttle',                      'PPE & Infection Control', 'each', false, false, null),
  -- General Supplies
  ('Pen',                                 'General Supplies',   'each',  false, false, null),
  ('Trauma shears',                       'General Supplies',   'pair',  false, true,  null),
  ('Emesis / convenience bag',            'General Supplies',   'each',  false, false, null),
  ('Paper cup',                           'General Supplies',   'each',  false, false, null),
  ('Emergency blanket',                   'General Supplies',   'each',  false, false, 'Unopened package'),
  ('Tweezers',                            'General Supplies',   'each',  false, true,  null),
  ('Triage tag',                          'General Supplies',   'each',  false, false, 'Regional-approved format, plastic packaging'),
  ('Bulb syringe',                        'General Supplies',   'each',  false, false, null),
  ('Sterile OB kit',                      'General Supplies',   'kit',   true,  false, 'Check expiry from the outside label; do not open'),
  ('Razor',                               'General Supplies',   'each',  false, false, 'Keep inside a black bag'),
  ('Nail polish remover pad',             'General Supplies',   'each',  false, false, null),
  ('Tongue depressor',                    'General Supplies',   'each',  false, false, null),
  ('Handlight',                           'General Supplies',   'each',  false, true,  null),
  ('Feminine pad',                        'General Supplies',   'each',  false, false, null),
  ('Tampon',                              'General Supplies',   'each',  false, false, null),
  -- Forms & References
  ('TOC form',                            'Forms & References', 'each',  false, false, null),
  ('Refusal form',                        'Forms & References', 'each',  false, false, null),
  ('Penn Resource Card',                  'Forms & References', 'each',  false, false, 'Optional'),
  ('Clipboard',                           'Forms & References', 'each',  false, false, null),
  ('Emergency Response Guidebook (2024)', 'Forms & References', 'each',  false, false, 'Latest version: 2024'),
  ('PA BLS Protocols (2023)',             'Forms & References', 'each',  false, false, 'Latest update: 2023')
) as v(name, category, unit, exp, equip, descr)
join public.item_categories c on c.name = v.category
on conflict do nothing;
