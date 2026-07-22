# Asia Deli Go catalog metadata batch 5

Prepared: 2026-07-22T11:17:58Z
Batch: `asiandeligo-catalog-metadata-batch5-20260722-v1`
Decision SHA-256: `286cb02a38bd432f1d1f03d0594ddbe3a448dba69280cc36bc9d9d4dcc899b3f`

## Result

- Reviewed cohort: 25 exact SKUs.
- High-confidence product transitions: 18.
- Evidence-insufficient holds: 7.
- Stock quantity is explicitly outside this batch and remains unchanged.
- Production mutation in this preparation step: none.

## Field changes

| Field | Products |
| --- | ---: |
| allergens | 0 |
| mayContainAllergens | 0 |
| storageZone | 16 |
| nutritionFacts | 1 |
| countryOfOrigin | 2 |
| ingredients | 0 |

## Approved transitions

| SKU | Product | Changed fields | Reason |
| --- | --- | --- | --- |
| ADG-000231 | Mochi, ryżowe ciasteczka z sezamem 210g - Yuki & Love | storageZone | The mapped Yuki & Love sesame mochi and exact-EAN EU listings identify an unopened shelf-stable 210g product; its already populated composition is retained. |
| ADG-000249 | Mochi, ryżowe ciasteczka z orzeszkami ziemnymi 210g - Yuki & Love | storageZone | The mapped Yuki & Love peanut mochi and exact-EAN EU listings support unopened dry ambient storage; existing composition fields remain unchanged. |
| ADG-000264 | Paluszki Pepero Nude - wypełnione czekoladą 45g - Lotte | storageZone | Exact-EAN Pepero Nude 45g sources support cool, dry ambient storage; conflicting formula generations make composition and nutrition unsafe to rewrite. |
| ADG-000316 | Krakersy ryżowe Arare, snack miks Yamato 300g - Golden Turtle Brand | countryOfOrigin | The exact-EAN Golden Turtle Yamato Mix 300g is produced in the Netherlands; existing ingredients, allergens, nutrition, and ambient storage are retained. |
| ADG-000325 | Miękkie cukierki Malang Cow o smaku skondensowanego mleka 79g - LOTTE | storageZone | Exact-EAN Lotte Malang Cow 79g sources specify room-temperature dry storage; conflicting formula generations are deliberately left untouched. |
| ADG-000331 | Prażony zielony groszek z wasabi 140g - Khao Shong | storageZone | Exact-EAN Khao Shong wasabi peas are shelf-stable, while historic and current EU recipe/allergen generations conflict; only storage is safe to add. |
| ADG-000341 | Chipsy Hi Tempura, algi nori w tempurze 40g - Tao Kae Noi | storageZone | Exact-EAN Tao Kae Noi Hi Tempura Original 40g sources support ambient storage; composition and nutrition generations conflict and remain unchanged. |
| ADG-000351 | Chipsy Hi Tempura, algi nori w tempurze, pikantne 40g - Tao Kae Noi | storageZone | Exact-EAN Tao Kae Noi Hi Tempura Spicy 40g sources support ambient storage, but older and newer labels disagree on egg and nutrition. |
| ADG-000292 | Kawa ziarnista Espresso Innovator 500g - Trung Nguyen | storageZone | Manufacturer and EU listings identify Espresso Innovator 500g as shelf-stable coffee; conflicting nutrition and trace statements remain held on the null-EAN row. |
| ADG-000293 | Kawa mielona Trung Nguyen Creative 3 - 250g | storageZone | Exact-pack Creative 3 250g sources support cool, dry ambient storage; market labels conflict on traces and nutrition, so those fields remain unchanged. |
| ADG-001263 | Kawa BOSS Manzoku Milk Banana mleczna bananowa 185ml - Suntory | storageZone | The mapped Suntory BOSS milk-banana can is shelf-stable before opening; barcode-less catalog identity and conflicting Japanese generations make allergens and nutrition unsafe to rewrite. |
| ADG-001265 | Napój Dekavita C z witaminami 210ml - Suntory | storageZone, nutritionFacts | Official Suntory exact-JAN data supplies the per-100ml nutrition panel and confirms an unopened shelf-stable 210ml Dekavita C; royal jelly is not an EU top-14 allergen. |
| ADG-001287 | Herbata liściasta zielona Green Tea 100g - Tian Hu Shan | storageZone | Exact-EAN Tian Hu Shan green tea 100g is ambient; a separate lot-specific pesticide recall requires a physical lot/DDM sale-safety check and is not silently treated as metadata approval. |
| ADG-001650 | Japońska czarna herbata Sakura z kwiatem wiśni 15 saszetek (24g) - Lipton | storageZone | Official and exact-JAN listings identify Lipton Sakura 15×1.6g as dry shelf-stable tea; no misleading per-100g nutrition is generated. |
| ADG-000457 | Hyunmi Nokcha - zielona herbata z brązowym ryżem, 50 saszetek - Ottogi | storageZone | Exact-EAN Ottogi brown-rice green tea is shelf-stable; buckwheat trace text cannot be mapped to the EU gluten-cereal code and suspect nutrition remains unchanged. |
| ADG-000189 | Herbata aloesowa 400g - All Groo | storageZone | Exact-EAN Allgroo Aloe Tea 400g is shelf-stable before opening; existing composition, nutrition, origin, and empty allergen declaration are retained. |
| ADG-000239 | Herbata z yuzu 400g - All Gr∞ | storageZone | Exact-EAN Allgroo Yuzu Tea 400g is shelf-stable before opening; a conflicting nutrition generation is not copied. |
| ADG-000482 | Old Jamaica Ginger Beer Original, imbirowe piwo korzenne (0%) 2L | countryOfOrigin | The current exact 2L Old Jamaica Original product is produced in the United Kingdom; older nutrition and formula fields remain unchanged. |

