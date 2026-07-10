# Asia Deli Go Owner Image Match - Folder 11 Batch 001

Generated: 2026-07-10

Remote source: `winpc:C:\co_Hanh\images\wetransfer-b55073`

Local batch: `/tmp/asiandeligo-owner-images/folder11-batch001`

## Batch Inventory

- Files copied for this batch: 52
- File range: `PETE6723.JPG` to `PETE8879.JPG`
- Source folder progress after this batch: 52 / 52 files reviewed
- Contact sheets:
  - `/tmp/asiandeligo-owner-images/folder11-batch001/contact-sheet-1.jpg`
  - `/tmp/asiandeligo-owner-images/folder11-batch001/contact-sheet-2.jpg`
  - `/tmp/asiandeligo-owner-images/folder11-batch001/contact-sheet-3.jpg`

## Catalog Join Contract

- Catalog comparison used `docs/asiandeligo-sku-slug-migration-dry-run-20260708.json`.
- Direct apply is not planned for this batch yet. Rows are staged for owner/user review.
- Different brand, flavor, or pack size is treated as a separate candidate.
- Photos with visible old expiry/date stickers are held or downgraded, even when the SKU match is likely.
- Price fill remains deferred; when products are created later, stock can temporarily default to 100 per current project note.

## Result

Generated review queue:

- `docs/asiandeligo-owner-image-review-queue-folder11-batch001-20260710.csv`
- `docs/asiandeligo-owner-review-folder11-batch001-20260710.html`

## Candidate Summary

| Status | Count | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 3 | Brand/product/size match an existing ADG SKU. |
| `review_possible_existing_sku` | 3 | Likely existing SKU, but brand naming, net weight, or image quality needs confirmation. |
| `create_new_confirm` | 13 | Missing products or separate brand/flavor/size candidates. |
| `hold_confirm` | 2 | Needs exact weight/current clean image before SKU creation or image import. |

## High-Confidence Existing SKU Candidates

| Files | Visible product | Candidate SKU | Catalog row |
| --- | --- | --- | --- |
| `PETE6723.JPG; PETE6724.JPG; PETE6725.JPG; PETE6726.JPG` | Cock Brand Concentrated Cooking Tamarind 454g / 450ml | `ADG-000302` | Koncentrat z tamaryndowca 454g - Cock Brand |
| `PETE7019.JPG; PETE7020.JPG` | Cock Brand Tapioca Pearl Large 400g | `ADG-000128` | Tapioka, perełki duże 400g - Cock Brand |
| `PETE7023.JPG; PETE7024.JPG` | Cock Brand Tapioca Pearl Small 400g | `ADG-000125` | Tapioka, perełki małe 400g - Cock Brand |

## Possible Existing SKU Candidates

- `PETE6738.JPG; PETE6739.JPG; PETE6740.JPG; PETE6741.JPG; PETE8857.JPG; PETE8858.JPG` may correspond to `ADG-000406` mixed fruit pudding 6 x 80g, but catalog does not name Cocon.
- `PETE7190.JPG` may correspond to `ADG-000300` Longevity sweetened condensed milk 397g, but net weight is not clearly visible in the photo.
- `PETE7751.JPG` matches `ADG-000098` Cock Brand Palm Sugar 454g, but sticker/date text covers the front label; owner should approve use/crop/retake.

## Create-New / Hold Notes

- Create-new candidates include Chaokoh Roasted Coconut Chips 30g, Cocon mango and lychee pudding packs, Golden Chef tapioca pearls, Wangzhihe Sweet Bean Jam 500g, Minh Ngọc green bean cake variants, Chaokoh coconut gel/pineapple, Panchy nata de coco lychee, and Lion Custard Powder 300g.
- `PETE6728.JPG; PETE6729.JPG; PETE6730.JPG` looks like the same Chaokoh Roasted Coconut Chips 30g candidate already noted in folder08; do not create duplicate SKU if that one is approved.
- `PETE7256.JPG; PETE7257.JPG` Greek Wall Maltose 500g is held because the photo shows old expiry/date information and should be retaken before storefront import.
- `PETE7297.JPG; PETE7298.JPG` PSP Rock Sugar is held because net weight is not visible.

## Next Step

Open the review page, confirm/reject the high-confidence existing matches, and mark which create-new or held items should become draft SKUs. This batch is not deployed and does not write to the product DB.
