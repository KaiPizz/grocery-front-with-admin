# Asia Deli Go Owner Image Match - Folder 02 Batch 003

Generated: 2026-07-09

Remote source: `winpc:C:\co_Hanh\images\wetransfer-03e12c`
Local batch: `/tmp/asiandeligo-owner-images/folder02-batch003`

## Track Audit

This batch was started only after rechecking the work track:

- Git remote: `git@github.com:KaiPizz/grocery-front-with-admin.git`
- Branch: `main`
- Previous commit before this report: `a2651b5 docs: review Asia Deli Go owner folder02 batch002`
- WinPC source folder count: 195 files.
- Sorted boundaries:
  - batch001: index 0-49, `PETE7892.JPG` to `PETE7942.JPG`
  - batch002: index 50-99, `PETE7943.JPG` to `PETE8908.JPG`
  - batch003: index 100-149, `PETE8909.JPG` to `PETE8963.JPG`

## Batch Inventory

- Files copied for this batch: 50
- File type: JPG
- File range: `PETE8909.JPG` to `PETE8963.JPG`
- Source folder progress after this batch: 150 / 195 files reviewed
- Contact sheet: `/tmp/asiandeligo-owner-images/folder02-batch003/contact-sheet.jpg`
- Contact sheet slices: `/tmp/asiandeligo-owner-images/folder02-batch003/contact-sheet-1.jpg` through `/tmp/asiandeligo-owner-images/folder02-batch003/contact-sheet-5.jpg`
- OCR notes: `/tmp/asiandeligo-owner-images/folder02-batch003/ocr.txt`; OCR was useful for English/Polish labels, but final calls were checked visually.

## Catalog Join Contract

- `product_variants.template_id (uuid) = products.id (uuid)` - FK declared and semantic sample verified.
- `product_variants.salon_id = products.salon_id`; production query filtered salon slug `asiandeligo`.
- Production Asia Deli Go snapshot: 1784 live products, 1784 live variants, all `products.status = active`.
- Soft-delete: `products.deleted_at IS NULL` and `product_variants.deleted_at IS NULL`.
- Existing backup tables were visible in the schema scan, but the catalog export used only canonical `salons`, `products`, and `product_variants`.

## Result

No image rows in this batch are safe to import into existing products.

One row looked close at first pass:

- `PETE8909.JPG` is BDMP salted dried shrimp size `M`, 100g.
- Existing catalog row `ADG-001686` is BDMP salted dried shrimp size `L`, 100g.
- Because size differs, this is not an automatic existing-SKU match.

Generated candidate CSV:

- `docs/asiandeligo-owner-image-candidates-folder02-batch003-20260709.csv`

## Create-New / Confirm Candidates

| Files | Visible product | Status | Notes |
| --- | --- | --- | --- |
| `PETE8909.JPG` | BDMP Salted Dried Shrimp size M, 100g | create new / confirm | Near `ADG-001686`, but catalog size is L. |
| `PETE8910.JPG`, `PETE8911.JPG` | Super Heo Vien / Vietnamese pork balls | create new / confirm | Confirm exact meat type and weight. |
| `PETE8912.JPG` | Inaka Sanuki Udon, 1.20kg | create new | Existing udon rows are different brands/sizes. |
| `PETE8914.JPG`, `PETE8915.JPG` | Frozen Minced Crab in Water, 500g | create new | Frozen crab product. |
| `PETE8916.JPG` | Dodo Fish Ball | create new | Frozen fish-ball product. |
| `PETE8917.JPG` | Tempeh, vegan fermented soy product | create new | Confirm storage and allergen data. |
| `PETE8918.JPG` | Dodo Tofu Fish Cake | create new | Frozen fish-cake product. |
| `PETE8919.JPG`, `PETE8920.JPG` | Wantan / Won Tong pastry sheets | create new / confirm | Confirm final display name and pack size. |
| `PETE8921.JPG`, `PETE8922.JPG` | Vietnamese beef balls / bo vien style pack | create new / confirm | Confirm exact meat type. |
| `PETE8923.JPG`, `PETE8924.JPG` | Asian Choice Tom Yum Set, 114g | create new | Not the same as Tom Yum paste/soup rows. |
| `PETE8925.JPG`, `PETE8926.JPG`, `PETE8927.JPG` | Frozen fish slices/steaks | hold / confirm | Label not reliable enough. |
| `PETE8928.JPG` | Asia Foods Vietnamese Style Snack | create new / confirm | Same family as folder02 batch002 `PETE7976.JPG`. |
| `PETE8929.JPG`, `PETE8930.JPG` | Asia Foods Seafood Roll Cake | create new | Same family as folder02 batch002 `PETE7979.JPG`. |
| `PETE8931.JPG`, `PETE8932.JPG` | Asia Foods Shrimp Net Spring Roll PTO | create new | Same family as folder02 batch002 `PETE7978.JPG`. |
| `PETE8933.JPG` | Tobiko Orange Supreme, 500g | create new | Flying fish roe product. |
| `PETE8934.JPG`, `PETE8935.JPG` | Sesame Balls Peanut Flavour, 228g | create new | Frozen dessert. |
| `PETE8936.JPG`, `PETE8937.JPG` | Black/red tray product, likely fish with red paste/sauce | hold / confirm | Label not reliable enough. |
| `PETE8938.JPG` | So Mot / soybean-leaf style wrapped product | hold / confirm | Product name not safe. |
| `PETE8939.JPG` | Shellfish/scallop-style frozen pack | create new / confirm | Confirm exact species and weight. |
| `PETE8940.JPG`, `PETE8941.JPG` | White Swimming Crabmeat Mix | create new | Frozen crabmeat product. |
| `PETE8942.JPG` | Frog Legs, 1kg gross / 900g net | create new | Frozen meat/seafood product. |
| `PETE8945.JPG` | Planets Pride Surimi Maki Sticks 18cm, 1kg | create new | Imitation crab meat. |
| `PETE8948.JPG` | Shrimp tray / sushi shrimp style pack | hold / confirm | No reliable label. |
| `PETE8949.JPG`, `PETE8950.JPG` | Unagi Kabayaki / grilled eel pack | create new / confirm | Existing rows are sauces only, not eel meat. |
| `PETE8951.JPG` | Asian Choice Apple Snail Meat | create new | Frozen seafood product. |
| `PETE8952.JPG` | Planets Pride Octopus / Bach tuoc, 1kg gross / 800g net | create new | Frozen seafood product. |
| `PETE8953.JPG`, `PETE8954.JPG` | Prepared eel/seafood slices in sauce | create new / confirm | Could relate to unagi, but exact SKU is not safe. |
| `PETE8955.JPG` | Frozen glazed raw seafood, 40/70 | hold / confirm | Species unclear. |
| `PETE8956.JPG`, `PETE8957.JPG`, `PETE8958.JPG` | White seafood pieces, likely cuttlefish/squid-style pack | hold / confirm | Exact product name not safe. |
| `PETE8959.JPG`, `PETE8960.JPG` | Crab/surimi sticks tray | hold / confirm | Use only after SKU grouping is confirmed. |
| `PETE8961.JPG`, `PETE8962.JPG`, `PETE8963.JPG` | Panga Sum Pangasius skinless fillets, 5kg box | create new | Confirm net/gross weight and EAN. |

## No Ready Import Rows

Ready rows: 0

Reason: every visible product either has no exact catalog match or has a size/spec mismatch that needs owner confirmation. No SQL/media import should be generated from this batch yet.

## Next Step

Finish `wetransfer-03e12c` with folder02 batch004: remaining 45 sorted files after `PETE8963.JPG`.
