# Asia Deli Go New Product Backlog - Folder 01

Generated: 2026-07-09

Source review export: `/tmp/asiandeligo-owner-review-results/asiandeligo-folder01-owner-decisions-20260709.csv`

## Summary

- New-product candidates: 10
- Source folder scope: folder 01 owner/ad images
- Public DB action: none yet
- Media import action: hold until product creation is confirmed
- Duplicate audit: completed against the live Asia Deli Go catalog export on 2026-07-09

These rows were marked `create_new` by the owner/user review. They should not be imported into an existing SKU and should not be auto-created in production until the required product fields are confirmed.

After the duplicate audit, not every row is safe to create immediately:

- `folder01-052` is probably already `ADG-001000`.
- `folder01-056` may already be `ADG-000383`.
- `folder01-051` and `folder01-058` may be existing Sen Soy soy sauce variants and need exact volume/EAN first.

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
| `folder01-051` | `SAU_9668.jpg` | Sen Soy Premium soy sauce | Sen Soy | unclear | Soy sauce | Hold: compare volume/EAN with `ADG-000477`, `ADG-000478`, `ADG-000515` |
| `folder01-052` | `SAU_9669.jpg` | Megachef Premium Mushroom Sauce 230g | Megachef | 230g | Sauces | Probable duplicate: confirm/map to `ADG-001000`, do not create yet |
| `folder01-053` | `SAU_9670.jpg` | Megachef Gluten-Free Soy Sauce 200ml | Megachef | 200ml | Soy sauce | Create/confirm new gluten-free soy sauce SKU |
| `folder01-054` | `SAU_9677.jpg` | Megachef Gluten-Free Soy Sauce 500ml | Megachef | 500ml | Soy sauce | Create/confirm new gluten-free soy sauce SKU |
| `folder01-055` | `SAU_9679.jpg` | Megachef Premium Mushroom Sauce 570g | Megachef | 570g | Sauces | Create only if label confirms 570g; related existing SKU is `ADG-001000` 230g |
| `folder01-056` | `SAU_9682.jpg` | Gold Plum Chinkiang Vinegar 550ml | Gold Plum | 550ml | Vinegar | Possible duplicate: confirm same/different SKU vs `ADG-000383` Heng Shun |
| `folder01-058` | `SAU_9688.jpg` | Sen Soy soy sauce large bottle | Sen Soy | unclear | Soy sauce | Hold: compare volume/EAN with `ADG-000477`, `ADG-000478`, `ADG-000515` |

## Files

- Backlog CSV: `docs/asiandeligo-new-product-backlog-folder01-20260709.csv`
- Review HTML: `docs/asiandeligo-new-product-review-folder01-20260709.html`

## Next Step

Use the review HTML to confirm each item as:

- `Confirm`: product data is correct and ready for creation
- `Wrong`: candidate identification is wrong
- `Create new`: should become a new SKU after required fields are added
- `Skip` on this backlog page: treated as `create_new` in the exported CSV. Use this when the product should not be mapped to an existing link/SKU and must become a new product candidate.

After the export comes back, generate a creation manifest with SKU, category, price, stock, barcode, translations, and media mapping.
