# Asia Deli Go Media Path Migration Dry Run

Generated: 2026-07-08T12:39:16.456Z

## Summary

- Field rows inspected: 3957
- Unique source URLs: 2173
- Unique target URLs: 2173
- Products covered: 1784
- Product image rows covered: 2173
- Target collisions across unique source URLs: 0
- Rows with notes: 0
- HTTP checked: yes
- Source HTTP OK: 3957
- Source HTTP failed: 0

## What This Does Not Do

- It does not copy media files.
- It does not update DB rows.
- It does not make legacy scraped images licensed or original.

## First 25 Mappings

| field | ADG code | source | target |
| --- | --- | --- | --- |
| products:52b64270-4fda-4dd4-a73e-4afa081a651e:image_url | ADG-000001 | https://img.zira.pl/asiandeligo/products/KIMCHI-7/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000001/1.webp |
| product_images:98a9ca2b-88bd-4de8-9313-911baabd6996:image_large_url | ADG-000001 | https://img.zira.pl/asiandeligo/products/KIMCHI-7/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000001/1.webp |
| products:ee7cf8bc-0e9d-4e95-980b-ca780f9856f5:image_url | ADG-000002 | https://img.zira.pl/asiandeligo/products/KIMCHI-10/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000002/1.webp |
| product_images:c8dc071c-9a38-465e-aa7f-cfc7c15779f2:image_large_url | ADG-000002 | https://img.zira.pl/asiandeligo/products/KIMCHI-10/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000002/1.webp |
| products:6a24dfed-39ae-4c6d-9393-9b0eed738f5b:image_url | ADG-000003 | https://img.zira.pl/asiandeligo/products/KIMCHI-12/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000003/1.webp |
| product_images:814eb54e-32d6-4190-a55f-fd77cf02cbde:image_large_url | ADG-000003 | https://img.zira.pl/asiandeligo/products/KIMCHI-12/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000003/1.webp |
| products:25a2c3c5-267e-41f7-9a00-a66d22c9407a:image_url | ADG-000004 | https://img.zira.pl/asiandeligo/products/KIMCHI-14/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000004/1.webp |
| product_images:d717123f-3125-4901-81b0-77a49e150d66:image_large_url | ADG-000004 | https://img.zira.pl/asiandeligo/products/KIMCHI-14/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000004/1.webp |
| products:68d2a6ce-084e-4d36-89dc-b3f1b09b08c5:image_url | ADG-000005 | https://img.zira.pl/asiandeligo/products/KIMCHI-15/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000005/1.webp |
| product_images:106d2a24-21e3-4fa7-ba34-e8c32ad7edaa:image_large_url | ADG-000005 | https://img.zira.pl/asiandeligo/products/KIMCHI-15/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000005/1.webp |
| products:c0db8c63-43cc-4dcb-a508-91c5ab7f76ac:image_url | ADG-000006 | https://img.zira.pl/asiandeligo/products/KIMCHI-20/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000006/1.webp |
| product_images:4b098e02-cf66-4e30-bd89-b0a8bd95a62b:image_large_url | ADG-000006 | https://img.zira.pl/asiandeligo/products/KIMCHI-20/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000006/1.webp |
| product_images:b0edef3f-19cf-4b81-a955-8ba9d02e8c47:image_large_url | ADG-000006 | https://img.zira.pl/asiandeligo/products/KIMCHI-20/2.webp | https://img.zira.pl/asiandeligo/products/ADG-000006/2.webp |
| products:5e998261-e707-4402-8569-8108eaaa3fea:image_url | ADG-000007 | https://img.zira.pl/asiandeligo/products/KIMCHI-22/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000007/1.webp |
| product_images:c903ff6f-98c0-4fba-8225-a9f4e141b224:image_large_url | ADG-000007 | https://img.zira.pl/asiandeligo/products/KIMCHI-22/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000007/1.webp |
| products:b9955ac8-56d2-4189-aa41-c4049e72cd08:image_url | ADG-000008 | https://img.zira.pl/asiandeligo/products/KIMCHI-24/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000008/1.webp |
| product_images:1df944d9-1675-4fe3-b9c6-4bcc51921a14:image_large_url | ADG-000008 | https://img.zira.pl/asiandeligo/products/KIMCHI-24/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000008/1.webp |
| products:0771cceb-b817-4c21-917d-00950847e95a:image_url | ADG-000009 | https://img.zira.pl/asiandeligo/products/KIMCHI-27/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000009/1.webp |
| product_images:24101da7-d430-4e48-aba4-edadcbd5ac87:image_large_url | ADG-000009 | https://img.zira.pl/asiandeligo/products/KIMCHI-27/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000009/1.webp |
| products:5797bd74-d97b-4432-973e-38cd1701a3be:image_url | ADG-000010 | https://img.zira.pl/asiandeligo/products/KIMCHI-29/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000010/1.webp |
| product_images:3f07d34d-d473-4802-bac3-0cb966de4ad5:image_large_url | ADG-000010 | https://img.zira.pl/asiandeligo/products/KIMCHI-29/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000010/1.webp |
| products:e4e1e936-ba74-4c40-a06a-ce9630d9fbca:image_url | ADG-000011 | https://img.zira.pl/asiandeligo/products/KIMCHI-31/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000011/1.webp |
| product_images:e90ad978-4ed7-4044-b55d-12ec96372e53:image_large_url | ADG-000011 | https://img.zira.pl/asiandeligo/products/KIMCHI-31/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000011/1.webp |
| products:557bf303-22f4-415e-8d0a-daa0ab29dfdd:image_url | ADG-000012 | https://img.zira.pl/asiandeligo/products/KIMCHI-35/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000012/1.webp |
| product_images:5c9909a6-6776-4672-b51a-80ca160291cf:image_large_url | ADG-000012 | https://img.zira.pl/asiandeligo/products/KIMCHI-35/1.webp | https://img.zira.pl/asiandeligo/products/ADG-000012/1.webp |

## Next Apply Phase

- Copy each unique source URL to the target ADG URL/object key.
- Verify target URLs return 200 and expected image content type.
- Update `products.image_url` and `product_images.image_large_url` in a transaction with backup tables.
- Keep legacy image URL in metadata or backup report for rollback.
- Mark these images as `legacy_scraped_rehosted` until replaced by owner/supplier images.
