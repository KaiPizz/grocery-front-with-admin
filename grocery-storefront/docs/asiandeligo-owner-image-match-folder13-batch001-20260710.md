# Asia Deli Go Owner Image Match - Folder 13 Batch 001

Generated: 2026-07-10

Remote source: `winpc:C:\co_Hanh\images\wetransfer-d85d59`

Local batch: `/tmp/asiandeligo-owner-images/folder13-batch001`

## Batch Scope

- Folder: `wetransfer-d85d59`
- Batch: `folder13-batch001`
- Images reviewed: 50 / 171
- File range: `PETE6874.JPG` to `PETE7189.JPG`
- Folder progress after this batch: 50 / 171 images
- Next batch should continue from the next sorted image after `PETE7189.JPG`.

Contact sheets:

- `/tmp/asiandeligo-owner-images/folder13-batch001/contact-sheet-1.jpg`
- `/tmp/asiandeligo-owner-images/folder13-batch001/contact-sheet-2.jpg`
- `/tmp/asiandeligo-owner-images/folder13-batch001/contact-sheet-3.jpg`
- `/tmp/asiandeligo-owner-images/folder13-batch001/contact-sheet-zoom-labels.jpg`

## Review Output

- `docs/asiandeligo-owner-image-review-queue-folder13-batch001-20260710.csv`
- `docs/asiandeligo-owner-review-folder13-batch001-20260710.html`
- `docs/asiandeligo-owner-review-folder13-batch001-assets/`

## Summary

- `review_high_existing_sku`: 3 rows
- `create_new_confirm`: 16 rows
- `hold_confirm`: 6 rows
- Total review rows: 25
- Total referenced images: 50

## High-Confidence Existing SKU Matches

| Files | Visible product | SKU | Existing product |
| --- | --- | --- | --- |
| `PETE7017.JPG; PETE7018.JPG` | Hiep Long whole dried chili pepper 100g | `ADG-001247` | Papryka chili suszona, cala 100g - Hiep Long |
| `PETE7031.JPG; PETE7032.JPG` | Green Pagoda dried wood ear mushrooms, whole 50g | `ADG-000349` | Suszone grzyby mun, cale 50g - Green Pagoda |
| `PETE7033.JPG; PETE7034.JPG` | Green Pagoda dried wood ear mushrooms, strips 50g | `ADG-000350` | Suszone grzyby mun, nitki 50g - Green Pagoda |

## Continuation / Duplicate Guards

These rows intentionally point back to products already queued in earlier batches, so later import should merge the images into one product decision and not create duplicates.

| Files | Visible product | Related row |
| --- | --- | --- |
| `PETE6894.JPG; PETE6895.JPG; PETE6896.JPG` | Chaokoh Coconut Gel and Pineapple in Syrup 500g | `folder11-018` |
| `PETE7017.JPG; PETE7018.JPG` | Hiep Long whole dried chili pepper 100g | `folder12-053` |

## Hold Rows

| Files | Visible product | Reason |
| --- | --- | --- |
| `PETE6874.JPG; PETE6875.JPG; PETE6876.JPG; PETE6877.JPG` | Asia Foods white pickled ginger 200g | Visible package shows EXP 04/04/2019. |
| `PETE7027.JPG; PETE7028.JPG` | Asia Foods white sesame 200g | Visible label shows best before 31/07/2018. |
| `PETE7029.JPG; PETE7030.JPG` | Asia Foods black sesame 200g | Visible label shows best before 31/08/2018. |
| `PETE7035.JPG; PETE7036.JPG` | Asia Foods dried lotus seeds 100g | Visible package shows best before 30/06/2020. |
| `PETE7136.JPG; PETE7137.JPG; PETE7138.JPG` | Hiep Long preserved bamboo leaves 500g | Visible stamp shows EXP 31/12/20. |
| `PETE7139.JPG; PETE7140.JPG` | Hiep Long preserved bamboo 500g | Visible stamp shows EXP 31/12/19. |

## Notes

- No DB writes, no live media imports, and no production deploy were performed.
- Conservative matching rule used: exact visible brand + product name + weight/volume/pack count before proposing an existing SKU.
- Old-date images were explicitly held, even when the product itself might be useful as a future SKU.
