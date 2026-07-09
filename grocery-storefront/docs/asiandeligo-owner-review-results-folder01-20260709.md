# Asia Deli Go owner image review results - folder 01

Source export: `C:\Users\pc\Downloads\asiandeligo-folder01-owner-decisions.csv`

Normalized copy: `docs/asiandeligo-owner-review-results-folder01-20260709.csv`

## Export note

The review tool exported literal `\n` text instead of real newlines, so the raw CSV from Windows was a single-line file. The data was still recoverable by normalizing `\n` into newline characters. The review HTML has been patched so the next export writes real CSV rows.

## Decision summary

| Bucket | Approve | Skip | Create new | Reject | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| `review_high_existing_sku` | 32 | 3 | 0 | 1 | 36 |
| `needs_owner_confirmation` | 8 | 15 | 10 | 3 | 36 |
| **Total** | **40** | **18** | **10** | **4** | **72** |

Main readout:
- 40 rows are safe candidates for image import after the media-path pipeline.
- The previous high-confidence matching is mostly good, but not clean enough for blind import: 32/36 approved strictly, with 3 partial/uncertain and 1 rejected.
- The owner review found real gaps: at least 10 new/missing products in this small batch, plus several skipped rows that likely map to existing SKUs after manual correction.

## Apply candidates

Import only rows with `decision=approve` from the normalized CSV as the first safe pass. Do not import `skip`, `create_new`, or `reject` rows automatically.

For products with multiple owner photos, preserve the image order from the CSV row unless a correction below says otherwise.

## Partial or corrected mappings

| Row | Images | Current candidate | Review result | Action |
| --- | --- | --- | --- | --- |
| `folder01-015` | `SAU_9665.jpg` | `ADG-001364` Tonkatsu Sauce 300ml - Bull-Dog | Owner says same product but bottle differs | Keep as pending/secondary image; do not replace primary unless owner accepts variant packaging. |
| `folder01-020` | `SAU_9771.jpg; SAU_9772.jpg; SAU_9773.jpg; SAU_9774.jpg` | `ADG-000115` Sempio Doenjang Soy Paste 460g | First 3 good, 4th belongs to another product | Import only `SAU_9771`-`SAU_9773` to `ADG-000115`. |
| `folder01-021` | `SAU_9775.jpg; SAU_9776.jpg` | `ADG-000093` Sempio Gochujang spicy paste 500g | Owner says `SAU_9774` from previous row belongs here | Import `SAU_9774`, `SAU_9775`, `SAU_9776` to `ADG-000093`. |
| `folder01-062` | `SAU_9758.jpg` | `ADG-000523 or ADG-000828 or ADG-000202` Lao Gan Ma variants | Owner says likely first link | Candidate becomes `ADG-000523` Crispy Chili in Soy Oil 210g; confirm before import. |
| `folder01-065` | `SAU_9808.jpg` | `ADG-000061 or ADG-000620` bamboo mat variants | Owner says first link | Candidate becomes `ADG-000061` Sushi Bamboo Mat thin 24x24cm; confirm before import. |

## Rejected mappings

| Row | Images | Rejected candidate | Reason | Action |
| --- | --- | --- | --- | --- |
| `folder01-022` | `SAU_9777.jpg; SAU_9778.jpg` | `ADG-000235` Sempio Ssamjang 170g | Images show two different Sempio products; mapping is wrong | Do not import; split and re-match later. |
| `folder01-037` | `SAU_9277.jpg` | `ADG-000289` Trung Nguyen Gourmet Blend 500g | Owner says image is 250g, candidate is 500g | Do not import to `ADG-000289`; create/confirm 250g SKU if sold. |
| `folder01-038` | `SAU_9281.jpg` | `ADG-000406` mixed Cocon pudding 6 x 80g | Image is lychee-only, not mixed flavor | Do not import to mixed SKU; create lychee-only SKU if sold. |
| `folder01-039` | `SAU_9283.jpg` | `ADG-000406` mixed Cocon pudding 6 x 80g | Image is mango-only, not mixed flavor | Do not import to mixed SKU; create mango-only SKU if sold. |