## Holds

| SKU | Reason |
| --- | --- |
| ADG-000273 | The product declares no positive EU-regulated allergen and is already ambient; exact-GTIN recipe generations conflict, so there is no safe metadata transition. |
| ADG-000304 | Current official Bertie Bott's 35g information still declares no positive EU allergen but differs from the historical formula; the already ambient row has no safe transition. |
| ADG-000131 | Exact 340g Sang Tao 4 sources conflict between coffee-only and soy/milk additive formulas; the physical production lot is not pinned tightly enough for a legal composition rewrite. |
| ADG-000291 | Official Espresso Specialist 500g data confirms the current pure-coffee, Vietnam-origin, ambient row but provides no nutrition or positive allergen value to add. |
| ADG-000294 | Exact-EAN Creative 4 250g sources disagree between possible milk traces and dairy-free or coffee-only declarations, while production has no barcode; no safe transition is emitted. |
| ADG-000296 | Exact-EAN Creative 5 250g sources disagree between possible milk traces and dairy-free or coffee-only declarations, while production has no barcode; no safe transition is emitted. |
| ADG-000470 | Sang Tao 5 340g sources conflict between coffee-only and soy/milk additive formulas, and production has no barcode to pin the physical label generation; no legal metadata is rewritten. |

## Guardrails

- Tenant is pinned to `e73271a9-53e3-4a20-a02e-791726b452aa` and active channel `asiandeligo`.
- Apply is SERIALIZABLE, locks exact current product rows, and requires exact IDs, SKU, name, slug, category, status, metadata snapshot, and updated_at.
- Persistent explicit-column backup and append-only batch audit rows are created before mutation.
- Only products metadata columns are updated; product_variants, categories, prices, stock, publication, and identifiers are unchanged.
- Rollback requires the exact applied snapshot and applied_updated_at, so it refuses intervening edits.
- SQL never deletes rows, drops tables, or manually assigns products.updated_at.

## JOIN contract

- `product_variants.template_id (uuid) = products.id (uuid)` — declared FK and sampled on production.
- `products.category_id (uuid) = categories.id (uuid)` — declared FK and sampled on production.
- All four business tables are independently tenant-scoped; products and variants exclude soft-deleted rows.

## Recovery evidence

- Product backup: `asiandeligo_catalog_metadata_batch5_product_backup_20260722`.
- Audit log: `asiandeligo_catalog_metadata_batch5_audit_20260722`.
- Apply SQL: `docs/asiandeligo-catalog-metadata-batch5-apply-20260722.sql`.
- Rollback SQL: `docs/asiandeligo-catalog-metadata-batch5-rollback-20260722.sql`.
