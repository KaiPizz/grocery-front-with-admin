# Asia Deli Go Owner Image Folder Inventory

Generated: 2026-07-09
Remote source: `winpc:C:\co_Hanh\images`
Local inventory snapshot: `/tmp/asiandeligo-owner-images/winpc-folder-inventory-20260709.json`

## Summary

- Top-level image folders found: 14
- Total image files counted: 1551
- Total source size: 7.25 GB decimal / 6.75 GiB
- Folder 01 was fully reviewed: 289 / 289 files.
- Folder 01 safe import applied separately: 52 owner images uploaded, 41 product primary/listing images updated.
- Folder 02 batch 001 reviewed: first 50 sorted JPG files from `wetransfer-03e12c`.
- Folder 02 batch 002 reviewed: next 50 sorted JPG files from `wetransfer-03e12c`.
- Folder 02 batch 003 reviewed: next 50 sorted JPG files from `wetransfer-03e12c`.
- Folder 02 batch 004 reviewed: final 45 sorted JPG files from `wetransfer-03e12c`.
- Folder 02 is fully reviewed: 195 / 195 files.
- Folder 03 batch 001 reviewed: first 50 sorted JPG files from `wetransfer-0dadc5`.
- Folder 03 batch 002 reviewed: final 31 sorted JPG files from `wetransfer-0dadc5`.
- Folder 03 is fully reviewed: 81 / 81 files.

## Folder Inventory

| # | Folder | Files | Size |
| --- | --- | ---: | ---: |
| 1 | `quảng cáo deli-20201024T132054Z-001` | 289 | 391 MB |
| 2 | `wetransfer-03e12c` | 195 | 1.03 GB |
| 3 | `wetransfer-0dadc5` | 81 | 437 MB |
| 4 | `wetransfer-158133` | 62 | 285 MB |
| 5 | `wetransfer-15e145` | 93 | 597 MB |
| 6 | `wetransfer-2dfcd3` | 54 | 282 MB |
| 7 | `wetransfer-5ebc86` | 19 | 106 MB |
| 8 | `wetransfer-6dd74d` | 24 | 133 MB |
| 9 | `wetransfer-8ecb13` | 134 | 599 MB |
| 10 | `wetransfer-a2d15c` | 111 | 517 MB |
| 11 | `wetransfer-b55073` | 52 | 302 MB |
| 12 | `wetransfer-b90163` | 126 | 917 MB |
| 13 | `wetransfer-d85d59` | 171 | 859 MB |
| 14 | `wetransfer-e670da` | 140 | 796 MB |

## Batch Plan

Continue folder-by-folder, keeping each report scoped to one source folder:

1. Build a web-review queue from folder 02 `hold_confirm` and `create_new_confirm` rows so uncertain products can be confirmed by the owner/user.
2. Build a review sheet from folder 01 and folder 02 confirmed-new items with actions:
   - `apply_to_existing_sku`
   - `create_missing_product`
   - `category_lifestyle`
   - `ignore`
3. Do not import folder 02 batches 001-004 into existing products; they produced 0 safe existing-SKU matches and should be treated as create-new/owner-confirmation inventory.
4. Build a folder 03 review page/queue from batches 001-002. Important uncertain rows:
   - `review_high_existing_sku`: 6 total across folder 03; keep behind user review before media import.
   - `review_possible_existing_sku`: 1 row (`PETE7630.JPG` to `ADG-000013`) because label wording differs.
   - `create_new_confirm`: 30 total across folder 03; likely missing products to create.
5. Continue folder 04 `wetransfer-158133` with batch 001: first 50 sorted JPG files.

Conservative matching rule: exact visible brand + product name + weight/volume/pack count before proposing an existing SKU.
