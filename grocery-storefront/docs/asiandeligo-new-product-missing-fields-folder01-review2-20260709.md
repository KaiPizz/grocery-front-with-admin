# Asia Deli Go New Product Missing Fields - Folder 01 Review 2

Generated: 2026-07-09

## Scope

This report covers only the seven create-new candidates confirmed after the second duplicate review. It does not create products and does not write the database.

## Validation

- Creation manifest rows: 7
- Unique draft SKUs: 7
- Unique proposed media keys: 7
- Source images found: 7
- Stock default applied: `100` for all 7 draft products
- EAN/UPC filled from online research: 5
- EAN still missing: 2 (`folder01-040`, `folder01-051`)
- Validation problems: 0

## Draft SKU Range

- Current max live SKU observed from catalog export: `ADG-001784`
- Draft SKU range reserved in this dry run: `ADG-001785` through `ADG-001791`
- These are provisional until the real DB apply step.

## Missing Fields By Candidate

| Review ID | Draft SKU | Product | Missing fields |
| --- | --- | --- | --- |
| `folder01-040` | `ADG-001785` | Hoang Long Tra Che Nhai Dac Biet 100g | EAN, price, country, dietary tags |
| `folder01-041` | `ADG-001786` | Koh-Kae Peanuts Coconut Cream Flavour Coated 230g | price, country, allergens |
| `folder01-050` | `ADG-001787` | Lee Kum Kee Chicken Marinade 410ml | price, country, allergens, dietary tags |
| `folder01-051` | `ADG-001788` | Sen Soy Premium soy sauce | EAN, exact volume, price, country, gluten-free flag, allergens |
| `folder01-053` | `ADG-001789` | Megachef Gluten-Free Soy Sauce 200ml | price, country, vegetarian flag, allergens |
| `folder01-054` | `ADG-001790` | Megachef Gluten-Free Soy Sauce 500ml | price, country, vegetarian flag, allergens |
| `folder01-055` | `ADG-001791` | Megachef Premium Mushroom Sauce 570g | price, country, allergens |

## EAN Research

Detailed source notes were added in `docs/asiandeligo-new-product-ean-research-folder01-review2-20260709.md`.

EANs filled in the creation manifest:

- `folder01-041` / `ADG-001786`: `8852023664248`
- `folder01-050` / `ADG-001787`: `0007889580031`
- `folder01-053` / `ADG-001789`: `8857118730556`
- `folder01-054` / `ADG-001790`: `8857118730570`
- `folder01-055` / `ADG-001791`: `8857118730679`

## Existing-SKU Image Imports From This Review

These are not new products:

| Review ID | File | Existing SKU | Action |
| --- | --- | --- | --- |
| `folder01-052` | `SAU_9669.jpg` | `ADG-001000` | Import image to existing product. |
| `folder01-056` | `SAU_9682.jpg` | `ADG-000383` | Import image to existing product with corrected slug. |
| `folder01-058` | `SAU_9688.jpg` | `ADG-000477` | Import image to existing product. |

## Next Step

Use `docs/asiandeligo-new-product-creation-manifest-folder01-review2-20260709.csv` as the product creation worksheet. Fill missing price, remaining EANs, country, allergen, and dietary fields before generating any SQL apply plan.
