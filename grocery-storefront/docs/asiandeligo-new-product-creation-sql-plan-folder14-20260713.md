# Asia Deli Go New Product Creation SQL Plan

Generated: 2026-07-13T08:35:07.969Z

## Summary

- Batch: asiandeligo-new-products-folder14-20260713
- Runtime channel guard: `asiandeligo`
- Input manifest: `docs/asiandeligo-new-product-creation-manifest-folder14-20260713.csv`
- Source products planned: 53
- Source images found: 53
- Rows with notes: 0
- Stock policy: temporary owner default, `100` per row
- Price policy: `retail_price=0`, `status=draft`, `is_published=false`, `is_for_sale=false`, metadata `price_pending=true`.
- Pricing decision: deferred to the final owner/admin phase; missing real prices must not block finishing the web/catalog cleanup.
- Dry-run CSV: `docs/asiandeligo-new-product-creation-dry-run-folder14-20260713.csv`
- SQL output: `docs/asiandeligo-new-product-creation-sql-plan-folder14-20260713.sql`
- Local staging directory: `/tmp/asiandeligo-new-product-creation-dry-run-folder14-20260713`

## Preconditions Before Running SQL

- Upload/stage each image so `target_url` returns 200.
- Confirm this should target the current runtime catalog channel `asiandeligo` / Asia Deli Go storefront.
- Confirm owner accepts draft products with price pending and not visible for sale until edited.
- Do not source prices from internet listings; owner/admin will fill real store prices later.
- EAN gaps stay blank until they are confirmed from product labels, owner data, or reliable product sources.

## Schema Assumptions Verified

- `channels.slug` resolves the target `salon_id`; all writes are scoped to that salon.
- `products.category_id -> categories.id`, `product_variants.template_id -> products.id`, `product_images.template_id -> products.id`, and `product_translations.template_id -> products.id` are declared FKs.
- `products.retail_price` has default `0`; `products.status` has default `draft`; this plan sets both explicitly.
- `product_variants.available_stock` is a generated column, so the plan sets only `total_stock` and `total_stock_qty`.
- Current runtime channel guard is `asiandeligo`; confirm against the target database before applying.

## Planned Rows

| draft_sku | slug | category_slug | ean | stock | target_url | notes |
| --- | --- | --- | --- | ---: | --- | --- |
| ADG-001792 | asia-foods-red-sleeve-disposable-bamboo-chopsticks-paleczki-bambusowe-jednorazowego-uzytku | pałeczki-i-sztućce |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001792/01-PETE7343.JPG |  |
| ADG-001793 | green-white-sleeve-disposable-chopsticks-exact-brand-count-unclear | pałeczki-i-sztućce |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001793/01-PETE7879.JPG |  |
| ADG-001794 | huhtamaki-econo-xps-oval-plates-26-2-x-19-3cm-50-pcs | naczynia |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001794/01-PETE7759.JPG |  |
| ADG-001795 | white-foam-takeaway-clamshell-food-boxes-multiple-compartments | naczynia |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001795/01-PETE8028.JPG |  |
| ADG-001796 | metal-wok-spatula-chinese-cooking-turner-with-wooden-handle | patelnie-wok-grill |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001796/01-PETE8032.JPG |  |
| ADG-001797 | ceramic-lidded-bowl-with-warmer-stand-ips-ceramic | miski |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001797/01-PETE8037.JPG |  |
| ADG-001798 | bamboo-handle-wire-spider-strainer-skimmer | patelnie-wok-grill |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001798/01-PETE8040.JPG |  |
| ADG-001799 | carbon-steel-wok-with-single-wooden-handle-size-unclear | patelnie-wok-grill |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001799/01-PETE8045.JPG |  |
| ADG-001800 | carbon-steel-wok-with-two-side-handles-size-unclear | patelnie-wok-grill |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001800/01-PETE8049.JPG |  |
| ADG-001801 | stainless-perforated-colander-steamer-insert-bowl | patelnie-wok-grill |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001801/01-PETE8050.JPG |  |
| ADG-001802 | wooden-handle-chinese-cleaver-kitchen-knife-exact-model-unclear | noże |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001802/01-PETE8053.JPG |  |
| ADG-001803 | stainless-handle-chinese-cleaver-exact-model-unclear | noże |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001803/01-PETE8063.JPG |  |
| ADG-001804 | round-ceramic-steaming-rack-trivet-size-unclear | naczynia |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001804/01-PETE8057.JPG |  |
| ADG-001805 | assorted-metal-soup-ladles-multiple-handle-styles-sizes | naczynia |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001805/01-PETE8067.JPG |  |
| ADG-001806 | wooden-handle-asian-chef-knife-santoku-style-knife-exact-model-unclear | noże |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001806/01-PETE8092.JPG |  |
| ADG-001807 | black-handle-kitchen-knife-cleaver-exact-model-unclear | noże |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001807/01-PETE8094.JPG |  |
| ADG-001808 | lct-long-cam-stainless-vietnamese-coffee-filter-phin-ca-phe | zaparzacze-do-kawy |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001808/01-PETE8099.JPG |  |
| ADG-001809 | bamboo-sushi-rolling-mat-makisu | maty-do-zwijania |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001809/01-PETE8101.JPG |  |
| ADG-001810 | black-chopsticks-bundle-unlabelled | pałeczki-i-sztućce |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001810/01-PETE8102.JPG |  |
| ADG-001811 | stainless-handle-chinese-cleaver-kitchen-knife | noże |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001811/01-PETE8104.JPG |  |
| ADG-001812 | tq-korean-style-wooden-chopsticks-set-5-pairs | pałeczki-i-sztućce |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001812/01-PETE8106.JPG |  |
| ADG-001813 | long-hot-pot-cooking-chopsticks-1-pair | pałeczki-i-sztućce |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001813/01-PETE8107.JPG |  |
| ADG-001814 | bamboo-handle-wire-spider-strainer-skimmer-adg-001814 | patelnie-wok-grill |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001814/01-PETE8108.JPG |  |
| ADG-001815 | best-888-playing-cards-red-pack | pozostałe-produkty |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001815/01-PETE8113.JPG |  |
| ADG-001816 | rectangular-knife-sharpening-stone | noże |  | 100 | https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001816/01-PETE8114.JPG |  |

## Rollback Idea

If the SQL is applied and needs rollback before orders reference these products, delete by batch metadata in reverse dependency order: `product_translations`, `product_images`, `product_variants`, then `products` where batch equals this plan label.
