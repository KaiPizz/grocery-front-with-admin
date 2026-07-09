# Asia Deli Go Owner Image Import Dry Run - Folder 01

Generated: 2026-07-09T10:07:55.723Z

## Summary

- Manifest rows inspected: 52
- Ready rows staged: 52
- Unique products covered: 41
- Source images found: 52
- Source images missing: 0
- Duplicate target keys: 0
- Rows with notes: 0
- Staging copy enabled: yes
- Staging directory: /tmp/asiandeligo-owner-image-import-dry-run-folder01-20260709
- Media base URL: https://img.zira.pl/asiandeligo

## What This Does Not Do

- It does not write the database.
- It does not upload files to production media storage.
- It does not deploy storefront/admin changes.
- It does not process the hold queue.

## DB Apply Contract For Later

- For each `target_sku`, attach rows to `product_images` in `image_order_for_sku` order.
- Use the first image per `target_sku` as candidate `products.image_url` primary image.
- Preserve `review_id`, `owner_notes`, source SHA256, and old image URLs in a backup/audit table before write.
- Run schema introspection and a guarded SQL write plan before any real DB mutation.

## First 25 Staged Rows

| target_sku | image_file | order | target_url | width | height | notes |
| --- | --- | ---: | --- | ---: | ---: | --- |
| ADG-000406 | SAU_9282.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000406/01-SAU_9282.jpg | 2048 | 1365 |  |
| ADG-000019 | SAU_9301.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000019/01-SAU_9301.jpg | 2048 | 1365 |  |
| ADG-000055 | SAU_9579.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000055/01-SAU_9579.jpg | 2048 | 1365 |  |
| ADG-000054 | SAU_9580.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000054/01-SAU_9580.jpg | 2048 | 1620 |  |
| ADG-000056 | SAU_9587.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000056/01-SAU_9587.jpg | 2048 | 1455 |  |
| ADG-000058 | SAU_9591.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000058/01-SAU_9591.jpg | 2048 | 1516 |  |
| ADG-000498 | SAU_9602.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000498/01-SAU_9602.jpg | 2048 | 1365 |  |
| ADG-000499 | SAU_9608.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000499/01-SAU_9608.jpg | 2048 | 1365 |  |
| ADG-000506 | SAU_9612.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000506/01-SAU_9612.jpg | 2048 | 1444 |  |
| ADG-000507 | SAU_9613.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000507/01-SAU_9613.jpg | 2048 | 1365 |  |
| ADG-000302 | SAU_9631.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000302/01-SAU_9631.jpg | 1365 | 2048 |  |
| ADG-000302 | SAU_9632.jpg | 2 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000302/02-SAU_9632.jpg | 1365 | 2048 |  |
| ADG-000095 | SAU_9646.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000095/01-SAU_9646.jpg | 1250 | 2048 |  |
| ADG-000691 | SAU_9653.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000691/01-SAU_9653.jpg | 1425 | 2048 |  |
| ADG-000082 | SAU_9655.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000082/01-SAU_9655.jpg | 1365 | 2048 |  |
| ADG-000195 | SAU_9748.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000195/01-SAU_9748.jpg | 1365 | 2048 |  |
| ADG-000052 | SAU_9749.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000052/01-SAU_9749.jpg | 1365 | 2048 |  |
| ADG-000210 | SAU_9759.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000210/01-SAU_9759.jpg | 1365 | 2048 |  |
| ADG-000202 | SAU_9763.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000202/01-SAU_9763.jpg | 1365 | 2048 |  |
| ADG-000114 | SAU_9779.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000114/01-SAU_9779.jpg | 2048 | 1410 |  |
| ADG-000114 | SAU_9780.jpg | 2 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000114/02-SAU_9780.jpg | 2048 | 1334 |  |
| ADG-000114 | SAU_9781.jpg | 3 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000114/03-SAU_9781.jpg | 2048 | 1396 |  |
| ADG-000275 | SAU_9785.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000275/01-SAU_9785.jpg | 1365 | 2048 |  |
| ADG-000907 | SAU_9787.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000907/01-SAU_9787.jpg | 1365 | 2048 |  |
| ADG-000272 | SAU_9790.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000272/01-SAU_9790.jpg | 1365 | 2048 |  |
