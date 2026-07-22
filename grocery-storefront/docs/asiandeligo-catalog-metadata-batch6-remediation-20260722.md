# Asia Deli Go catalog metadata batch 6

Prepared: 2026-07-22T12:04:23Z
Batch: `asiandeligo-catalog-metadata-batch6-20260722-v1`
Decision SHA-256: `19d2a71766d82e9ac4089b60472959412bd49b772820b75521260ae112e7844f`

## Result

- Reviewed cohort: 25 exact SKUs.
- High-confidence product transitions: 14.
- Evidence-insufficient holds: 11.
- Stock quantity is explicitly outside this batch and remains unchanged.
- Production mutation in this preparation step: none.

## Field changes

| Field | Products |
| --- | ---: |
| allergens | 1 |
| mayContainAllergens | 0 |
| storageZone | 13 |
| nutritionFacts | 0 |
| countryOfOrigin | 1 |
| ingredients | 0 |

## Approved transitions

| SKU | Product | Changed fields | Reason |
| --- | --- | --- | --- |
| ADG-000556 | Matcha, sproszkowana zielona herbata w puszce 80g x 2 - Tian Hu Shan | storageZone | The exact Tian Hu Shan 80g consumer unit used by this two-pack has a supplier specification for storage between 2 and 30°C and independent cool-dry guidance; nutrition and the suspect egg/milk declaration remain untouched pending a current label photo. |
| ADG-000859 | Sok z limonki 250ml - Golden Turtle | allergens | The current ingredient text explicitly contains potassium metabisulphite E224, and exact-EAN current labels identify sulphite; nutrition remains held because exact-pack sources disagree. |
| ADG-000526 | Mielonka wieprzowa Luncheon Meat 340g - Chung Jung One | storageZone, countryOfOrigin | The exact EAN and current 93%-pork formulation are manufactured in Denmark and labelled for cool-dry shelf storage before opening. |
| ADG-000655 | Garlic Tteokbokki, kluski ryżowe w sosie czosnkowo-paprykowym 260g - O'Food | storageZone | Exact 260g O'Food garlic tteokbokki sources identify a shelf-stable product stored at room temperature or cool and dry; conflicting trace-allergen policies are deliberately left unchanged. |
| ADG-000656 | Original Tteokbokki, kluski ryżowe w sosie gochujang 260g - O'Food | storageZone | The exact 260g O'Food original tteokbokki is a two-serving shelf-stable product with explicit room-temperature storage; its populated composition remains unchanged. |
| ADG-000901 | Danie instant Tteokbokki, kluski ryżowe w pikantnym sosie 160g - Sempio | storageZone | The exact GTIN Sempio 160g spicy cup label instructs cool-dry storage; its existing ingredients, allergens, and nutrition remain unchanged. |
| ADG-000902 | Danie instant Tteokbokki, kluski ryżowe w słodko-pikantnym sosie 160g - Sempio | storageZone | The exact GTIN Sempio 160g sweet-and-spicy cup is explicitly stored at room temperature; populated food metadata is retained. |
| ADG-000943 | Makaron stir-fry instant o smaku solonego jajka 85g - MAMA Oriental Kitchen | storageZone | The exact MAMA Oriental Kitchen salted-egg 85g product label specifies cool-dry storage away from sunlight; all populated composition fields are preserved. |
| ADG-001068 | BBQ Tteokbokki, kluski ryżowe w sosie barbecue 260g - O'Food | storageZone | Exact GTIN and official O'Food sources identify the 260g BBQ tteokbokki as a shelf-stable product stored at room temperature or cool and dry. |
| ADG-001120 | Danie makaron carbonara o smaku bekonu 85g - MAMA Oriental Kitchen | storageZone | The exact GTIN MAMA carbonara-bacon 85g label specifies cool-dry storage, so only the missing storage classification changes. |
| ADG-001121 | Zupa makaron Mala o smaku wołowiny 85g - MAMA Oriental Kitchen | storageZone | The exact GTIN MAMA Mala beef 85g label specifies dry room-temperature storage; existing ingredients, allergens, and nutrition remain unchanged. |
| ADG-001129 | Danie makaron udon Sesame Teriyaki Bowl 240g - Obento | storageZone | The matching Obento Sesame Teriyaki 240g China label specifies cool-dry storage, supporting an ambient classification without altering composition. |
| ADG-001130 | Danie makaron udon Spicy Kung Pao Bowl 240g - Obento | storageZone | The matching Obento Spicy Kung Pao 240g formula is sold for ambient shelf storage; all populated food metadata remains unchanged. |
| ADG-001205 | Danie makaron Tom Yum z krewetkami 85g - MAMA Oriental Kitchen | storageZone | The exact GTIN MAMA Tom Yum shrimp 85g label specifies cool-dry storage; only the absent storage classification is added. |