## New or missing products

These rows should become product-creation backlog items, or be matched again with a better OCR/catalog search before import.

| Row | Images | Corrected visible product | Catalog check | Action |
| --- | --- | --- | --- | --- |
| `folder01-040` | `SAU_9284.jpg` | Hoang Long Tra Che Nhai Dac Biet 100g | No catalog hit. Original auto label said Chaokoh coconut milk, which is wrong. | Create/confirm new tea SKU. |
| `folder01-041` | `SAU_9304.jpg` | Koh-Kae Peanuts Coconut Cream Flavour Coated | No catalog hit. | Create/confirm new snack SKU. |
| `folder01-050` | `SAU_9667.jpg` | Lee Kum Kee Chicken Marinade 410ml | No catalog hit. | Create/confirm new sauce SKU. |
| `folder01-051` | `SAU_9668.jpg` | Sen Soy Premium soy sauce, size unclear | Similar Sen Soy soy sauces exist, but no exact visible match. | Need size/EAN before creating or matching. |
| `folder01-052` | `SAU_9669.jpg` | Megachef Premium Mushroom Sauce 230g | Possible relation to `ADG-001000`, but name/image should be confirmed. | Hold for owner/catalog confirmation. |
| `folder01-053` | `SAU_9670.jpg` | Megachef Gluten-Free Soy Sauce 200ml | No catalog hit. | Create/confirm new sauce SKU. |
| `folder01-054` | `SAU_9677.jpg` | Megachef Gluten-Free Soy Sauce 500ml | No catalog hit. | Create/confirm new sauce SKU. |
| `folder01-055` | `SAU_9679.jpg` | Megachef Premium Mushroom Sauce 570g | No catalog hit. | Create/confirm new sauce SKU. |
| `folder01-056` | `SAU_9682.jpg` | Gold Plum Chinkiang Vinegar 550ml | Similar `ADG-000383` Chinkiang Black Rice Vinegar 550ml - Heng Shun. | Confirm if Gold Plum/Heng Shun is same SKU before import. |
| `folder01-058` | `SAU_9688.jpg` | Sen Soy soy sauce, large bottle, size unclear | No exact SKU found from visible label. | Need size/EAN before creating or matching. |

## Skipped but actionable

| Row | Images | Visible product | Likely action |
| --- | --- | --- | --- |
| `folder01-057` | `SAU_9685.jpg` | Maekrua Oyster Sauce 300ml | Likely matches `ADG-000190`; ask owner to approve if same packaging is acceptable. |
| `folder01-059` | `SAU_9693.jpg` | Cock/Rooster Sweet Chilli Sauce for Chicken 650ml | Likely matches `ADG-000097`; ask owner to approve. |
| `folder01-060` | `SAU_9696.jpg` | Guan Ji Superior Light Soy Sauce 600ml | No exact catalog hit; likely new product. |
| `folder01-066` | `SAU_9823.jpg` | Fresh Udon 200g, different manufacturer | Do not map to existing suggested udon SKUs; create/ignore after owner decision. |

## Ad or lifestyle images

Rows marked as ads/display images should not be imported into product galleries until a separate marketing/banner/gallery use-case is defined:

`folder01-042`, `folder01-043`, `folder01-044`, `folder01-045`, `folder01-046`, `folder01-069`, `folder01-070`, `folder01-071`, `folder01-072`.

## Recommended next step

1. Generate an import manifest from the 40 approved rows plus the corrected Sempio rules above.
2. Keep all rejected/create-new/skip rows out of the media import.
3. Build a product-creation backlog from the new/missing products, with required fields: product name PL/EN, size, brand, EAN if visible/available, category, price, stock, vegetarian/gluten-free flags.
4. For folder 02+, improve the review flow so the owner only sees high-confidence matches, likely matches, and product-creation candidates. Avoid asking for manual review of every product.
