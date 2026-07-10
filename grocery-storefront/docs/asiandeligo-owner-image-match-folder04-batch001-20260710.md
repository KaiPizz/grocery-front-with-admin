# Asia Deli Go Owner Image Match - Folder 04 Batch 001

Generated: 2026-07-10

Remote source: `winpc:C:\co_Hanh\images\wetransfer-158133`
Local batch: `/tmp/asiandeligo-owner-images/folder04-batch001`

## Batch Inventory

- Files copied for this batch: 62
- File range: `PETE6698.JPG` to `PETE8000.JPG`
- Source folder progress after this batch: 62 / 62 files reviewed
- Contact sheets:
  - `/tmp/asiandeligo-owner-images/folder04-batch001/contact-sheet-1.jpg`
  - `/tmp/asiandeligo-owner-images/folder04-batch001/contact-sheet-2.jpg`
  - `/tmp/asiandeligo-owner-images/folder04-batch001/contact-sheet-3.jpg`
- OCR notes: `/tmp/asiandeligo-owner-images/folder04-batch001/ocr.txt`; OCR was noisy and was used only as a helper. Final calls were checked visually against the catalog export.

## Catalog Join Contract

- Catalog comparison used `/tmp/asiandeligo-prod-products-20260709.tsv`.
- Direct apply is not planned for this batch yet. Rows are staged for owner/user review.
- Foodservice packs are intentionally **not** mapped to smaller retail rows even when brand/product family matches.

## Result

Generated review queue:

- `docs/asiandeligo-owner-image-review-queue-folder04-batch001-20260710.csv`
- `docs/asiandeligo-owner-review-folder04-batch001-20260710.html`

## Candidate Summary

| Status | Count | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 5 | Brand/product/size match an existing ADG SKU, but still needs review accept before import. |
| `review_possible_existing_sku` | 2 | Similar to an existing SKU, but exact catalog row or front label needs confirmation. |
| `create_new_confirm` | 26 | Missing products or separate size/foodservice SKU candidates. |
| `hold_confirm` | 15 | Product identity or grouping is not safe enough yet. |

## High-Confidence Existing SKU Candidates

| Files | Visible product | Candidate SKU | Catalog row |
| --- | --- | --- | --- |
| `PETE6921.JPG` | Squid Brand Premium Fish Sauce 725ml | `ADG-000095` | Sos rybny 725ml - Squid |
| `PETE7116.JPG` | Squid Brand Fish Sauce 300ml | `ADG-000044` | Sos rybny 300ml Squid |
| `PETE7118.JPG` | Kikkoman naturally brewed soy sauce 150ml | `ADG-000272` | Sos sojowy Koikuchi z dyspenserem 150ml - Kikkoman |
| `PETE7748.JPG` | Healthy Boy Sweet Soya Sauce 700ml | `ADG-000064` | Sos sojowy słodki Healthy Boy 700ml |
| `PETE7795.JPG` | Sempio Jin S Soy Sauce 500ml | `ADG-000204` | Sos sojowy Jin S 500ml - Sempio |

## Next Step

Review this HTML page or continue with the next source folder (`wetransfer-15e145`). Do not push this batch to production without a separate production approval.
