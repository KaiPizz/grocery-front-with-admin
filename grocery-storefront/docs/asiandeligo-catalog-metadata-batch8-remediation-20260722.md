# Asia Deli Go catalog metadata batch 8

Prepared: 2026-07-22T13:55:14Z
Batch: `asiandeligo-catalog-metadata-batch8-20260722-v1`
Decision SHA-256: `b7f405d8eea6aa7465f63ba05f9e00ed8c14bea2525675db003041775b99ca93`

## Result

- Reviewed cohort: 25 exact SKUs.
- High-confidence product transitions: 13.
- Evidence/conflict/no-op holds: 12.
- Stock quantity is explicitly outside this batch and remains unchanged.
- Production mutation in this preparation step: none.

## Field changes

| Field | Products |
| --- | ---: |
| allergens | 0 |
| mayContainAllergens | 0 |
| storageZone | 13 |
| nutritionFacts | 0 |
| countryOfOrigin | 0 |
| ingredients | 0 |

## Approved transitions

| SKU | Product | Changed fields | Reason |
| --- | --- | --- | --- |
| ADG-000492 | Algi Sushi Nori Premium Gold 3 x 10 szt - Asia Kitchen | storageZone | The exact 3 x 10 Asia Kitchen bundle contains the same 26g dry nori consumer unit; independent exact-unit labels require dry, cool shelf storage. Iodine and desiccant warnings are not misrepresented as allergens. |
| ADG-000493 | Algi Sushi Nori Premium Gold 5 x 10 szt - Asia Kitchen | storageZone | The exact 5 x 10 Asia Kitchen bundle contains five matching dry nori consumer units; independent exact-unit labels require dry, cool shelf storage. Iodine and desiccant warnings remain outside this metadata patch. |
| ADG-000537 | Glony do sushi Yaki Nori GOLD 10 szt. - KC | storageZone | The exact Kwang Cheon Kim 10-sheet/25g nori unit is a dry shelf product; exact and same-unit listings specify protection from sunlight and moisture. Nutrition and warning fields remain unchanged. |
| ADG-000538 | Glony do sushi Yaki Nori GOLD 3 x 10 szt. - KC | storageZone | The exact 3 x 10 Kwang Cheon Kim bundle is composed of the same dry 25g nori unit; independent exact-unit and bundle labels establish ambient storage. |
| ADG-000539 | Glony do sushi Yaki Nori GOLD 5 x 10 szt. - KC | storageZone | The exact 5 x 10 Kwang Cheon Kim bundle contains five matching dry nori units; the source bundle and independent exact-unit family labels establish ambient shelf storage. |
| ADG-000564 | Algi Sushi Nori Gold 50 szt. - Sen Soy | storageZone | Exact-EAN Sen Soy 50-sheet/125g listings identify a dry nori product that must be protected from moisture; only unopened storage is changed. |
| ADG-000234 | Wakame (miyeok) suszone wodorosty sałatkowe 25g - CJO Essential | storageZone | Independent exact-GTIN CJO 25g wakame listings specify dry shelf storage. Conflicting trace-shellfish statements are deliberately not imported. |
| ADG-000352 | Wakame, suszone wodorosty 100g - Eagle Brand | storageZone | Exact Eagle Brand 100g wakame listings consistently describe a dry shelf product; no positive regulated allergen is invented. |
| ADG-000025 | Wodorosty kombu 100g Asia Kitchen | storageZone | Exact-EAN Asia Kitchen kombu labels consistently require dry, cool ambient storage. Conflicting nutrition generations and the separate iodine warning are left unchanged. |
| ADG-000069 | Grzyby shiitake w zalewie 284g Diamond | storageZone | Exact-EAN Diamond shiitake 284g labels specify cool, dry room-temperature storage; refrigeration applies only after opening. |
| ADG-000089 | Grzyby słomiane (pochwiaki) 425g - Diamond | storageZone | Exact-EAN Diamond straw-mushroom 425g labels consistently specify dry, cool shelf storage; after-opening refrigeration is not used as the unopened class. |
| ADG-000957 | Grzyby shiitake w zalewie 284g - House of Asia | storageZone | Independent exact-EAN House of Asia shiitake 284g labels specify dry, cool unopened storage and reserve refrigeration for after opening. |
| ADG-000308 | Yuba, suszone płaty tofu 200g - Swallow Sailing | storageZone | Exact-EAN Swallow Sailing yuba 200g labels specify dry, cool shelf storage. Existing soybean allergen data is retained and conflicting nutrition generations are not imported. |

## Holds

| SKU | Reason |
| --- | --- |
| ADG-000105 | The historical mapped source identifies a Diamond 22cm/300g paper while the live row and stored EAN identify Ricefield Cu Chi. Although Ricefield storage evidence is consistent, this batch does not pin the EAN in SQL, so an identity-sensitive transition is held. |
| ADG-000121 | The historical mapped source identifies a Diamond square paper while the live row and stored EAN identify Ricefield Cu Chi. The source-brand conflict must be reconciled in an identity-pinned batch before storage is changed. |
| ADG-000702 | Production already contains AMBIENT storage, cereals and soybeans allergens, and a complete nutrition object consistent with exact-EAN listings; no actual in-scope transition remains. |
| ADG-000062 | The live row says sliced Mun mushrooms, while its historical source ID resolves to whole Asia Kitchen mushrooms with a different EAN. Storage and food metadata cannot be transferred across that identity mismatch. |
| ADG-000179 | An official California Proposition 65 complaint names the exact UPC and alleges arsenic exposure. This is not treated as a recall or adjudicated finding, but the schema has no warning field, so even an isolated storage transition is held for current EU-label review. |
| ADG-000382 | Production already has AMBIENT storage, while exact-GTIN nutrition panels materially conflict and a historical lot-specific excess-iodine recall exists. A current physical label is required before any nutrition or warning-related transition. |
| ADG-000029 | Exact-EAN labels describe pure dried shiitake and production already has AMBIENT storage; there is no positive regulated allergen or other non-zero transition to write. |
| ADG-000034 | Exact-EAN labels describe pure dried shiitake and production already has AMBIENT storage; an empty or negative allergen declaration is not invented. |
| ADG-000071 | Exact-EAN labels describe dried Mun mushrooms and production already has AMBIENT storage; no positive regulated allergen exists to write. The cook-before-eating warning has no field in this batch. |
| ADG-000349 | Exact-EAN labels identify pure dried whole Mun mushrooms and production already has AMBIENT storage; there is no positive regulated allergen transition. |
| ADG-000350 | Exact-pack labels identify dried shredded Mun mushrooms and production already has AMBIENT storage; a negative retailer allergen assertion is not converted into a positive declaration. |
| ADG-000371 | The mapped source describes a Hiep Long 1kg product without a GTIN, while independent 1kg results identify a materially different Green Pagoda product and nutrition panel. Barcode/current-label evidence is required. |

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

- Product backup: `asiandeligo_catalog_metadata_batch8_product_backup_20260722`.
- Audit log: `asiandeligo_catalog_metadata_batch8_audit_20260722`.
- Apply SQL: `docs/asiandeligo-catalog-metadata-batch8-apply-20260722.sql`.
- Rollback SQL: `docs/asiandeligo-catalog-metadata-batch8-rollback-20260722.sql`.
