# Asia Deli Go Owner Image Import SQL Plan - Folder 01

Generated: 2026-07-09T10:30:03.948Z

## Summary

- Batch: asiandeligo-owner-images-folder01-20260709
- Image rows planned: 52
- Distinct products planned: 41
- Primary image candidates: 41
- SQL output: `docs/asiandeligo-owner-image-import-sql-plan-folder01-20260709.sql`

## Preconditions

- Upload/stage the 52 image files so each `target_url` returns 200 before running SQL.
- Run this SQL against the correct eNail PostgreSQL database only after reviewing the guards.
- The plan is idempotency-protected by URL/hash checks and should abort if already applied.

## JOIN Contract

- `_adg_owner_image_source.target_product_id` is a UUID from the reviewed SKU migration dry-run and joins to `products.id`.
- `product_images.template_id` is a declared FK to `products.id`; `product_images.salon_id = products.salon_id` keeps tenant scope.
- `products.deleted_at IS NULL` is required; `product_images` has no soft-delete column.
- Current build DB still stores these products under salon slug `kamito` with `KIMCHI-*` slugs; the plan uses stable product UUIDs and accepts either the reviewed current `KIMCHI-*` slug or reviewed new ADG slug.

## Write Effects

- Backs up affected `products` rows.
- Backs up existing `product_images` for the affected products.
- Demotes existing product images by setting `is_primary=false` and adding `1000` to `priority`.
- Inserts owner images: first image per product as `LISTING/is_primary=true/priority=0`, additional images as `GALLERY`.
- Updates `products.image_url` and `products.images.desktop/thumbnail` to the first owner image.

## First 25 Planned Rows

| target_sku | current_slug | image_file | order | target_product_id | target_url |
| --- | --- | --- | ---: | --- | --- |
| ADG-000406 | KIMCHI-2172 | SAU_9282.jpg | 1 | 093cc2e3-6114-4fa8-b3bd-c50948963212 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000406/01-SAU_9282.jpg |
| ADG-000019 | KIMCHI-59 | SAU_9301.jpg | 1 | 7b815bb4-d6c3-40db-bb53-a1f64b4c6dee | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000019/01-SAU_9301.jpg |
| ADG-000055 | KIMCHI-191 | SAU_9579.jpg | 1 | da4e62d4-0ca7-4074-ab18-f3ce75df5d85 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000055/01-SAU_9579.jpg |
| ADG-000054 | KIMCHI-190 | SAU_9580.jpg | 1 | 02fe4e19-1af4-4171-8703-27d8e35a9ed5 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000054/01-SAU_9580.jpg |
| ADG-000056 | KIMCHI-192 | SAU_9587.jpg | 1 | dfbd5ffe-4745-4f6e-92de-ffe2aecc2c5a | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000056/01-SAU_9587.jpg |
| ADG-000058 | KIMCHI-194 | SAU_9591.jpg | 1 | d83b9620-c45e-4949-a7e4-6b964a283c99 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000058/01-SAU_9591.jpg |
| ADG-000498 | KIMCHI-2537 | SAU_9602.jpg | 1 | c97ddfb0-2ba9-4c58-beca-71caffda254b | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000498/01-SAU_9602.jpg |
| ADG-000499 | KIMCHI-2538 | SAU_9608.jpg | 1 | ac5f717d-5b27-4bcc-9471-f51b046b47c3 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000499/01-SAU_9608.jpg |
| ADG-000506 | KIMCHI-2578 | SAU_9612.jpg | 1 | dda2f6bc-84b6-4ecb-afe1-e3c4d36882fd | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000506/01-SAU_9612.jpg |
| ADG-000507 | KIMCHI-2579 | SAU_9613.jpg | 1 | c9fb3005-1b8c-440e-8390-122b1c88a26a | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000507/01-SAU_9613.jpg |
| ADG-000302 | KIMCHI-1217 | SAU_9631.jpg | 1 | 42af6909-eeae-4777-89ab-4351769f12e6 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000302/01-SAU_9631.jpg |
| ADG-000302 | KIMCHI-1217 | SAU_9632.jpg | 2 | 42af6909-eeae-4777-89ab-4351769f12e6 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000302/02-SAU_9632.jpg |
| ADG-000095 | KIMCHI-354 | SAU_9646.jpg | 1 | cad06094-f283-4097-a19f-a4f857ed0e66 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000095/01-SAU_9646.jpg |
| ADG-000691 | KIMCHI-3264 | SAU_9653.jpg | 1 | 17b738bf-f3fd-4e61-8d94-a52f1d279bdf | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000691/01-SAU_9653.jpg |
| ADG-000082 | KIMCHI-301 | SAU_9655.jpg | 1 | 2da0ffb1-645f-4aff-be6d-89e8814d0c99 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000082/01-SAU_9655.jpg |
| ADG-000195 | KIMCHI-811 | SAU_9748.jpg | 1 | e3b70c6c-5b9f-4081-8918-94df3c9e621f | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000195/01-SAU_9748.jpg |
| ADG-000052 | KIMCHI-183 | SAU_9749.jpg | 1 | 287915de-af7b-43a0-b9da-aff6835edddd | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000052/01-SAU_9749.jpg |
| ADG-000210 | KIMCHI-861 | SAU_9759.jpg | 1 | 53be2a53-534e-40d5-aec7-5a5a9caa1973 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000210/01-SAU_9759.jpg |
| ADG-000202 | KIMCHI-840 | SAU_9763.jpg | 1 | 981fc95c-4f7d-4109-a85b-3a660ef90156 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000202/01-SAU_9763.jpg |
| ADG-000114 | KIMCHI-424 | SAU_9779.jpg | 1 | eee329a6-9d3a-4969-b877-f1b10871b978 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000114/01-SAU_9779.jpg |
| ADG-000114 | KIMCHI-424 | SAU_9780.jpg | 2 | eee329a6-9d3a-4969-b877-f1b10871b978 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000114/02-SAU_9780.jpg |
| ADG-000114 | KIMCHI-424 | SAU_9781.jpg | 3 | eee329a6-9d3a-4969-b877-f1b10871b978 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000114/03-SAU_9781.jpg |
| ADG-000275 | KIMCHI-1141 | SAU_9785.jpg | 1 | 6c088eb6-5a2c-4ebc-9c53-77b060bad412 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000275/01-SAU_9785.jpg |
| ADG-000907 | KIMCHI-4135 | SAU_9787.jpg | 1 | fac463d0-6e72-4a76-8c2f-4f5c2b7e5e9a | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000907/01-SAU_9787.jpg |
| ADG-000272 | KIMCHI-1137 | SAU_9790.jpg | 1 | f2d4144a-7e0e-443e-bfac-703313735954 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000272/01-SAU_9790.jpg |
