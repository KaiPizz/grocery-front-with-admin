# Asia Deli Go Media Cleanup Scope

Generated: 2026-07-08
Channel: asiandeligo

## Current Media Audit

- `products.image_url`: 1784 / 1784 active products contain `products/KIMCHI-*`.
- `product_images`: 2173 / 2173 image rows contain `products/KIMCHI-*` in `image_large_url`.
- `product_images.url_small`, `url_thumbnail`, `url_micro`: 0 rows contain `KIMCHI-*`.
- `product_variants`: 0 active variants contain `KIMCHI-*` in media fields.
- `product_images.r2_keys`: empty for sampled rows; `r2_synced = false`.
- Current public URL pattern: `https://img.zira.pl/asiandeligo/products/KIMCHI-7/1.webp`.

## Important Distinction

Path migration and image rights cleanup are different tasks.

- Path migration changes visible URLs from `KIMCHI-*` to `ADG-*`.
- Re-hosting the same image under an `ADG-*` path does not make the image licensed or original.
- Image rights cleanup means replacing uncertain scraped images with owned photos, supplier/brand assets with permission, or intentionally blank/placeholder images.

## Recommended Image Source Priority

1. Owner-provided or store-shot product photos.
2. Supplier/importer/manufacturer packshots where usage permission is confirmed.
3. Brand media kits or official product images with documented permission.
4. AI-generated images only for category banners, hero banners, and generic editorial visuals.
5. Placeholder/no-image state for products without a trusted image source.

Do not use AI-generated exact product packaging as the main product image. It can misrepresent packaging, ingredients, size, or legal label details.

## Owner Photo Matching Workflow

Owner photos can be matched even without a provided mapping:

1. Import all owner images into a staging folder.
2. Extract OCR text, visible brand, package size, and barcode/EAN if present.
3. Match against catalog fields: product name, brand, size/weight, category, ADG code, and future EAN.
4. Assign confidence buckets:
   - `auto_match`: high confidence, one clear product candidate.
   - `needs_review`: plausible match but multiple candidates or weak OCR.
   - `unmatched`: no safe match.
5. Generate a review sheet with image thumbnail, proposed ADG product, score, reason, and approve/reject column.
6. Only approved matches should replace product images in production.

## Technical Path Migration Scope

Short-term path cleanup can be done separately from image replacement:

- Copy current CDN/object assets from `products/KIMCHI-*/n.webp` to `products/ADG-000001/n.webp`.
- Update `products.image_url`.
- Update `product_images.image_large_url`.
- Keep old URL in private/backup metadata for rollback.
- Do not update product ownership/legal status from this alone; mark those images as `legacy_scraped_rehosted` until replaced.

## Proposed Canonical Path

Use ADG product code in the public object path:

```text
https://img.zira.pl/asiandeligo/products/ADG-000001/1.webp
```

This keeps the path readable for ops, removes the Kimchi reference, and follows the new product code sequence.

## Next Engineering Step

Create a dry-run media path migration report:

- source URL
- target URL
- product ID
- ADG code
- legacy Kimchi slug
- product image row ID
- image index
- HTTP availability of source image
- proposed DB field updates

No files should be copied and no DB rows should be updated until the dry-run confirms all targets and collisions are safe.
