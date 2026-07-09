# Asia Deli Go Owner Image Match - Folder 02 Batch 001

Generated: 2026-07-09

Remote source: `winpc:C:\co_Hanh\images\wetransfer-03e12c`
Local batch: `/tmp/asiandeligo-owner-images/folder02-batch001`

## Batch Inventory

- Files copied for this batch: 50
- File type: JPG
- File range: `PETE7892.JPG` to `PETE7942.JPG`
- Source folder progress after this batch: 50 / 195 files reviewed
- Contact sheet: `/tmp/asiandeligo-owner-images/folder02-batch001/contact-sheet.jpg`
- Contact sheet slices: `/tmp/asiandeligo-owner-images/folder02-batch001/contact-sheet-1.jpg` through `/tmp/asiandeligo-owner-images/folder02-batch001/contact-sheet-5.jpg`
- OCR notes: `/tmp/asiandeligo-owner-images/folder02-batch001/ocr.txt`; OCR was noisy, so product names were reviewed visually.

## Catalog Join Contract

- `product_variants.template_id (uuid) = products.id (uuid)` - FK declared and semantic sample verified.
- `product_variants.salon_id = products.salon_id`; production query filtered salon slug `asiandeligo`.
- Production Asia Deli Go snapshot: 1784 live products, 1784 live variants, all `products.status = active`.
- Soft-delete: `products.deleted_at IS NULL` and `product_variants.deleted_at IS NULL`.

## Result

No image rows in this batch are safe to import into existing products.

The batch is mostly owner-stock frozen products: dim sum, wrappers, buns, samosas, sesame balls, and frozen seafood. These are not exact matches to the scraped Kimchi-derived catalog. Mapping them onto similar products would create wrong product-media links.

Generated candidate CSV:

- `docs/asiandeligo-owner-image-candidates-folder02-batch001-20260709.csv`

## Create-New Candidates

| Files | Visible product | Status | Notes |
| --- | --- | --- | --- |
| `PETE7892.JPG`, `PETE7893.JPG` | Dried kombu seaweed, 1kg | create new | Catalog has smaller kombu/dasima products and Dashi no Moto 1kg, not this item. |
| `PETE7894.JPG`, `PETE7895.JPG` | Asia Foods Mango Yam Net Spring Roll | create new | Frozen product; no exact catalog match. |
| `PETE7896.JPG`, `PETE7897.JPG` | Asia Foods Yam Net Spring Roll | create new | Frozen product; no exact catalog match. |
| `PETE7898.JPG`, `PETE7899.JPG` | Asia Foods Sweet Potato Net Spring Roll | create new | Frozen product; no exact catalog match. |
| `PETE7900.JPG`, `PETE7901.JPG` | Asia Foods Vegetable Haukau | create new | Frozen dim sum; no exact catalog match. |
| `PETE7902.JPG` | Asia Foods Shrimp Haukau | create new | Frozen dim sum; confirm crustacean allergen. |
| `PETE7903.JPG`, `PETE7904.JPG` | Sandwich bun, likely frozen pack | create new / confirm | Label is not reliable enough from sheet; needs owner confirmation. |
| `PETE7905.JPG` | Happy Belly Peking Duck Wrapper | create new | Do not map to duck meat/mock duck catalog rows. |
| `PETE7906.JPG`, `PETE7907.JPG` | Spring Home TYJ Spring Roll Pastry, 30 pcs | create new | Separate from rice paper wrappers. |
| `PETE7908.JPG` | Spring Home TYJ Spring Roll Pastry, 40 pcs | create new | Separate SKU from 30 pcs version. |
| `PETE7909.JPG`, `PETE7910.JPG`, `PETE7913.JPG`, `PETE7915.JPG` | Happy Belly Oriental Bread, plain | create new | Multiple usable gallery photos. |
| `PETE7911.JPG`, `PETE7912.JPG`, `PETE7916.JPG` | Happy Belly Oriental Bread, chocolate | create new | Multiple usable gallery photos. |
| `PETE7914.JPG` | Spring Home Custard Bun | create new | Frozen dessert; confirm pack size. |
| `PETE7917.JPG` | Spring Home Vegetable Samosa | create new | Confirm vegetarian status and pack size. |
| `PETE7918.JPG`, `PETE7919.JPG` | Spring Home Glutinous Rice Ball | create new / confirm flavor | Flavor needs owner confirmation. |
| `PETE7921.JPG`, `PETE7922.JPG`, `PETE7923.JPG` | Sesame balls with red bean, 228g | create new | Clear Polish label. |
| `PETE7924.JPG` | Happy Belly Hargow Crystal Skin, 300g | create new | Frozen dim sum wrapper. |
| `PETE7925.JPG`, `PETE7926.JPG`, `PETE7927.JPG` | Spring Home Samosa bulk/box | create new / confirm | May be wholesale/bulk pack. |
| `PETE7928.JPG`, `PETE7929.JPG` | Shrimp Headless Shell-On, 1.8kg | create new | Frozen seafood; confirm species/count/EAN. |
| `PETE7930.JPG`, `PETE7931.JPG` | Black Tiger Shrimp Headless Shell-On, 1.8kg | create new | Frozen seafood; confirm count/EAN. |
| `PETE7932.JPG`, `PETE7934.JPG`, `PETE7935.JPG` | Sushi shrimp tray / cooked shrimp gallery | create new / confirm | Label not reliable enough for exact SKU. |
| `PETE7933.JPG` | Mixed shrimp tray | hold | Single SKU not reliable from photo. |
| `PETE7936.JPG` | Breaded shrimp / torpedo shrimp, 250g | create new / confirm | Label partly readable. |
| `PETE7937.JPG`, `PETE7938.JPG`, `PETE7941.JPG` | Peeled shrimp pack | create new / confirm | Confirm cooked/raw, count and weight. |
| `PETE7939.JPG`, `PETE7940.JPG`, `PETE7942.JPG` | Black tiger shrimp pack | create new / confirm | Confirm cooked/raw, count and weight. |

## No Ready Import Rows

Ready rows: 0

Reason: every visible product either has no exact catalog match or needs owner confirmation before creating a new product row. No SQL/media import should be generated from this batch yet.

## Next Step

Continue `wetransfer-03e12c` with folder02 batch002: next 50 sorted files after `PETE7942.JPG`.
