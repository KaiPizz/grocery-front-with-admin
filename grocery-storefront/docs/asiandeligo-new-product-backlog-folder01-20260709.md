# Asia Deli Go New Product Backlog - Folder 01

Generated: 2026-07-09

Source review export: `/tmp/asiandeligo-owner-review-results/asiandeligo-folder01-owner-decisions-20260709.csv`

## Summary

- New-product candidates: 10
- Source folder scope: folder 01 owner/ad images
- Public DB action: none yet
- Media import action: hold until product creation is confirmed
- Duplicate audit: completed against the live Asia Deli Go catalog export on 2026-07-09
- Owner review export imported: `docs/asiandeligo-new-product-decisions-folder01-review2-20260709.csv`

This file started as the `create_new` backlog from the first owner/user review. After the second duplicate review, three rows are now existing-SKU image imports and seven rows remain create-new candidates.

After the owner review and image comparison, not every row is safe to create immediately:

- `folder01-052` is confirmed as existing `ADG-001000`.
- `folder01-056` is confirmed as existing `ADG-000383`; the earlier review link used the wrong slug.
- `folder01-058` is confirmed as existing `ADG-000477`.
- `folder01-055` is a new 570g size, not existing `ADG-001000` 230g.
- `folder01-051` is still a create-new candidate but needs exact volume/EAN.

## Required Before Creating Products

For each candidate, confirm:

- Exact PL name and EN name
- Brand and size/volume
- EAN/barcode if available
- Category
- Price and launch stock
- Country of origin where applicable
- Allergens and dietary flags, especially gluten-free and vegetarian

## Candidate List

| Review ID | File | Candidate product | Brand | Size | Category guess | Action |
| --- | --- | --- | --- | --- | --- | --- |
| `folder01-040` | `SAU_9284.jpg` | Hoang Long Tra Che Nhai Dac Biet 100g | Hoang Long | 100g | Tea | Create/confirm new tea SKU |
| `folder01-041` | `SAU_9304.jpg` | Koh-Kae Peanuts Coconut Cream Flavour Coated | Koh-Kae | unclear | Snacks | Confirm weight/EAN before creating |
| `folder01-050` | `SAU_9667.jpg` | Lee Kum Kee Chicken Marinade 410ml | Lee Kum Kee | 410ml | Sauces / Marinades | Create/confirm new sauce SKU |
| `folder01-051` | `SAU_9668.jpg` | Sen Soy Premium soy sauce | Sen Soy | unclear | Soy sauce | Create-new candidate after owner review; confirm volume/EAN first |
| `folder01-052` | `SAU_9669.jpg` | Megachef Premium Mushroom Sauce 230g | Megachef | 230g | Sauces | Existing SKU: import image to `ADG-001000`, do not create duplicate |
| `folder01-053` | `SAU_9670.jpg` | Megachef Gluten-Free Soy Sauce 200ml | Megachef | 200ml | Soy sauce | Create/confirm new gluten-free soy sauce SKU |
| `folder01-054` | `SAU_9677.jpg` | Megachef Gluten-Free Soy Sauce 500ml | Megachef | 500ml | Soy sauce | Create/confirm new gluten-free soy sauce SKU |
| `folder01-055` | `SAU_9679.jpg` | Megachef Premium Mushroom Sauce 570g | Megachef | 570g | Sauces | Create new 570g SKU; related existing SKU `ADG-001000` is only 230g |
| `folder01-056` | `SAU_9682.jpg` | Gold Plum Chinkiang Vinegar 550ml | Gold Plum | 550ml | Vinegar | Existing SKU: import image to `ADG-000383`; corrected slug is `ocet-ryzowy-czarny-chinkiang-550ml-heng-shun` |
| `folder01-058` | `SAU_9688.jpg` | Sen Soy soy sauce large bottle | Sen Soy | 1L | Soy sauce | Existing SKU: import image to `ADG-000477`, do not create duplicate |

## Files

- Backlog CSV: `docs/asiandeligo-new-product-backlog-folder01-20260709.csv`
- Review HTML: `docs/asiandeligo-new-product-review-folder01-20260709.html`

## Next Step

Generate the next import manifest from this reviewed backlog:

- Import images to existing SKUs for `folder01-052`, `folder01-056`, and `folder01-058`.
- Prepare create-new product rows for `folder01-040`, `folder01-041`, `folder01-050`, `folder01-051`, `folder01-053`, `folder01-054`, and `folder01-055`.
- Hold actual product creation until SKU, category, price, stock, EAN/barcode, translations, and media mapping are filled.
