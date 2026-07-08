# Asia Deli Go SKU / Slug Migration Apply Result

Generated: 2026-07-08
Channel: asiandeligo

## Product Slug / Code Apply

- SQL: `docs/asiandeligo-sku-slug-migration-apply-20260708.sql`
- Rollback preview:
  - matched products: 1784
  - backed up products: 1784
  - matched translations: 1744
  - backed up translations: 1744
  - updated products: 1784
  - updated translations: 1744
  - remaining legacy `KIMCHI-[number]` product slugs: 0
  - products with `ADG-*` product code: 1784
- Production commit:
  - updated products: 1784
  - updated translations: 1744

## Variant SKU Repair

- SQL: `docs/asiandeligo-sku-slug-variant-repair-20260708.sql`
- Rollback preview:
  - matched variants: 1784
  - backed up variants: 1784
  - updated variants: 1784
  - remaining legacy `KIMCHI-[number]` variant SKUs: 0
  - variants with `ADG-*` SKU: 1784
- Production commit:
  - updated variants: 1784

## Verification

- DB products: `0` legacy numeric Kimchi slugs, `1784` ADG product codes.
- DB variants: `0` legacy numeric Kimchi SKUs, `1784` ADG variant SKUs.
- GraphQL:
  - `zaprawa-do-sushi-200ml-house-of-asia` returns `ADG-000001`.
  - `rzodkiew-oshinko-takuan-marynowana-pocieta-400g-sakura` returns `ADG-001166`.
  - `KIMCHI-7` returns `null`.
- Playwright storefront render:
  - `/pl/products/zaprawa-do-sushi-200ml-house-of-asia` shows product and `ADG-000001`.
  - `/en/products/zaprawa-do-sushi-200ml-house-of-asia` shows product and `ADG-000001`.
  - `/pl/products/rzodkiew-oshinko-takuan-marynowana-pocieta-400g-sakura` shows product and `ADG-001166`.
  - `/pl/products/KIMCHI-7` shows not found.

## Remaining Follow-Up

- Product image/media URLs still point to storage paths like `products/KIMCHI-7/1.webp`. This is a separate media migration and should be handled next if the goal is to remove public Kimchi traces from asset URLs.
