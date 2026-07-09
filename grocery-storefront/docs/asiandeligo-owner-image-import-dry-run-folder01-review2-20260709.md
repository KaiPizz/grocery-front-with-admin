# Asia Deli Go Owner Image Import Dry Run - Folder 01

Generated: 2026-07-09T13:24:34.646Z

## Summary

- Manifest rows inspected: 3
- Ready rows staged: 3
- Unique products covered: 3
- Source images found: 3
- Source images missing: 0
- Duplicate target keys: 0
- Rows with notes: 0
- Staging copy enabled: yes
- Staging directory: /tmp/asiandeligo-owner-image-import-dry-run-folder01-review2-20260709
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
| ADG-001000 | SAU_9669.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-001000/01-SAU_9669.jpg | 1345 | 2048 |  |
| ADG-000383 | SAU_9682.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000383/01-SAU_9682.jpg | 1365 | 2048 |  |
| ADG-000477 | SAU_9688.jpg | 1 | https://img.zira.pl/asiandeligo/owner-images/folder01/ADG-000477/01-SAU_9688.jpg | 1365 | 2048 |  |
