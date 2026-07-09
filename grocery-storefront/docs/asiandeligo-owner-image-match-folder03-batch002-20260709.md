# Asia Deli Go Owner Image Match - Folder 03 Batch 002

Generated: 2026-07-09

Remote source: `winpc:C:\co_Hanh\images\wetransfer-0dadc5`
Local batch: `/tmp/asiandeligo-owner-images/folder03-batch002`

## Batch Inventory

- Files copied for this batch: 31
- File range: `PETE7382.JPG` to `PETE8843.JPG`
- Source folder progress after this batch: 81 / 81 files reviewed
- Contact sheet:
  - `/tmp/asiandeligo-owner-images/folder03-batch002/contact-sheet.jpg`
- Visual quality notes: no visible hand/arm contamination found in this batch. Background is white fabric/plastic and some packages are wrinkled, but product labels are usable for review.

## Catalog Join Contract

- Catalog comparison used the existing production export `/tmp/asiandeligo-prod-products-20260709.tsv`.
- The export was produced from canonical `salons`, `products`, and `product_variants`.
- Production Asia Deli Go snapshot: 1784 live products, 1784 live variants, all `products.status = active`.

## Result

Generated candidate CSV:

- `docs/asiandeligo-owner-image-candidates-folder03-batch002-20260709.csv`

This batch is dry noodles/rice sticks/vermicelli. Most visible products are not exact matches for current production SKUs and should be reviewed as missing products.

## Candidate Summary

| Status | Count | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 1 | Visible brand/product/weight match an existing ADG SKU, but still needs owner/user accept before import. |
| `review_possible_existing_sku` | 1 | Similar visible product and candidate SKU, but label wording differs enough to require explicit confirmation. |
| `create_new_confirm` | 16 | No exact catalog row found; likely missing products to create after owner confirmation. |

## Existing SKU Candidates

| Files | Visible product | Candidate SKU | Confidence | Catalog row |
| --- | --- | --- | --- | --- |
| `PETE7885.JPG` - `PETE7888.JPG` | Sempio Sweet Potato Noodles, 450g | `ADG-000224` | high | Makaron ze slodkich ziemniakow i tapioki 450g - Sempio |
| `PETE7630.JPG` | Hiep Long Bun Ha Noi LaMi Size M rice vermicelli, 500g | `ADG-000013` | medium | Makaron ryzowy LaMi M do Pho 500g Hiep Long |

## Create-New / Confirm Candidates

| Files | Visible product | Notes |
| --- | --- | --- |
| `PETE7382.JPG`, `PETE7383.JPG` | VIMIXA Quick Cooking Noodles | Weight/EAN need confirmation from side/back label. |
| `PETE7384.JPG`, `PETE7385.JPG` | Golden Lotus Chinese Style Thick Quick Cooking Noodles, likely 375g | Same product family as folder03-012; merge if confirmed. |
| `PETE7386.JPG`, `PETE7387.JPG` | Green Pagoda Quick Cooking Noodles, 500g | Catalog Green Pagoda rows are mushrooms only. |
| `PETE7614.JPG` | Hiep Long Bun Ha Noi LaMi Size S rice vermicelli, 500g | Different size from existing/potential Size M SKU. |
| `PETE7615.JPG`, `PETE7616.JPG` | Tufoco Bamboo Tree Vietnamese Rice Noodle Size M, 400g | No exact catalog row found. |
| `PETE7617.JPG` | Tufoco Bamboo Tree Fresh Rice Vermicelli, 400g | No exact catalog row found. |
| `PETE7619.JPG` | Hiep Long Bun Ha Noi LaMi Size L rice vermicelli, 500g | Different size from existing/potential Size M SKU. |
| `PETE7626.JPG` | Tufoco Bamboo Tree Vietnamese Rice Noodle Size L, 400g | No exact catalog row found. |
| `PETE7627.JPG` | Tufoco Bamboo Tree Vietnamese Rice Noodle Size XL, 400g | No exact catalog row found. |
| `PETE7629.JPG` | Tufoco Bamboo Tree Fine Rice Vermicelli, 340g | No exact catalog row found. |
| `PETE7653.JPG` - `PETE7655.JPG` | Oriental Food Chantaboon Rice Stick 5mm, 400g | Do not map to Farmer/Asia Kitchen rows; brand differs. |
| `PETE7675.JPG` | Asiafoods makaron sojowy / soy vermicelli, 1kg | Do not map to LongKou 1kg; brand differs. |
| `PETE7679.JPG` | Eagle brand Oriental Style Starch Noodle, 500g | No exact catalog row found. |
| `PETE7796.JPG`, `PETE7797.JPG` | Oriental Food Chantaboon Rice Stick 3mm, 400g | Do not map to Farmer/Asia Kitchen rows; brand differs. |
| `PETE7855.JPG`, `PETE7856.JPG` | Golden Chef Chantaboon Rice Stick 10mm XL, 375g | Same product family as folder03-007; merge if confirmed. |
| `PETE8841.JPG` - `PETE8843.JPG` | Chunsi Lanzhou Ramen Noodles, 2kg | Catalog has Chunsi 300g noodles only. |

## No Direct Import Yet

Direct import rows: 0

Reason: this stage is still building review/confirmation queues. Existing-SKU matches should be accepted in review before media import.
