# Asia Deli Go Owner Image Match - Folder 02 Batch 004

Generated: 2026-07-09

Remote source: `winpc:C:\co_Hanh\images\wetransfer-03e12c`
Local batch: `/tmp/asiandeligo-owner-images/folder02-batch004`

## Batch Inventory

- Files copied for this batch: 45
- File type: JPG
- File range: `PETE8964.JPG` to `PETE9009.JPG`
- Source folder progress after this batch: 195 / 195 files reviewed
- Contact sheet: `/tmp/asiandeligo-owner-images/folder02-batch004/contact-sheet.jpg`
- Contact sheet slices: `/tmp/asiandeligo-owner-images/folder02-batch004/contact-sheet-1.jpg` through `/tmp/asiandeligo-owner-images/folder02-batch004/contact-sheet-5.jpg`
- OCR notes: `/tmp/asiandeligo-owner-images/folder02-batch004/ocr.txt`; OCR was useful for Polish/English labels, but final calls were checked visually.

## Catalog Join Contract

- Catalog comparison used the existing production export `/tmp/asiandeligo-prod-products-20260709.tsv`.
- The export was produced from canonical `salons`, `products`, and `product_variants`.
- `product_variants.template_id (uuid) = products.id (uuid)` - FK declared and semantic sample verified in this session.
- `product_variants.salon_id = products.salon_id`; production query filtered salon slug `asiandeligo`.
- Production Asia Deli Go snapshot: 1784 live products, 1784 live variants, all `products.status = active`.
- Soft-delete: `products.deleted_at IS NULL` and `product_variants.deleted_at IS NULL`.

## Result

No image rows in this batch are safe to import into existing products.

The batch is mostly owner-stock frozen fish, frozen vegetables, foodservice fries, edamame, leaves/herbs, seafood mix, mussels, galangal, and a Japanese miso pack. Catalog search produced only category-level or size/type mismatches.

Generated candidate CSV:

- `docs/asiandeligo-owner-image-candidates-folder02-batch004-20260709.csv`

## Create-New / Confirm Candidates

| Files | Visible product | Status | Notes |
| --- | --- | --- | --- |
| `PETE8964.JPG`, `PETE8965.JPG` | White carton frozen fish fillet | hold / confirm | Label not reliable enough. |
| `PETE8966.JPG`, `PETE8967.JPG` | Mintaj Filety / pollock fillets | create new | Frozen fish carton. |
| `PETE8968.JPG`, `PETE8969.JPG`, `PETE8970.JPG`, `PETE8972.JPG` | Frozana Professional frozen vegetable mix | create new / confirm | Confirm exact mix and weight. |
| `PETE8973.JPG`, `PETE8974.JPG`, `PETE8975.JPG` | Unlabeled clear bags of mixed vegetables | hold / confirm | Likely gallery/alternate pack; no label. |
| `PETE8976.JPG` | Frozen corn kernels | create new / confirm | No brand/weight visible. |
| `PETE8977.JPG` | Frozen green peas | create new / confirm | No brand/weight visible. |
| `PETE8978.JPG`, `PETE8979.JPG` | Frozen diced carrots | create new / confirm | No brand/weight visible. |
| `PETE8980.JPG`, `PETE8981.JPG` | Frozen cut green beans, 2.5kg | create new | Polish label visible. |
| `PETE8982.JPG`, `PETE8983.JPG` | Frozen young spinach leaves, 2.5kg | create new | Polish label visible. |
| `PETE8984.JPG`, `PETE8985.JPG` | Lutosa Shoestring Fries 7/7, 2.5kg | create new | Foodservice fries. |
| `PETE8986.JPG`, `PETE8987.JPG`, `PETE8988.JPG`, `PETE8989.JPG` | Lutosa Crinkle Cut Fries 10/10, 2.5kg | create new | Foodservice fries. |
| `PETE8990.JPG`, `PETE8991.JPG` | Lutosa Straight Cut Fries 10/10, 2.5kg | create new | Foodservice fries. |
| `PETE8992.JPG` | Frozen cauliflower, 2kg | create new | Polish label visible. |
| `PETE8993.JPG`, `PETE8994.JPG` | Frozen broccoli, 2kg | create new | Polish label visible. |
| `PETE8995.JPG` | ITA-SAN Unsalted Edamame, 1000g | create new | Not the same as catalog edamame in brine 400g. |
| `PETE8996.JPG`, `PETE8997.JPG` | Edamame cooked peeled soya beans, 1kg | create new | Separate from ITA-SAN unsalted edamame. |
| `PETE8998.JPG`, `PETE8999.JPG` | Unlabeled chopped green leaves / frozen greens | hold / confirm | Product name not safe. |
| `PETE9000.JPG`, `PETE9001.JPG` | Frozen banana leaves / La Chuoi | create new | No exact catalog match. |
| `PETE9002.JPG`, `PETE9003.JPG` | Classic Seafood Mix | create new | Frozen seafood mix. |
| `PETE9004.JPG`, `PETE9005.JPG` | Frozen lime leaves | create new / confirm | Confirm if kaffir lime leaves and weight. |
| `PETE9006.JPG` | Sanford New Zealand Greenshell Mussels on the Half Shell | create new | Frozen seafood product. |
| `PETE9007.JPG`, `PETE9008.JPG` | Asia Foods Frozen Galangal | create new | Same family as batch002 `PETE7965.JPG`. |
| `PETE9009.JPG` | Japanese miso pack | hold / confirm | Near existing miso rows, but exact brand/type is not safe. |

## No Ready Import Rows

Ready rows: 0

Reason: every visible product either has no exact catalog match or has a size/type/spec mismatch that needs owner confirmation. No SQL/media import should be generated from this batch yet.

## Folder 02 Completion

Folder 02 `wetransfer-03e12c` is now fully reviewed: 195 / 195 files.

Next step: aggregate all folder02 `hold_confirm` and `create_new_confirm` rows into a web-review queue so the owner/user can confirm uncertain products before product creation or image assignment.
