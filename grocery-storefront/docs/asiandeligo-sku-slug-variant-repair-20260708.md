# Asia Deli Go Variant SKU Repair SQL Plan

Generated: 2026-07-08T12:16:03.810Z
Channel: asiandeligo
Batch: asiandeligo-sku-slug-variant-repair-20260708
Expected rows: 1784

## Validation

- Mapping validation: OK
- Rows in mapping: 1784

## SQL Safety

- SQL creates a `product_variants` backup table before updates.
- SQL aborts if source rows, migrated products, matching variants, or new SKU conflicts do not match expectations.
- SQL verifies the product migration first using `products.product_code = ADG-*` and `products.private_metadata.legacy_kimchi_slug`.

## First 20 Variant SKU Mappings

| old sku | new sku |
| --- | --- |
| KIMCHI-7 | ADG-000001 |
| KIMCHI-10 | ADG-000002 |
| KIMCHI-12 | ADG-000003 |
| KIMCHI-14 | ADG-000004 |
| KIMCHI-15 | ADG-000005 |
| KIMCHI-20 | ADG-000006 |
| KIMCHI-22 | ADG-000007 |
| KIMCHI-24 | ADG-000008 |
| KIMCHI-27 | ADG-000009 |
| KIMCHI-29 | ADG-000010 |
| KIMCHI-31 | ADG-000011 |
| KIMCHI-35 | ADG-000012 |
| KIMCHI-38 | ADG-000013 |
| KIMCHI-39 | ADG-000014 |
| KIMCHI-40 | ADG-000015 |
| KIMCHI-41 | ADG-000016 |
| KIMCHI-42 | ADG-000017 |
| KIMCHI-50 | ADG-000018 |
| KIMCHI-59 | ADG-000019 |
| KIMCHI-65 | ADG-000020 |
