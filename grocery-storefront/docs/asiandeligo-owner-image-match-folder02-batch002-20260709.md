# Asia Deli Go Owner Image Match - Folder 02 Batch 002

Generated: 2026-07-09

Remote source: `winpc:C:\co_Hanh\images\wetransfer-03e12c`
Local batch: `/tmp/asiandeligo-owner-images/folder02-batch002`

## Batch Inventory

- Files copied for this batch: 50
- File type: JPG
- File range: `PETE7943.JPG` to `PETE8908.JPG`
- Source folder progress after this batch: 100 / 195 files reviewed
- Contact sheet: `/tmp/asiandeligo-owner-images/folder02-batch002/contact-sheet.jpg`
- Contact sheet slices: `/tmp/asiandeligo-owner-images/folder02-batch002/contact-sheet-1.jpg` through `/tmp/asiandeligo-owner-images/folder02-batch002/contact-sheet-5.jpg`
- OCR notes: `/tmp/asiandeligo-owner-images/folder02-batch002/ocr.txt`; OCR was useful for English/Polish labels, but final calls were checked visually.

## Catalog Join Contract

- `product_variants.template_id (uuid) = products.id (uuid)` - FK declared and semantic sample verified.
- `product_variants.salon_id = products.salon_id`; production query filtered salon slug `asiandeligo`.
- Production Asia Deli Go snapshot: 1784 live products, 1784 live variants, all `products.status = active`.
- Soft-delete: `products.deleted_at IS NULL` and `product_variants.deleted_at IS NULL`.
- Existing backup tables were visible in the schema scan, but the catalog export used only canonical `salons`, `products`, and `product_variants`.

## Result

No image rows in this batch are safe to import into existing products.

The batch is mostly owner-stock frozen seafood, frozen dim sum, frozen herbs/vegetables, duck, and prepared frozen products. The current scraped catalog has only loose category-level similarities, not exact product rows.

Generated candidate CSV:

- `docs/asiandeligo-owner-image-candidates-folder02-batch002-20260709.csv`

## Create-New Candidates

| Files | Visible product | Status | Notes |
| --- | --- | --- | --- |
| `PETE7943.JPG`, `PETE7944.JPG`, `PETE7948.JPG` | Asia Foods Vannamei Shrimp Peeled & Deveined, likely 800g net / 1000g glazed | create new | Confirm count/size, EAN and price. |
| `PETE7945.JPG`, `PETE7946.JPG`, `PETE7947.JPG`, `PETE7949.JPG` | Asia Foods Vannamei Shrimp Headless Shell-On | create new / confirm | Exact count/size and weight need confirmation. |
| `PETE7950.JPG` | Asia Foods Vannamei Shrimp Peeled & Deveined Tail-On, 800g net / 1000g glazed | create new | Separate SKU from no-tail peeled/deveined version. |
| `PETE7951.JPG` | Asia Foods Shrimp Shaomai / Xiu Mai | create new | Frozen dim sum; confirm pieces/weight/EAN. |
| `PETE7952.JPG` through `PETE7962.JPG` | Back-label or alternate photos for frozen shrimp variants | hold / confirm | Use as gallery images only after owner confirms exact SKU grouping. |
| `PETE7963.JPG` | Frozen prawns / krewetki mrozone, Vietnam origin | create new / confirm | Brand/weight not reliable enough from contact sheet. |
| `PETE7964.JPG` | Asia Foods Frozen Gac Fruit | create new | No exact catalog match. |
| `PETE7965.JPG` | Asia Foods Frozen Galangal | create new | Catalog only has galangal powder, not this frozen product. |
| `PETE7966.JPG` | Asia Foods Shrimp Spring Roll | create new | Frozen prepared seafood product. |
| `PETE7967.JPG` | Asia Foods Frozen Takuk / Rau Ngot | create new | Confirm final display name. |
| `PETE7968.JPG`, `PETE7969.JPG` | Asia Foods Frozen Lemongrass stalks | create new | Keep separate from dried lemongrass and lemongrass paste. |
| `PETE7970.JPG` | Asia Foods Frozen Grinded Lemongrass | create new | Keep separate from stalk version. |
| `PETE7971.JPG` | Asia Foods Rice Paper Net with Shrimp | create new | Not a dry rice-paper wrapper. |
| `PETE7972.JPG` | Asia Foods Potato Shrimp | create new | Frozen prepared seafood product. |
| `PETE7973.JPG` | Asia Foods Taro stem / Doc Mung frozen vegetable | create new / confirm | OCR produced a misleading "Peppermint" fragment; owner should confirm name. |
| `PETE7974.JPG`, `PETE7975.JPG` | Asia Foods Haukau PTO / Ha Cao PTO | create new | Frozen dim sum. |
| `PETE7976.JPG` | Asia Foods Vietnamese Style Snack / Wietnamski Przysmak | create new / confirm | Exact retail name should be confirmed. |
| `PETE7977.JPG` | Asia Foods Tri Color Haukau | create new | Frozen dim sum. |
| `PETE7978.JPG` | Asia Foods Saigonki Net - shrimp with tails | create new | Frozen prepared seafood product. |
| `PETE7979.JPG` | Asia Foods Seafood Roll Cake | create new | Frozen prepared seafood product. |
| `PETE8029.JPG` | Plastic food container / packaging tray | ignore or supplies | Not a food SKU unless owner wants a packaging/supplies category. |
| `PETE8894.JPG` | Ruifeng Boneless Roasted Duck, 500-600g | create new | Real duck product; do not map to mock duck. |
| `PETE8895.JPG`, `PETE8896.JPG`, `PETE8897.JPG` | Asian Choice Cuttlefish, 1000g, 40-60, net 750g | create new | Frozen seafood; confirm net/gross details and EAN. |
| `PETE8899.JPG`, `PETE8900.JPG` | Asia Foods Whole Vannamei Shrimp, size 71/90, 800g net / 1000g glazed | create new | Frozen seafood. |
| `PETE8903.JPG`, `PETE8904.JPG` | Planets Pride Ebi Fry, 40pcs x 20g, 800g | create new | Frozen prepared seafood product. |
| `PETE8905.JPG`, `PETE8906.JPG` | Allgroo Misori Vegetable Dumpling, 675g | create new | Vegetarian candidate; confirm ingredients/allergens. |
| `PETE8907.JPG`, `PETE8908.JPG` | Drosed Duck A Grade / Kaczka Klasa A | create new | Confirm variable weight handling and delivery/storage policy. |

## No Ready Import Rows

Ready rows: 0

Reason: every visible product either has no exact catalog match or needs owner confirmation before creating a new product row. No SQL/media import should be generated from this batch yet.

## Next Step

Continue `wetransfer-03e12c` with folder02 batch003: next 50 sorted files after `PETE8908.JPG`.
