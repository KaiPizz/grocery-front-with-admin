# Asia Deli Go Owner Image Match - Folder 03 Batch 001

Generated: 2026-07-09

Remote source: `winpc:C:\co_Hanh\images\wetransfer-0dadc5`
Local batch: `/tmp/asiandeligo-owner-images/folder03-batch001`

## Batch Inventory

- Files copied for this batch: 50
- File range: `PETE6847.JPG` to `PETE7375.JPG`
- Source folder progress after this batch: 50 / 81 files reviewed
- Contact sheets:
  - `/tmp/asiandeligo-owner-images/folder03-batch001/contact-sheet-1.jpg`
  - `/tmp/asiandeligo-owner-images/folder03-batch001/contact-sheet-2.jpg`
- OCR notes: `/tmp/asiandeligo-owner-images/folder03-batch001/ocr.txt`; full-size OCR was noisy and slow, so final calls were made by visual review plus targeted zoom.

## Catalog Join Contract

- Catalog comparison used the existing production export `/tmp/asiandeligo-prod-products-20260709.tsv`.
- The export was produced from canonical `salons`, `products`, and `product_variants`.
- Production Asia Deli Go snapshot: 1784 live products, 1784 live variants, all `products.status = active`.

## Result

Generated candidate CSV:

- `docs/asiandeligo-owner-image-candidates-folder03-batch001-20260709.csv`

This batch is mainly shelf-stable noodles/vermicelli/rice sticks plus coconut flakes. No hand/arm contamination was found in this batch.

## Candidate Summary

| Status | Count | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 5 | Visible brand/product/weight match an existing ADG SKU, but still needs owner/user accept before import. |
| `create_new_confirm` | 14 | No exact catalog row found; likely missing products to create after owner confirmation. |

## High-Confidence Existing SKU Candidates

| Files | Visible product | Candidate SKU | Catalog row |
| --- | --- | --- | --- |
| `PETE6867.JPG` - `PETE6870.JPG` | LongKou Vermicelli bean thread / saifun, 100g | `ADG-000017` | Makaron sojowy Vermicelli 100g LongKou |
| `PETE6994.JPG` - `PETE6996.JPG` | Farmer Brand Rice Vermicelli, 454g | `ADG-000014` | Makaron ryzowy Vermicelli, nitki 454g Farmer |
| `PETE7053.JPG`, `PETE7054.JPG` | Hiep Long Banh Da Do / red rice noodle, 500g | `ADG-000174` | Makaron ryzowy czerwony Hiep Long 500g |
| `PETE7275.JPG` - `PETE7278.JPG` | LongKou Vermicelli bean thread, 1kg | `ADG-000280` | Makaron sojowy vermicelli LongKou 1kg, porcjowany 20 x 50g |
| `PETE7367.JPG`, `PETE7368.JPG` | Hiep Long Pho Ha Noi LaMi Size M rice noodles, 500g | `ADG-000013` | Makaron ryzowy LaMi M do Pho 500g Hiep Long |

## Create-New / Confirm Candidates

| Files | Visible product | Notes |
| --- | --- | --- |
| `PETE6847.JPG` - `PETE6850.JPG` | Duy Anh Yellow Corn Starch Rice Vermicelli, 200g | No exact catalog row found. |
| `PETE6851.JPG` - `PETE6853.JPG` | Hiep Long Dac San Mien Moc / makaron platki z taro 7mm, 500g | Hiep Long exists, but not this exact product. |
| `PETE6987.JPG` - `PETE6989.JPG` | Farmer Brand Rice Flakes Sheet, 227g | No exact catalog row found. |
| `PETE6997.JPG` - `PETE7000.JPG` | Golden Swallow Brand Kong Moon Rice Stick, 500g | No exact catalog row found. |
| `PETE7001.JPG`, `PETE7002.JPG` | Chantaboon Rice Stick size 10mm XL, 375g | Similar category exists, brand/weight differ. |
| `PETE7052.JPG` | Green Bean Vermicelli / Feuille De Soja, 250g | No exact catalog row found. |
| `PETE7134.JPG`, `PETE7135.JPG` | Wai Wai Rice Vermicelli 0.5mm, 400g | Do not map to ICV Bun Gao 400g. |
| `PETE7279.JPG`, `PETE7280.JPG` | Golden Lotus Chinese Style Thick Quick Cooking Noodles, 375g | No exact catalog row found. |
| `PETE7347.JPG` - `PETE7349.JPG` | Hiep Long Dac San Mien Moc / cassava noodle, 500g | No exact catalog row found. |
| `PETE7363.JPG`, `PETE7364.JPG` | Hiep Long My Chu rice noodle, 400g | No exact catalog row found. |
| `PETE7365.JPG`, `PETE7366.JPG` | Hiep Long My Lau Thang wheat noodle, 500g | Requires allergen/ingredient confirmation. |
| `PETE7369.JPG`, `PETE7370 - Kopia.JPG`, `PETE7370.JPG`, `PETE7371.JPG` | Hiep Long LaMi Mien Moc glass vermicelli, 250g | No exact catalog row found. |
| `PETE7373.JPG` | Wiorki kokosowe / coconut flakes, 1kg | Supplier/brand unclear; create only after confirmation. |
| `PETE7374.JPG`, `PETE7375.JPG` | Hiep Long My Lau Cuon wheat noodle, 500g | Requires allergen/ingredient confirmation. |

## No Direct Import Yet

Direct import rows: 0

Reason: this stage is still building review/confirmation queues. Existing-SKU matches are high-confidence but should be accepted in review before media import.
