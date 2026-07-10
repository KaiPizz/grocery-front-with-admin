# Asia Deli Go Owner Image Match - Folder 09 Batch 001

Generated: 2026-07-10

Remote source: `winpc:C:\co_Hanh\images\wetransfer-8ecb13`
Local batch: `/tmp/asiandeligo-owner-images/folder09-batch001`

## Batch Inventory

- Files copied for this batch: 40
- File range: `PETE6690.JPG` to `PETE6991.JPG`
- Source folder progress after this batch: 40 / 134 files reviewed
- Contact sheets:
  - `/tmp/asiandeligo-owner-images/folder09-batch001/contact-sheet-1.jpg`
  - `/tmp/asiandeligo-owner-images/folder09-batch001/contact-sheet-2.jpg`

## Catalog Join Contract

- Catalog comparison used `/tmp/asiandeligo-prod-products-20260709.tsv` and the SKU/slug migration snapshot.
- Direct apply is not planned for this batch yet. Rows are staged for owner/user review.
- Alcohol products are flagged separately and must not be auto-created without owner confirmation and legal/category handling.
- Tea/coffee products are only mapped when brand, product name, and pack size align.
- Price fill remains deferred; when products are created later, stock can temporarily default to 100 per current project note.

## Result

Generated review queue:

- `docs/asiandeligo-owner-image-review-queue-folder09-batch001-20260710.csv`
- `docs/asiandeligo-owner-review-folder09-batch001-20260710.html`

## Candidate Summary

| Status | Count | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 2 | Existing SKU match is strong, but still staged for review before import. |
| `create_new_confirm` | 9 | Missing products or separate brand/size/flavor candidates. |
| `needs_owner_confirmation_age_restricted` | 3 | Alcohol product; needs owner/legal confirmation before any storefront use. |

## High Existing SKU Candidates

| Files | Visible product | Candidate SKU | Note |
| --- | --- | --- | --- |
| `PETE6955.JPG; PETE6956.JPG` | ChaTraMue Thai Tea Mix 400g | `ADG-001036` | Matches ChaTraMue black Thai tea mix 400g. |
| `PETE6985.JPG; PETE6986.JPG` | Trung Nguyen Sang Tao 4 ground coffee 340g | `ADG-000131` | Matches brand, product number, and 340g pack size. |

## Create-New Groups

- Golden Lotus Chilli Sauce for Chicken.
- Kim Anh Lotus Scented Tea sachet multipack.
- Kim Anh Jasmine Scented Tea 20g sachet multipack.
- Hiep Long Tra Sach Thai Nguyen green tea 200g.
- Phuong Vi Tea 100g.
- Sempio Brown Rice Green Tea 75g, 50 bags.
- Sempio Solomon's Seal Tea 60g, 50 bags.
- Kim Anh Lotus Scented Tea box 50g.
- Trung Nguyen G7 3-in-1 Special instant coffee 336g, 21 x 16g.

## Age-Restricted / Needs Owner Confirmation

- Choya Original Japanese Ume Fruit Wine 3L, 10% vol.
- Choya Original Japanese Ume Fruit Wine bottle.
- Tsingtao Beer 330ml.

## Notes For Owner Review

- Sempio Brown Rice Green Tea and Solomon's Seal Tea look similar to existing Sempio tea SKUs, but the owner photos show 50-bag variants. Do not merge into existing 20-bag SKUs.
- Alcohol handling is a separate business/legal decision; these rows should remain on hold unless owner confirms they are in scope.
- Folder `wetransfer-8ecb13` still has 94 unreviewed files after this batch.

## Next Step

Review this HTML page or continue with `folder09-batch002` from the same source folder. Do not push this batch to production without a separate production approval.
