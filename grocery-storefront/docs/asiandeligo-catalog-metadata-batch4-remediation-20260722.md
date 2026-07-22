# Asia Deli Go catalog metadata batch 4

Prepared: 2026-07-22T10:13:50Z
Batch: `asiandeligo-catalog-metadata-batch4-20260722-v1`
Decision SHA-256: `2025ae4440ca3468156b4c7430db77ee4f41c2f7e77ad48cb3cc7e4c34709595`

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
| mayContainAllergens | 3 |
| storageZone | 20 |
| nutritionFacts | 1 |
| countryOfOrigin | 6 |
| ingredients | 1 |

## Approved transitions

| SKU | Product | Changed fields | Reason |
| --- | --- | --- | --- |
| ADG-000087 | Zupa makaronowa Neoguri Ramyun z owocami morza, ostra 120g - Nongshim | storageZone | Exact-EAN Nongshim Neoguri 120g sources support unopened cool, dry ambient storage; conflicting formula generations remain unchanged. |
| ADG-000096 | Zupa instant Shin Kimchi Ramyun, ostra 120g Nongshim | storageZone | Exact-EAN Nongshim Kimchi Ramyun 120g sources support dry ambient storage, while exact-EAN allergen and recipe generations conflict and are deliberately held. |
| ADG-000107 | Zupa Soon Veggie Ramyun, lekko pikantna 112g - Nongshim | allergens, mayContainAllergens, storageZone | The exact 112g Soon Veggie label separates direct wheat/soy from its trace declaration and specifies dry ambient storage; the current broad direct-allergen parse is corrected. |
| ADG-000133 | Zupa instant Shin Ramyun, duża micha 114g - Nongshim | storageZone | Exact-EAN Nongshim Shin Big Bowl 114g listings identify an unopened shelf-stable product; current composition fields are retained. |
| ADG-000274 | Larwy jedwabnika w zalewie 130g - Yoo Dong | storageZone | The mapped Yoo Dong 130g canned product is shelf-stable, but production has no EAN and current exact-pack labels expand both direct and trace allergens; all composition fields are held. |
| ADG-000816 | Mochi, ryżowe ciasteczka w 3 smakach 250g - Royal Family | storageZone | Royal Family mixed-mochi 250g sources support dry ambient storage, but exact-GTIN label generations conflict on allergens and nutrition; all composition fields are held. |
| ADG-001046 | Chipsy ziemniaczane Chili Spicy Crayfish o smaku raka 104g - Lay's | storageZone | Mapped Lay's Spicy Crayfish 104g sources support shelf-stable storage, but production has no EAN and current exact-product labels conflict on direct allergens; composition remains unchanged. |
| ADG-001217 | Wafelki z nadzieniem Cream Collon Assari Milk 81g - Glico | allergens, storageZone, nutritionFacts | The official Japanese Glico listing pins the exact 81g pack, four direct allergen groups, ambient storage, and per-13.5g nutrition basis; no unsupported trace allergens are added. |
| ADG-000262 | Paluszki Pepero Migdały i Czekolada 32g - Lotte | storageZone | Exact 32g Lotte Almond Pepero sources support dry ambient storage; conflicting regional formula and nutrition generations remain unchanged. |
| ADG-000263 | Paluszki Pepero Czekoladowe Original 47g - Lotte | storageZone | Exact 47g Lotte Original Pepero sources support dry ambient storage; formula and nutrition revisions are held. |
| ADG-000286 | Jelly Belly Bean Boozled Spinner - Fasolki wszystkich smaków 100g | storageZone | Jelly Belly Bean Boozled Spinner 100g sources consistently support unopened ambient storage; changing edition-specific formula or nutrition would be unsafe. |
| ADG-000298 | Paluszki Pocky Cookies & Cream 40g - Glico | storageZone, countryOfOrigin | The exact 40g Glico Pocky Cookies & Cream pack is Thai-made and shelf-stable; existing allergen and nutrition fields are preserved. |
| ADG-000347 | Choco Pie, ciastka biszkoptowe z pianką, pudełko (12 szt. x 28g) - Lotte | storageZone, countryOfOrigin | Exact Lotte Choco Pie 12-pack sources agree on South Korean production and shelf-stable storage; market-specific formula and allergen revisions remain unchanged. |
| ADG-000396 | Chipsy z wodorostów, chrupiące nori 32g - Tao Kae Noi | storageZone | Exact Tao Kae Noi Crispy Seaweed Original 32g sources specify unopened dry ambient storage; existing formula and nutrition are retained. |
| ADG-000575 | Chipsy ziemniaczane Potechi Wasabi Nori 100g - Koikeya | countryOfOrigin | The Koikeya Europe product specification and exact-EAN retailer record identify the 100g Potechi Wasabi Nori pack as made in Belgium. |
| ADG-000965 | Hokkaido Yude Azuki, gotowana słodka czerwona fasola cała 200g - Imuraya | storageZone, countryOfOrigin | Official Imuraya and Japanese retailer records identify the Yude Azuki canned beans as Japanese and shelf-stable, correcting the current Korea origin. |
| ADG-000066 | Chipsy krewetkowe 75g - Nongshim | storageZone | Exact-EAN Nongshim Shrimp Cracker 75g sources support cool, dry ambient storage; old and new formulas conflict, so composition remains unchanged. |
| ADG-000120 | Chipsy krewetkowe, pikantne 75g - Nongshim | storageZone | Exact-EAN Nongshim Hot & Spicy Shrimp Cracker 75g sources support dry ambient storage; conflicting shrimp percentages and formula generations are held. |
| ADG-000172 | Mochi, ryżowe ciasteczka z pastą z fasolki azuki 210g -  Yuki & Love | mayContainAllergens, storageZone | Exact-EAN Yuki & Love red-bean mochi sources keep soy as direct and add the omitted peanut trace alongside gluten, nuts, and sesame; unopened storage is ambient. |
| ADG-000220 | Paluszki Pocky Czekoladowe Original 47g - Glico | countryOfOrigin | The mapped Glico Pocky Chocolate 47g product and exact GTIN records identify Thai production; formula revisions are not changed on the null-EAN production row. |
| ADG-000221 | Pocky Double Choco, kakaowe paluszki z kremem czekoladowym 39g - Glico | countryOfOrigin, ingredients | Exact Glico Double Chocolate 39g label records replace marketing prose in ingredients with the actual formula and identify Thai production. |
| ADG-000222 | Paluszki Pocky Truskawkowe 45g - Glico | storageZone | Mapped Glico Pocky Strawberry sources consistently support unopened ambient storage; multiple 35g/45g/47g formula revisions prevent composition or nutrition changes. |
| ADG-000227 | Orzeszki ziemne w skorupce kokosowej 185g - Khao Shong | allergens, mayContainAllergens, storageZone | The exact Khao Shong Coconut Coated Peanuts 185g label separates direct wheat/peanut from its trace list; coconut milk is not dairy, and the unopened product is ambient. |

## Holds

| SKU | Reason |
| --- | --- |
| ADG-000040 | The exact 1kg Kimpo sushi-rice row is already complete for the safe reviewed fields; no zero-value rewrite is emitted. |
| ADG-000129 | The exact-EAN Vinamit jackfruit row already contains the safe reviewed origin, storage, ingredients, allergen, and nutrition fields; no zero-value rewrite is emitted. |

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

- Product backup: `asiandeligo_catalog_metadata_batch4_product_backup_20260722`.
- Audit log: `asiandeligo_catalog_metadata_batch4_audit_20260722`.
- Apply SQL: `docs/asiandeligo-catalog-metadata-batch4-apply-20260722.sql`.
- Rollback SQL: `docs/asiandeligo-catalog-metadata-batch4-rollback-20260722.sql`.
