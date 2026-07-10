# Asia Deli Go Owner Image Match - Folder 06 Batch 001

Generated: 2026-07-10

Remote source: `winpc:C:\co_Hanh\images\wetransfer-2dfcd3`
Local batch: `/tmp/asiandeligo-owner-images/folder06-batch001`

## Batch Inventory

- Files copied for this batch: 54
- File range: `PETE7816.JPG` to `PETE9024.JPG`
- Source folder progress after this batch: 54 / 54 files reviewed
- Contact sheets:
  - `/tmp/asiandeligo-owner-images/folder06-batch001/contact-sheet-1.jpg`
  - `/tmp/asiandeligo-owner-images/folder06-batch001/contact-sheet-2.jpg`
  - `/tmp/asiandeligo-owner-images/folder06-batch001/contact-sheet-3.jpg`
  - `/tmp/asiandeligo-owner-images/folder06-batch001/representative-sheet.jpg`

## Catalog Join Contract

- Catalog comparison used `/tmp/asiandeligo-prod-products-20260709.tsv`.
- Direct apply is not planned for this batch yet. Rows are staged for owner/user review.
- Same product family is not enough for mapping when brand, flavor, pack type, or pack size differ.
- Vifon/Acecook Pho rows are intentionally **not** mapped to MAMA Pho rows.
- Paldo cup noodles are intentionally **not** merged with Paldo multi-pack noodles.
- Price fill remains deferred; when products are created later, stock can temporarily default to 100 per current project note.

## Result

Generated review queue:

- `docs/asiandeligo-owner-image-review-queue-folder06-batch001-20260710.csv`
- `docs/asiandeligo-owner-review-folder06-batch001-20260710.html`

## Candidate Summary

| Status | Count | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 2 | Brand/product/size match an existing ADG SKU, but still needs review accept before import. |
| `review_possible_existing_sku` | 1 | Similar existing SKU found, but visible label or size differs and needs owner/user confirmation. |
| `create_new_confirm` | 21 | Missing products or separate variant/pack-size candidates. |

## High-Confidence Existing SKU Candidates

| Files | Visible product | Candidate SKU | Catalog row |
| --- | --- | --- | --- |
| `PETE7819.JPG` | MAMA Oriental Style Instant Noodles Shrimp Flavour Tom Yum 60g | `ADG-000320` | Zupa Tom Yum krewetkowa 60g - MAMA |
| `PETE7821.JPG; PETE9016.JPG` | Paldo Jjajang Men Chajang Noodle 4 x 200g | `ADG-001297` | Jjajang Men, makaron z sosem z czarnej fasoli 4 x 200g - Paldo |

## Possible Existing SKU Candidates

| Files | Visible product | Candidate SKU | Note |
| --- | --- | --- | --- |
| `PETE7989.JPG; PETE7990.JPG` | Acecook Mi Lau Thai shrimp flavour 80g | `ADG-000703` | Same brand and close shrimp/Tom Yum family, but owner image says Mi Lau Thai shrimp 80g while catalog row says Tom Yum shrimp 83g. Confirm before mapping. |

## Create-New Groups

- Vifon Pho Ga 65g and Vifon Pho Bo 65g.
- Paldo Jang Ramyun Soy Flavor 5 x 120g, Hwa Ramyun 5 x 120g, Namja Ramen 5 x 115g, U-Dong Flavor 5 x 120g, Ilpoom Seafood Noodle Soup 5 x 120g, Volcano Chicken Noodle 4 x 140g, and Stirfried Kimchi Noodle 4 x 150g.
- Paldo King Noodle cup variants: Kimchi, Hwa hot and spicy, Seafood, and Lobster.
- Kailo Brand cup variants: Seafood 120g, Mushroom 120g, and Tomyum 120g.
- Acecook Oh! Ricey Pho Ga/Pho Bo, Mi Kim Chi, Mi Lau Thai chicken, and Mi Lau Thai seafood.

## Next Step

Review this HTML page or continue with the next source folder. Do not push this batch to production without a separate production approval.
