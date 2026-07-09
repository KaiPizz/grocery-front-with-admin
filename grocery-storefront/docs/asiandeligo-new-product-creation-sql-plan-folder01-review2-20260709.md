# Asia Deli Go New Product Creation SQL Plan - Folder 01 Review 2

Generated: 2026-07-09T13:50:30.251Z

## Summary

- Batch: asiandeligo-new-products-folder01-review2-20260709
- Runtime channel guard: `kenmito`
- Source products planned: 7
- Source images found: 7
- Rows with notes: 0
- Stock policy: temporary owner default, `100` per row
- Price policy: `retail_price=0`, `status=draft`, `is_published=false`, `is_for_sale=false`, metadata `price_pending=true`.
- Dry-run CSV: `docs/asiandeligo-new-product-creation-dry-run-folder01-review2-20260709.csv`
- SQL output: `docs/asiandeligo-new-product-creation-sql-plan-folder01-review2-20260709.sql`
- Local staging directory: `/tmp/asiandeligo-new-product-creation-dry-run-folder01-review2-20260709`

## Preconditions Before Running SQL

- Upload/stage each image so `target_url` returns 200.
- Confirm this should target the current runtime catalog channel `kenmito` / Asia Deli Go storefront.
- Confirm owner accepts draft products with price pending and not visible for sale until edited.
- Remaining EAN gaps stay blank: Hoang Long tea and Sen Soy Premium soy sauce.

## Schema Assumptions Verified

- `channels.slug` resolves the target `salon_id`; all writes are scoped to that salon.
- `products.category_id -> categories.id`, `product_variants.template_id -> products.id`, `product_images.template_id -> products.id`, and `product_translations.template_id -> products.id` are declared FKs.
- `products.retail_price` has default `0`; `products.status` has default `draft`; this plan sets both explicitly.
- `product_variants.available_stock` is a generated column, so the plan sets only `total_stock` and `total_stock_qty`.
- Current build DB product catalog is under channel `kenmito`; local `asiandeligo` channel is not the 1784-product catalog.

## Planned Rows

| draft_sku | slug | category_slug | ean | stock | target_url | notes |
| --- | --- | --- | --- | ---: | --- | --- |
| ADG-001785 | hoang-long-tra-che-nhai-dac-biet-100g | herbaty |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001785/01-SAU_9284.jpg |  |
| ADG-001786 | koh-kae-peanuts-coconut-cream-flavour-coated | słodycze-przekąski | 8852023664248 | 100 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001786/01-SAU_9304.jpg |  |
| ADG-001787 | lee-kum-kee-chicken-marinade-410ml | sosy-marynaty | 0007889580031 | 100 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001787/01-SAU_9667.jpg |  |
| ADG-001788 | sen-soy-premium-soy-sauce | sos-sojowy |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001788/01-SAU_9668.jpg |  |
| ADG-001789 | megachef-gluten-free-soy-sauce-200ml | sos-sojowy | 8857118730556 | 100 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001789/01-SAU_9670.jpg |  |
| ADG-001790 | megachef-gluten-free-soy-sauce-500ml | sos-sojowy | 8857118730570 | 100 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001790/01-SAU_9677.jpg |  |
| ADG-001791 | megachef-premium-mushroom-sauce-570g | sosy-marynaty | 8857118730679 | 100 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001791/01-SAU_9679.jpg |  |

## Rollback Idea

If the SQL is applied and needs rollback before orders reference these products, delete by batch metadata in reverse dependency order: `product_translations`, `product_images`, `product_variants`, then `products` where batch equals this plan label.
