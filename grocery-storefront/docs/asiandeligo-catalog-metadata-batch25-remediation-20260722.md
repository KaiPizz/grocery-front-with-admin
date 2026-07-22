# Asia Deli Go catalog metadata batch 25

Prepared: 2026-07-22T07:39:35Z
Batch: `asiandeligo-catalog-metadata-batch25-20260722-v1`
Decision SHA-256: `0aff66c79c10e96e5ca614fa4b5a250ae4f236d784bea557a3d72fe9836d4e9c`

## Result

- Reviewed cohort: 25 exact SKUs.
- High-confidence product transitions: 23.
- Evidence-insufficient holds: 2.
- Stock quantity is explicitly outside this batch and remains unchanged.
- Production mutation in this preparation step: none.

## Field changes

| Field | Products |
| --- | ---: |
| allergens | 3 |
| mayContainAllergens | 2 |
| storageZone | 21 |
| nutritionFacts | 1 |
| countryOfOrigin | 0 |
| ingredients | 1 |

## Approved transitions

| SKU | Product | Changed fields | Reason |
| --- | --- | --- | --- |
| ADG-000118 | Trawa cytrynowa suszona w kawałkach 50g | storageZone | The exact 50g listing is tied to the production EAN and specifies room-temperature dry storage; allergen and nutrition fields remain unchanged. |
| ADG-000193 | Sos Hoisin 455ml - Flying Goose | allergens, mayContainAllergens, storageZone | The exact Flying Goose 455ml formula contains wheat, soy, and sesame; its label also warns of peanut traces and specifies dry ambient storage. |
| ADG-000211 | Ocet z brązowego ryżu 900ml - CJO Essential | storageZone | Two exact Chung Jung One/CJO 900ml listings specify cool, dry ambient storage; disputed formula and nutrition data remain unchanged. |
| ADG-000270 | Suszone liście limonki kaffir, liście papedy całe 25g - Thai Dancer | storageZone, ingredients | Two exact Thai Dancer 25g listings identify a single 100% dried kaffir-lime-leaf ingredient and dry ambient storage; the current ingredients field contains marketing copy. |
| ADG-000372 | Sos sojowy o zmniejszonej zawartości soli 150ml - Kikkoman | allergens, storageZone | Kikkoman and the exact supplier listing both identify wheat and soy allergens and shelf-stable storage before opening; conflicting nutrition/country claims are deliberately unchanged. |
| ADG-000437 | Ocet ryżowy 1l - Asia Kitchen | storageZone | Two exact Asia Kitchen 1l listings specify room-temperature, dry and dark storage; formula and nutrition remain unchanged. |
| ADG-000455 | Glutaminian sodu, Aji-no-Moto MSG 200g - Ajinomoto | storageZone | Exact Ajinomoto 200g listings and the manufacturer formulation support cool, dry ambient storage; no allergen or nutrition value is invented. |
| ADG-000497 | Glutaminian sodu, Aji-no-Moto MSG 454g - Ajinomoto | storageZone | Manufacturer and exact-pack retail evidence identify dry ambient storage; no allergen or nutrition value is invented for pure MSG. |
| ADG-001241 | Koreański sos rybny do kimchi Kanari Jeot 800g - YakMokCham | allergens, storageZone | Exact 800g YakMokCham listings agree on fish and crustacean ingredients and ambient storage; conflicting exact-EAN nutrition panels are deliberately held. |
| ADG-000054 | Pasta Curry Massaman 50g | storageZone | The exact 50g supplier product is shelf-stable and instructs cool, dry storage; existing formula and nutrition remain unchanged. |
| ADG-000055 | Pasta curry czerwona 50g | storageZone | The exact 50g supplier product specifies cool, dry shelf storage; existing formula and nutrition remain unchanged. |
| ADG-000056 | Pasta curry zielona 50g Cock Brand | storageZone | The exact 50g Cock Brand listing specifies cool, dry shelf storage; existing formula and nutrition remain unchanged. |
| ADG-000073 | Galangal w proszku 100g Cock Brand | nutritionFacts | The exact Cock Brand 100g product listing supplies the complete per-100g nutrition panel for the same single-ingredient powder. |
| ADG-000078 | Pasta z tamaryndowca 227g - Suree | storageZone | The exact Suree 227g technical sheet specifies dry ambient storage; current formula and nutrition remain unchanged. |
| ADG-000079 | Dhania, kolendra mielona 100g TRS | mayContainAllergens | The TRS manufacturer page gives the cross-contact warning for this coriander powder; it is stored separately from declared ingredients. |
| ADG-000085 | Pasta curry czerwona 400g | storageZone | The exact Cock Brand 400g retail label specifies room-temperature dry storage; all other metadata stays unchanged. |
| ADG-000091 | Cukier trzcinowy (brązowy) nierafinowany 500g - Mauritius Golden Cane | storageZone | The matching Mauritius Golden Cane 500g listing specifies dry room-temperature storage; other metadata remains untouched. |
| ADG-000092 | Syrop kukurydziany 100% 700g - CJO Essential | storageZone | The exact 700g Chung Jung One/CJO corn syrup listing specifies dry ambient storage; conflicting nutrition is deliberately unchanged. |
| ADG-000097 | Słodko-pikantny sos chili do kurczaka 650ml - Cock Brand | storageZone | Two matching Cock Brand 650ml listings specify cool, dry ambient storage; current formula and nutrition remain unchanged. |
| ADG-000116 | Mąka ryżowa, bezglutenowa 400g - Cock Brand | storageZone | The exact Cock Brand 400g rice flour trade listing specifies cool, dry ambient storage; all other fields remain unchanged. |
| ADG-000117 | Mąka ryżowa kleista 400g bezglutenowa - Cock Brand | storageZone | The exact Cock Brand 400g glutinous rice flour trade listing specifies cool, dry ambient storage; all other fields remain unchanged. |
| ADG-000125 | Tapioka, perełki małe 400g - Cock Brand | storageZone | Two matching Cock Brand small tapioca pearl listings specify dry ambient storage; other metadata remains unchanged. |
| ADG-000128 | Tapioka, perełki duże 454g - Cock Brand | storageZone | Two exact 454g large tapioca pearl listings support dry ambient storage; conflicting formula and nutrition claims are deliberately left unchanged. |

## Holds

| SKU | Reason |
| --- | --- |
| ADG-000219 | No current exact Hiep Long 100g package label was found to support nutrition and allergen fields. |
| ADG-000119 | The title claims a 70% chili Sriracha, while the current ingredients and matching manufacturer result describe a 51% chili extra-garlic formula; hold until package/EAN identity is verified. |

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

- Product backup: `asiandeligo_catalog_metadata_product_backup_20260722`.
- Audit log: `asiandeligo_catalog_metadata_audit_20260722`.
- Apply SQL: `docs/asiandeligo-catalog-metadata-batch25-apply-20260722.sql`.
- Rollback SQL: `docs/asiandeligo-catalog-metadata-batch25-rollback-20260722.sql`.
