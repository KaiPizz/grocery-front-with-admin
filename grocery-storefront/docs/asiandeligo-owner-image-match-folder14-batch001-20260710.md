# Asia Deli Go Owner Image Match - Folder 14 Batch 001

Source folder on WinPC: `C:\co_Hanh\images\wetransfer-e670da`

Batch scope:
- Folder 14 total files: 140
- Batch 001 files: 50
- File range: `PETE7343.JPG` to `PETE8097.JPG`
- Folder progress after this batch: 50 / 140 files reviewed
- Next batch starts at: `PETE8099.JPG`

Generated review files:
- Queue CSV: `docs/asiandeligo-owner-image-review-queue-folder14-batch001-20260710.csv`
- Review HTML: `docs/asiandeligo-owner-review-folder14-batch001-20260710.html`
- Review assets: `docs/asiandeligo-owner-review-folder14-batch001-assets/`

Local contact sheets:
- `/tmp/asiandeligo-owner-images/folder14-batch001/contact-sheet-1.jpg`
- `/tmp/asiandeligo-owner-images/folder14-batch001/contact-sheet-2.jpg`
- `/tmp/asiandeligo-owner-images/folder14-batch001/contact-sheet-3.jpg`
- `/tmp/asiandeligo-owner-images/folder14-batch001/contact-sheet-4.jpg`
- `/tmp/asiandeligo-owner-images/folder14-batch001/contact-sheet-5.jpg`
- `/tmp/asiandeligo-owner-images/folder14-batch001/contact-sheet-zoom-labels.jpg`

## Summary

Coverage validation:
- Queue rows: 16
- Source image references: 50 / 50
- Missing files: 0
- Extra files: 0
- Duplicate file references: 0
- Generated thumbnails: 50

Status counts:
- `create_new_confirm`: 2
- `ignore_or_supplies`: 2
- `hold_confirm`: 12

## Create-New Candidates

These rows should become new SKUs only after owner confirms EAN, price, stock, pack count, and whether the shop wants these online:

| Review ID | Files | Visible product | Duplicate guard |
| --- | --- | --- | --- |
| `folder14-001` | `PETE7343.JPG`; `PETE7344.JPG`; `PETE7660.JPG`; `PETE7661.JPG`; `PETE7662.JPG`; `PETE7663.JPG`; `PETE7878.JPG` | Asia Foods red-sleeve disposable bamboo chopsticks / Paleczki Bambusowe Jednorazowego Uzytku | Existing chopstick rows must be checked by pack count and length before creating. |
| `folder14-002` | `PETE7879.JPG`; `PETE7880.JPG` | Green-white sleeve disposable chopsticks, exact brand/count unclear | No safe exact match without readable brand, count and length. |

## Ignore / Supplies Unless Owner Wants Them Online

These look more like store or food-service supplies than normal grocery storefront items:

| Review ID | Files | Visible product | Reason |
| --- | --- | --- | --- |
| `folder14-003` | `PETE7759.JPG`; `PETE7760.JPG`; `PETE7761.JPG`; `PETE7762.JPG`; `PETE7763.JPG` | Huhtamaki Econo XPS oval plates 26.2 x 19.3cm, 50 pcs | Packaging/food-service supply; skip unless sold online. |
| `folder14-004` | `PETE8027.JPG`; `PETE8028.JPG`; `PETE8030.JPG`; `PETE8031.JPG` | White foam takeaway clamshell food boxes, multiple compartments | Packaging supply; no branded retail label or exact size/count visible. |

## Hold / Needs Confirmation

These should not be imported automatically because this folder is mostly kitchenware and photos do not provide reliable SKU-level details:

| Review ID | Files | Visible product | Hold reason |
| --- | --- | --- | --- |
| `folder14-005` | `PETE8032.JPG`; `PETE8033.JPG`; `PETE8034.JPG`; `PETE8036.JPG` | Metal wok spatula / Chinese turner with wooden handle | Size, brand, barcode and whether it is retail stock are unclear. |
| `folder14-006` | `PETE8037.JPG`; `PETE8038.JPG` | Ceramic lidded bowl with warmer/stand, IPS Ceramic | Non-food item; exact retail name and EAN needed. |
| `folder14-007` | `PETE8040.JPG`; `PETE8041.JPG` | Bamboo-handle wire spider strainer/skimmer | Size and barcode needed. |
| `folder14-008` | `PETE8045.JPG`; `PETE8073.JPG`; `PETE8077.JPG`; `PETE8078.JPG`; `PETE8079.JPG` | Carbon steel wok with single wooden handle | Exact diameter/model needed; some photos include hands/background clutter. |
| `folder14-009` | `PETE8049.JPG`; `PETE8074.JPG`; `PETE8076.JPG` | Carbon steel wok with two side handles | Exact diameter/model needed. |
| `folder14-010` | `PETE8050.JPG` | Stainless perforated colander / steamer insert bowl | Product name, size and EAN needed. |
| `folder14-011` | `PETE8053.JPG`; `PETE8055.JPG`; `PETE8089.JPG` | Wooden-handle Chinese cleaver/kitchen knife | Exact model and legality/safety category handling needed. |
| `folder14-012` | `PETE8063.JPG`; `PETE8082.JPG` | Stainless-handle Chinese cleaver | Exact model and legality/safety category handling needed. |
| `folder14-013` | `PETE8057.JPG` | Round ceramic steaming rack/trivet | Size and retail label needed. |
| `folder14-014` | `PETE8067.JPG`; `PETE8068.JPG`; `PETE8069.JPG`; `PETE8071.JPG`; `PETE8084.JPG`; `PETE8087.JPG` | Assorted metal soup ladles | Multiple variants; size/model split needed before SKU creation. |
| `folder14-015` | `PETE8092.JPG`; `PETE8097.JPG` | Wooden-handle Asian chef knife / santoku-style knife | Exact model and legality/safety category handling needed. |
| `folder14-016` | `PETE8094.JPG` | Black-handle kitchen knife/cleaver | Exact model and legality/safety category handling needed. |

## Notes

- This batch is review-only. No DB/media import, product creation, or production deploy was performed.
- Kitchenware/supplies should be kept out of the grocery live catalog until owner confirms that Asia Deli Go wants to sell them online.
- For any approved knife rows, confirm platform/legal handling and product classification before import.
