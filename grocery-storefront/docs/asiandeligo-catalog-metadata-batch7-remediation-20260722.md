# Asia Deli Go catalog metadata batch 7

Prepared: 2026-07-22T12:50:31Z
Batch: `asiandeligo-catalog-metadata-batch7-20260722-v1`
Decision SHA-256: `2287c2c57b6758668141ee12ebd1b2e5143e8643c0f80e38259513b24c378a0e`

## Result

- Reviewed cohort: 25 exact SKUs.
- High-confidence product transitions: 21.
- Evidence-insufficient holds: 4.
- Stock quantity is explicitly outside this batch and remains unchanged.
- Production mutation in this preparation step: none.

## Field changes

| Field | Products |
| --- | ---: |
| allergens | 4 |
| mayContainAllergens | 0 |
| storageZone | 20 |
| nutritionFacts | 0 |
| countryOfOrigin | 1 |
| ingredients | 0 |

## Approved transitions

| SKU | Product | Changed fields | Reason |
| --- | --- | --- | --- |
| ADG-001234 | Sweet Chili Tteokbokki, kluski ryżowe w sosie słodkie chili 290g - O'Food | storageZone | Exact-GTIN O'Food 290g listings consistently require cool, dry, room-temperature storage; conflicting secondary allergen declarations are deliberately left unchanged. |
| ADG-001387 | Danie instant z ziemniaczanym makaronem Japchae Cup 82g - Sempio | storageZone | Independent exact-pack Sempio Japchae Cup listings specify dry, cool shelf storage; disputed secondary sulphite wording is not imported. |
| ADG-001492 | Danie makaron świeży udon Korean Style Tteokbokki Chilli 187g - Bibigo | storageZone | Exact 187g Bibigo Tteokbokki Udon labels consistently specify ambient cool-dry storage; broad trace-allergen lists vary by market and remain unchanged. |
| ADG-001493 | Danie makaron świeży udon Korean Style BBQ 187g - Bibigo | storageZone | The exact 187g Bibigo Korean BBQ Udon consumer unit is shelf-stable and labelled for cool-dry storage; variable cross-contact lists remain held. |
| ADG-000074 | Mango, plastry w syropie lekko słodzonym 425g Diamond | storageZone | Distributor and retailer records for production GTIN 4316734047607 specify room-temperature or cool-dry storage; conflicting nutrition generations remain untouched. |
| ADG-000182 | Mango, przecier bez cukru 500g Philippine Brand | storageZone | Exact EU GTIN and exact-pack listings consistently require dry, dark or cool-dry shelf storage; disputed sulphite cross-contact wording remains held. |
| ADG-000217 | Rzodkiew Oshinko (Takuan) marynowana, pocięta 350g - Asia Kitchen | allergens, storageZone | Exact-product labels explicitly declare sulphites from sodium metabisulphite and specify dry-cool shelf storage; conflicting nutrition values remain unchanged. |
| ADG-000605 | Napa kimchi, koreańska kiszona kapustka 80g - Jongga | storageZone | The exact 80g Jongga shelf-stable Napa kimchi is explicitly sold without refrigeration before opening; conflicting cross-contact presentations remain unchanged. |
| ADG-000793 | Fasola edamame, ziarna soi w zalewie 400g - ITA-SAN | allergens, storageZone | Exact-GTIN labels identify soybeans as the direct ingredient and allergen and specify room-temperature or cool-dry storage. |
| ADG-000998 | Pędy bambusa nitki 227g - Royal Orient | storageZone | Current-label Royal Orient bamboo strips with the exact brand, form and 227g pack are consistently shelf-stable; label-revision nutrition and ingredient differences are held. |
| ADG-001105 | Shiso-dzuke umeboshi, śliwki marynowane z shiso (12% soli) 100g - King of Plum | countryOfOrigin | Independent exact-GTIN listings for the matching formula identify Japan as the product origin; the ambiguous historical composite value is not used. |
| ADG-001166 | Rzodkiew Oshinko (Takuan) marynowana, pocięta 400g - Sakura | allergens, storageZone | Exact-EAN Sakura 400g labels explicitly declare sulphites and specify cool-dry shelf storage; the phenylalanine warning is outside the allergen-array schema. |
| ADG-001215 | Pędy bambusa plastry 227g - Royal Orient | storageZone | Independent exact Royal Orient bamboo-slices 227g listings consistently identify a shelf-stable product; conflicting label revisions remain unchanged. |
| ADG-001571 | Fasola edamame, ziarna soi w zalewie 400g - House of Asia | allergens, storageZone | The official product and exact-EAN Polish listings identify soy as a direct ingredient and allergen and specify ambient storage. |
| ADG-000080 | Kiełki fasoli mung 330g Diamond | storageZone | Exact-EAN shelf labels show that refrigeration applies only after opening; the current CHILLED value was inferred from that after-opening instruction and is wrong for unopened stock. |
| ADG-000276 | Zielony jackfruit w słonej zalewie 540g - Twin Elephants & Earth Brand | storageZone | All located 540g Twin Elephants shelf variants are ambient before opening; the current CHILLED value came solely from a post-opening refrigeration instruction and is not an unopened storage class. |
| ADG-000110 | Papier ryżowy okrągły 22cm, 500g - Hiep Long | storageZone | Exact-barcode Hiep Long 22cm 500g rice-paper listings consistently specify dry-cool shelf storage; disputed country and absent nutrition stay unchanged. |
| ADG-000535 | Wakame, suszone wodorosty 300g (3 x 100g) Nobi | storageZone | The exact 3x100g Nobi wakame bundle and its exact 100g member unit both require dry-cool shelf storage; pack identity and nutrition are not changed. |
| ADG-000265 | Glony do sushi Yaki Nori GOLD 50 szt. - KC | storageZone | Exact item-code 50-sheet KC Yaki Nori listings consistently specify dry-cool storage; alternate marketplace identifiers and weight tolerance are outside this patch. |
| ADG-000453 | Glony Yaki Sushi Nori Gold, 50 szt. - Nobi | storageZone | Both known Nobi 50-sheet label generations identify dried roasted nori with dry-cool shelf storage; GTIN drift is deliberately not resolved by this storage-only patch. |
| ADG-000491 | Algi Sushi Nori Premium Gold 10 szt - Asia Kitchen | storageZone | Exact 10-sheet Asia Kitchen Nori listings consistently specify dry-cool shelf storage; identifier and nutrition revisions remain untouched. |

## Holds

| SKU | Reason |
| --- | --- |
| ADG-001460 | Harim sells materially different ambient-retort and frozen 800g Samgyetang products; without the stocked GTIN or storage panel, no trace-allergen or other metadata transition is safe. Chestnut is not an EU-14 tree-nut allergen. |
| ADG-000606 | Koszyk Wioli - Znawca is a curated multi-item basket, not one stable prepacked food formula; ingredients, allergens, nutrition, origin and storage must not be synthesized for it. |
| ADG-000020 | The exact-EAN product already has AMBIENT storage and no regulated allergen; current ingredient and nutrition listings conflict with the stored label generation, so there is no safe non-zero transition. |
| ADG-000035 | The exact-EAN ginger already has AMBIENT storage and no EU-14 allergen; small nutrition revision differences and the separate phenylalanine warning do not support a database transition in this field scope. |

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

- Product backup: `asiandeligo_catalog_metadata_batch7_product_backup_20260722`.
- Audit log: `asiandeligo_catalog_metadata_batch7_audit_20260722`.
- Apply SQL: `docs/asiandeligo-catalog-metadata-batch7-apply-20260722.sql`.
- Rollback SQL: `docs/asiandeligo-catalog-metadata-batch7-rollback-20260722.sql`.
