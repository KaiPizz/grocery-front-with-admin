# Asia Deli Go owner image import manifest - folder 01

Source review file: `docs/asiandeligo-owner-review-results-folder01-20260709.csv`

Generated artifacts:
- Ready import manifest: `docs/asiandeligo-owner-image-import-manifest-folder01-20260709.csv`
- JSON mirror: `docs/asiandeligo-owner-image-import-manifest-folder01-20260709.json`
- Hold queue: `docs/asiandeligo-owner-image-hold-queue-folder01-20260709.csv`

## Scope

This is a manifest only. It does not write product media to the database and does not copy files into production storage.

All owner review notes from `owner_notes` are preserved in the generated CSV/JSON files. Reject/skip reasons are not discarded.

## Ready manifest summary

| Status | Image rows | Meaning |
| --- | ---: | --- |
| `ready_approved` | 44 | Rows approved by owner and mapped to one exact `ADG-*` SKU. |
| `ready_manual_correction` | 6 | Sempio gallery fixes from owner notes. |
| `ready_manual_variant_split` | 2 | Approved variant row split into exact Pho Ga/Pho Bo SKUs by visible label. |
| **Total** | **52** | Safe image rows for the next media import step. |

Validation:
- Missing target SKU: `0`
- Missing source image file: `0`
- Ambiguous target SKU in ready manifest: `0`

## Manual correction rules included

| Review row | Images | Target SKU | Rule |
| --- | --- | --- | --- |
| `folder01-020` | `SAU_9771.jpg`, `SAU_9772.jpg`, `SAU_9773.jpg` | `ADG-000115` | Owner note says first 3 images are Doenjang; exclude `SAU_9774`. |
| `folder01-021` | `SAU_9774.jpg`, `SAU_9775.jpg`, `SAU_9776.jpg` | `ADG-000093` | Owner note says `SAU_9774` belongs to this Gochujang product. |
| `folder01-047` | `SAU_9593.jpg` | `ADG-000792` | Visible label is Pho Ga, so map to Pho Ga bouillon cubes. |
| `folder01-047` | `SAU_9594.jpg` | `ADG-000791` | Visible label is Pho Bo, so map to Pho Bo bouillon cubes. |

Note: owner note for `folder01-047` says "beef and pork", but the photos read Pho Ga and Pho Bo. The manifest follows the visible label.

## Held out of import

34 review rows remain out of the ready manifest:

| Hold status | Rows | Reason |
| --- | ---: | --- |
| `skip` | 18 | Owner skipped or note requires extra matching. |
| `create_new` | 10 | Product is probably missing from catalog. |
| `reject` | 4 | Candidate mapping is wrong. |
| `approve` | 1 | Approved but target SKU is still ambiguous. |
| `approved_but_ambiguous_target_sku` | 1 | Exact SKU not readable from image. |

Important held rows:
- `folder01-067`: Sempio glass noodles approved, but size is hidden; choose `ADG-000224` 450g or `ADG-000247` 900g before import.
- `folder01-062`: owner says likely first link; candidate likely `ADG-000523`, but keep out until final confirmation.
- `folder01-065`: owner says first link; candidate likely `ADG-000061`, but keep out until final confirmation.
- `folder01-057`: likely `ADG-000190` Maekrua Oyster Sauce 300ml, needs owner confirmation.
- `folder01-059`: likely `ADG-000097` Cock Brand Sweet Chili Sauce 650ml, needs owner confirmation.
- `folder01-060`: likely new Guan Ji Superior Light Soy Sauce 600ml.
- `folder01-066`: fresh udon from a different manufacturer; do not map to existing udon candidates.

## Next step

Use only `docs/asiandeligo-owner-image-import-manifest-folder01-20260709.csv` for the first actual media import. The import script should:
1. Copy source images into the storefront/backend media store using `proposed_media_key`.
2. Attach each media item to `target_sku`.
3. Preserve `image_order_for_sku`.
4. Skip every row in `docs/asiandeligo-owner-image-hold-queue-folder01-20260709.csv`.
