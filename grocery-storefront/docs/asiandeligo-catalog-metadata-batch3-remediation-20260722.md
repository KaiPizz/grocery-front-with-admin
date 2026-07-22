# Asia Deli Go catalog metadata batch 3

Prepared: 2026-07-22T09:17:35Z
Batch: `asiandeligo-catalog-metadata-batch3-20260722-v1`
Decision SHA-256: `01e138ed3f76c4871e981bec117a4e1051ba18d3bfdc8566364012c4c46fa00e`

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
| nutritionFacts | 2 |
| countryOfOrigin | 6 |
| ingredients | 0 |

## Approved transitions

| SKU | Product | Changed fields | Reason |
| --- | --- | --- | --- |
| ADG-000104 | Makaron ryżowy 10mm 400g - Farmer | storageZone | The production EAN and two exact-pack Farmer listings specify shelf-stable dry, cool storage; conflicting nutrition revisions remain unchanged. |
| ADG-000123 | Makaron sojowy Vermicelli 500g, pakowane po 5x100g - LongKou | storageZone | Two exact-EAN LongKou 5x100g listings support unopened ambient dry storage; conflicting nutrition panels and trace declarations are held. |
| ADG-000250 | Makaron ryżowy 1mm 400g - Farmer | storageZone | The exact historical source and independent Farmer 1mm/400g listings require dry, cool ambient storage; malformed and conflicting energy values are not copied. |
| ADG-000251 | Makaron Shirataki Konjac, nitki 400g - City Aroma | storageZone | Exact mapped and independent City Aroma 400g listings specify unopened shelf-stable storage at or below room temperature; ambiguous noodle naming and EAN are not changed. |
| ADG-000280 | Makaron sojowy vermicelli LongKou 1kg, porcjowany 20 x 50g | storageZone | The exact mapped 20x50g product and independent pack listings support dry ambient storage; conflicting formulas, nutrition, traces, and candidate EAN remain untouched. |
| ADG-000346 | Ryż czarny kleisty (Ketan Itam) 400g - North South | storageZone | Exact North South 400g sources support dry, cool ambient storage; Singapore-versus-Indonesia origin evidence is conflicting and remains unchanged. |
| ADG-000419 | Zupa Kimchi ramen Hot & Spicy z prawdziwym kimchi 122g - Jongga | storageZone, countryOfOrigin | Exact-pack Jongga sources agree on South Korean production and dry ambient storage; market-specific milk declarations and formulas are left unchanged. |
| ADG-000547 | Ryż do sushi Tsuru 1kg - Curtiriso | countryOfOrigin | The manufacturer and an exact-EAN specification identify Tsuru rice as produced and packed in Italy; ambiguous retailer references to Japan are rejected. |
| ADG-000578 | Kluski ryżowe do Tteokbokki, małe słupki 600g (3 x 200g) - Matamun | storageZone | Exact-EAN Matamun 3x200g sources specify unopened dry ambient storage; conflicting nutrition revisions remain unchanged. |
| ADG-000581 | Kluski ryżowe do Tteokguk, małe plasterki 600g (3 x 200g) - Matamun | storageZone | Exact-EAN Matamun sliced 3x200g sources specify unopened dry ambient storage; irreconcilable exact-pack nutrition panels are held. |
| ADG-000640 | Zupa makaronowa Demae Ramen o smaku kaczki 100g - Nissin | storageZone, countryOfOrigin | The mapped Polish label and exact-EAN distributor specification agree on Hungarian production and dry ambient storage; conflicting label generations keep the current allergens, trace split, and nutrition unchanged. |
| ADG-000693 | Zupa makaronowa Demae Ramen o smaku miso 100g - Nissin | storageZone, nutritionFacts, countryOfOrigin | The manufacturer and exact-GTIN EU specifications agree on Hungarian production, ambient storage, and the existing values as a per-100ml prepared panel; the serving basis is corrected explicitly. |
| ADG-000781 | Ryż jaśminowy Premium Quality Orange 5kg - Royal Umbrella | nutritionFacts, countryOfOrigin | Exact EAN 8847102341219 identifies the orange Royal Umbrella bag as Cambodian rice and two exact-pack sources agree on the nutrition panel; Thai red-bag data is excluded. |
| ADG-000968 | Makaron ryżowy Vermicelli Bun Gao 400g - ICV | storageZone | Exact and independent ICV Bun Gao 400g listings specify unopened cool, dry ambient storage; existing matching formula, nutrition, and origin are preserved. |
| ADG-001008 | Kluski ryżowe do tteokbokki krojone, małe słupki A+ 500g - HoSan | storageZone | Exact-EAN HoSan 500g sources specify shelf-stable dry storage before opening; conflicting market trace declarations remain unchanged. |
| ADG-001021 | Ryż Basmati Original 1kg - Swad | storageZone, countryOfOrigin | The exact-EAN manufacturer-fed specification and independent exact product identify India origin and dry ambient storage; stale Pakistan and conflicting nutrition copies are rejected. |
| ADG-001039 | Ryż jaśminowy Thai Hom Mali Rice 1kg - Aroy-D | storageZone | An exact-pack manufacturer-fed specification and independent Aroy-D 1kg listing specify cool, dry ambient storage; existing matching metadata is preserved. |
| ADG-001415 | Ryż Basmati Premium Quality 1kg - Royal Tiger | storageZone | Exact-EAN Royal Tiger sources specify sealed dry, cool ambient storage; conflicting market origin and nutrition copies remain unchanged. |

## Holds

| SKU | Reason |
| --- | --- |
| ADG-001285 | No-op hold: current ingredients, Thailand origin, and AMBIENT storage are already complete; exact-EAN nutrition panels conflict, so there is no safe missing-field transition. |
| ADG-000002 | No-op hold: exact production-EAN sources corroborate the already complete formula, origin, storage, and nutrition; the empty direct-allergen array is already the stored value. |
| ADG-000013 | Hold: exact production-EAN sources conflict on sulphites/bleaching agent, formula, and nutrition; the current EU physical label is required before any allergen mutation. |
| ADG-000014 | No-op hold: exact production-EAN sources support current Thailand origin and AMBIENT storage, while nutrition varies by label revision; no safe actual transition remains. |
| ADG-000015 | Hold: exact production-EAN sources conflict on sulphites/bleaching agent, formula, and nutrition; the current EU physical label is required before any allergen mutation. |
| ADG-000017 | Hold: production EAN 9310432160168 cannot be corroborated and differs from known exact-pack LongKou EANs with variant formulas; physical-pack identity must be reconciled first. |
| ADG-000037 | No-op hold: current ingredients, AMBIENT storage, nutrition, and broad EU origin are already populated; exact-EAN label generations conflict on nutrition and country, so no actual safe transition remains. |

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

- Product backup: `asiandeligo_catalog_metadata_batch3_product_backup_20260722`.
- Audit log: `asiandeligo_catalog_metadata_batch3_audit_20260722`.
- Apply SQL: `docs/asiandeligo-catalog-metadata-batch3-apply-20260722.sql`.
- Rollback SQL: `docs/asiandeligo-catalog-metadata-batch3-rollback-20260722.sql`.
