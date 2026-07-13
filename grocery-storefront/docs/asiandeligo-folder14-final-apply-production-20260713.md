# Asia Deli Go Folder14 Production Apply

Applied: 2026-07-13T13:47Z

## Approval

- Approval: `DEPLOY APPROVED: apply asiandeligo folder14 draft products`
- Rollback requested: duplicate-merge rollback, then draft-quality rollback, then remove the 12 new R2 objects.
- Scope was data-only. No application build, release promotion, PM2 restart, migration, or schema change was performed.

## Applied

- Uploaded 12 verified JPEG objects to R2: 11 additional gallery images and one duplicate-merge image.
- Added `?v=20260713` to the new public media URLs because the pre-upload existence check had populated Cloudflare's negative cache for the canonical paths.
- Applied the quality cleanup and duplicate merge in one PostgreSQL transaction with `ON_ERROR_STOP=1`.
- Updated 52 products, 52 variants, 104 translations, and 52 existing image alt texts.
- Added 11 gallery image rows.
- Moved the `ADG-001811` image to `ADG-001803`, then soft-deleted the duplicate product and variant.
- Source artifact commit: `d8313ca` (`fix: version folder14 media URLs`).

## Production Verification

- Active Folder14 products: 52
- Active variants: 52
- Active-product image rows: 64
- Active-product translations: 104
- Quality-reviewed products/variants: 52/52
- Unsafe published/for-sale rows: 0
- Rows with price other than 0 or stock other than 100: 0
- Blank active image URLs: 0
- Active media GET checks: 64/64
- New media SHA-256 checks: 12/12
- `ADG-001803`: active with two images and `ADG-001811` recorded as merged.
- `ADG-001811`: product and variant soft-deleted; audit translations retained.
- Zira API health: 200; empty login request: 401; Zira login page: 200.
- Asia Deli Go admin health/branding: 200/200.
- Asia Deli Go storefront/products/categories: 200/200/200.
- Backend, admin, and storefront PM2 services remained online.
- New backend 5xx or Folder14-related errors after apply: 0.
- Backend `dist/main.js` hash was unchanged before and after apply.

## Rollback

Run in this order:

1. Apply `docs/asiandeligo-folder14-duplicate-merge-rollback-20260713.sql`.
2. Apply `docs/asiandeligo-folder14-draft-quality-rollback-20260713.sql`.
3. Verify 53 products, 53 variants, 53 images, and 106 translations.
4. Remove the 12 R2 object keys listed in:
   - `docs/asiandeligo-folder14-gallery-upload-manifest-20260713.csv`
   - `docs/asiandeligo-folder14-duplicate-merge-media-20260713.csv`

The full rollback sequence was rehearsed inside a transaction before production apply and restored `53/53/53/106` with zero remaining quality markers.
