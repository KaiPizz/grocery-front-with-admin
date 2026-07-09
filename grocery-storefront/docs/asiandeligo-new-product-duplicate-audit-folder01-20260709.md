# Asia Deli Go New Product Duplicate Audit - Folder 01

Generated: 2026-07-09

Checked against live Asia Deli Go catalog export from `zira-ai.com` / storefront DB: 1784 products.

## Result Buckets

Updated after owner review export `asiandeligo-folder01-new-product-decisions-20260709 (1).csv`.

### Existing SKU - Do Not Create

| Review ID | Owner image product | Existing SKU | Existing product | Reason |
| --- | --- | --- | --- | --- |
| `folder01-052` | Megachef Premium Mushroom Sauce 230g | `ADG-001000` | Sos ostrygowy grzybowy wegański Premium 230g - Megachef | Owner confirmed. Same brand, size, and product type. Import image to existing SKU. |
| `folder01-056` | Gold Plum Chinkiang Vinegar 550ml | `ADG-000383` | Ocet ryżowy czarny Chinkiang 550ml - Heng Shun | Image comparison confirms same product. Earlier review URL used a wrong slug; corrected URL is `/products/ocet-ryzowy-czarny-chinkiang-550ml-heng-shun`. |
| `folder01-058` | Sen Soy soy sauce large bottle | `ADG-000477` | Sos sojowy, naturalnie warzony 1L - Sen Soy | Owner confirmed and image comparison matches existing 1L bottle. |

### Create New After Field Confirmation

| Review ID | Owner image product | Existing SKU | Existing product | Reason |
| --- | --- | --- | --- | --- |
| `folder01-051` | Sen Soy Premium soy sauce | `ADG-000477` / `ADG-000478` / `ADG-000515` | Existing Sen Soy soy sauce variants | Owner selected create_new. Bottle differs from existing candidates, but exact volume/EAN is still needed. |
| `folder01-055` | Megachef Premium Mushroom Sauce 570g | `ADG-001000` | Existing 230g Megachef mushroom sauce | Image clearly shows 570g. Create a new size SKU, not a duplicate of the 230g SKU. |

### Likely New After Field Confirmation

| Review ID | Owner image product | Note |
| --- | --- | --- |
| `folder01-040` | Hoang Long Tra Che Nhai Dac Biet 100g | No exact live catalog hit found. |
| `folder01-041` | Koh-Kae Peanuts Coconut Cream Flavour Coated | No exact live catalog hit found; confirm weight/EAN. |
| `folder01-050` | Lee Kum Kee Chicken Marinade 410ml | Lee Kum Kee exists in catalog, but no exact chicken marinade 410ml hit found. |
| `folder01-053` | Megachef Gluten-Free Soy Sauce 200ml | Megachef 200ml fish sauces exist, but not this gluten-free soy sauce. |
| `folder01-054` | Megachef Gluten-Free Soy Sauce 500ml | Megachef 500ml fish sauce and Sempio GF soy sauce exist, but not this Megachef GF soy sauce. |

## Next Action

Use the reviewed backlog for the next import manifest:

- Import images to existing SKUs: `folder01-052`, `folder01-056`, `folder01-058`.
- Create new SKU candidates: `folder01-040`, `folder01-041`, `folder01-050`, `folder01-051`, `folder01-053`, `folder01-054`, `folder01-055`.
- Before product creation, fill missing EAN/price/stock/category fields for create-new rows.