## Holds

| SKU | Reason |
| --- | --- |
| ADG-000485 | Exact-EAN Che Phin 4 listings conflict on both formulation and nutrition, so neither a positive allergen declaration nor a nutrition panel can be selected safely without a current pack photo. |
| ADG-000658 | Sang Tao 3 sources conflict between a pure-Arabica formulation and an exact-EAN EU formulation containing soy and additives; nutrition panels also disagree, so no safe transition is available. |
| ADG-000759 | The exact product is already recorded as pure Japanese matcha with no regulated allergen and ambient storage; plain tea may be exempt from a mandatory nutrition declaration, so filling nutrition would invent data. |
| ADG-000804 | The exact genmaicha is already recorded with its tea-and-rice ingredients, no regulated allergen, Japan origin, and ambient storage; no product-specific nutrition panel is available or required to create a safe change. |
| ADG-000805 | The exact bancha is already pure Japanese tea with no regulated allergen and ambient storage; its absent nutrition panel is not a safe metadata gap to synthesize. |
| ADG-000806 | The exact sencha is already pure Japanese tea with no regulated allergen and ambient storage; no exact label nutrition is available and none should be inferred from brewed tea. |
| ADG-000807 | The exact hojicha is already recorded as pure roasted Japanese tea with no regulated allergen and ambient storage; adding nutrition without its current label would be speculative. |
| ADG-000854 | Exact-EAN listings describe pure Korean ginseng granules already stored with no regulated allergen, Korea origin, and ambient storage; no current-pack nutrition panel supports a change. |
| ADG-000389 | Three current listings for exact GTIN 8710647102006 disagree materially on calories, protein, and salt, so the missing nutrition panel requires a current can photo. |
| ADG-000876 | The historical EU listing names soy and molluscs while the official exact-JAN Japanese specification declares none of its regulated 28 allergens; a current EU sticker photo is required before changing allergen fields. |
| ADG-000914 | The exact historical Hereford generation declares no positive regulated allergen and production already stores an empty allergen list, so there is no evidence-backed metadata transition to apply. |

## Guardrails

- Tenant is pinned to `e73271a9-53e3-4a20-a02e-791726b452aa` and active channel `asiandeligo`.
- Apply is SERIALIZABLE, locks exact current product rows, and requires exact IDs, SKU, name, slug, category, status, metadata snapshot, and updated_at.
- Persistent explicit-column backup and uniquely keyed batch audit rows are created before mutation.
- Only products metadata columns are updated; product_variants, categories, prices, stock, publication, and identifiers are unchanged.
- Rollback requires the exact applied snapshot and applied_updated_at, so it refuses intervening edits.
- SQL never deletes rows, drops tables, or manually assigns products.updated_at.

## JOIN contract

- `product_variants.template_id (uuid) = products.id (uuid)` — declared FK and sampled on production.
- `products.category_id (uuid) = categories.id (uuid)` — declared FK and sampled on production.
- All four business tables are independently tenant-scoped; products and variants exclude soft-deleted rows.

## Recovery evidence

- Product backup: `asiandeligo_catalog_metadata_batch6_product_backup_20260722`.
- Audit log: `asiandeligo_catalog_metadata_batch6_audit_20260722`.
- Apply SQL: `docs/asiandeligo-catalog-metadata-batch6-apply-20260722.sql`.
- Rollback SQL: `docs/asiandeligo-catalog-metadata-batch6-rollback-20260722.sql`.
