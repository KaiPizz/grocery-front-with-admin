# Asia Deli Go Owner Image Match - Folder 12 Batch 001

Generated: 2026-07-10

Remote source: `winpc:C:\co_Hanh\images\wetransfer-b90163`

Local batch: `/tmp/asiandeligo-owner-images/folder12-batch001`

## Batch Inventory

- Files copied for this batch: 50
- File range: `PETE6677.JPG` to `PETE6798.JPG`
- Source folder progress after this batch: 50 / 126 files reviewed
- Contact sheets:
  - `/tmp/asiandeligo-owner-images/folder12-batch001/contact-sheet-1.jpg`
  - `/tmp/asiandeligo-owner-images/folder12-batch001/contact-sheet-2.jpg`
  - `/tmp/asiandeligo-owner-images/folder12-batch001/contact-sheet-3.jpg`

## Catalog Join Contract

- Catalog comparison used `docs/asiandeligo-sku-slug-migration-dry-run-20260708.json`.
- Direct apply is not planned for this batch yet. Rows are staged for owner/user review.
- Different brand, flavor, or pack size is treated as a separate candidate.
- Generic catalog rows without brand are downgraded to possible matches when owner photos show a specific brand.
- Photos with visible old expiry/date stickers are held or downgraded, even when product identity is clear.

## Result

Generated review queue:

- `docs/asiandeligo-owner-image-review-queue-folder12-batch001-20260710.csv`
- `docs/asiandeligo-owner-review-folder12-batch001-20260710.html`

## Candidate Summary

| Status | Count | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 3 | Brand/product/size match an existing ADG SKU. |
| `review_possible_existing_sku` | 2 | Existing row probably matches, but catalog brand is generic. |
| `create_new_confirm` | 8 | Missing products or separate brand/flavor/size candidates. |
| `hold_confirm` | 1 | Needs current clean image or owner confirmation before SKU creation/import. |

## High-Confidence Existing SKU Candidates

| Files | Visible product | Candidate SKU | Catalog row |
| --- | --- | --- | --- |
| `PETE6768.JPG; PETE6769.JPG; PETE6771.JPG` | Aji-no-Moto MSG 454g | `ADG-000497` | Glutaminian sodu, Aji-no-Moto MSG 454g - Ajinomoto |
| `PETE6781.JPG; PETE6782.JPG; PETE6783.JPG` | Lobo Tom Ka Paste 50g | `ADG-000057` | Pasta Tom Kha 50g Lobo |
| `PETE6796.JPG; PETE6797.JPG; PETE6798.JPG` | Cock Brand Green Curry Paste 50g | `ADG-000056` | Pasta curry zielona 50g Cock Brand |

## Possible Existing SKU Candidates

- `PETE6772.JPG; PETE6773.JPG; PETE6774.JPG` may correspond to `ADG-000054` Massaman Curry Paste 50g, but the catalog row is generic while the photo is Cock Brand.
- `PETE6791.JPG; PETE6792.JPG; PETE6793.JPG` may correspond to `ADG-000055` Red Curry Paste 50g, but the catalog row is generic while the photo is Cock Brand.

## Create-New / Hold Notes

- Create-new candidates include Hậu Sanh Five-Aroma Powder 500g, Cock Brand Bael Fruit 200g, Hiep Long dried onion 200g, Lobo Roast Duck Seasoning Mix 100g, Lobo Red Pork Seasoning Mix 100g, Chaokoh Coconut Milk Powder 60g, Lobo Nam Powder Seasoning Mix 70g, and Cock Brand Panang Curry Paste 50g.
- Hậu Sanh Curry Powder 10g x 50 packs / 500g is held because visible sticker/date information makes the photos risky for storefront use.
- `PETE6788.JPG; PETE6789.JPG; PETE6790.JPG` has a printed date on the front. If owner approves the SKU, consider retaking a cleaner image before import.

## Next Step

Open the review page, confirm/reject the high-confidence and possible existing matches, and mark which create-new or held items should become draft SKUs. This batch is not deployed and does not write to the product DB.
