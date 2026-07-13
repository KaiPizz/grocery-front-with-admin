# Asia Deli Go New Product Creation Apply - Folder 14

Generated: 2026-07-13

## Scope

Applied the owner-approved folder14 create-new plan to the Contabo production
PostgreSQL database for the active Asia Deli Go channel.

No app build or PM2 restart was run.

## Target

- Channel slug: `asiandeligo`
- Batch: `asiandeligo-new-products-folder14-20260713`
- Draft SKU range: `ADG-001792` to `ADG-001844`

## Safety Policy

The created products are intentionally safe until the owner/admin finishes price
review:

- `products.status = draft`
- `products.is_published = false`
- `product_variants.is_for_sale = false`
- `products.retail_price = 0`
- `product_variants.retail_price = 0`
- `product_variants.total_stock = 100`
- metadata marks `price_pending = true`

EAN gaps remain blank until they are confirmed from product labels, owner data,
or reliable product sources.

## Preflight

- Production channel check: only `asiandeligo` is active for Asia Deli Go.
- Category resolution: `13/13` source categories resolved.
- Duplicate guards before apply:
  - existing SKUs: `0`
  - existing slugs: `0`
  - existing EANs: `0`
  - existing image URLs: `0`
  - existing image hashes: `0`
- Schema/FK/index checks passed for `channels`, `categories`, `products`,
  `product_variants`, `product_images`, and `product_translations`.
- Rollback-test run inserted `53` products, `53` variants, `53` images, and
  `106` translations, then rolled back successfully.

## Media Upload

Uploaded `53` owner images to Cloudflare R2 under:

- `s3://zira/asiandeligo/owner-images/folder14/`

Public URL verification passed:

- `53/53` target URLs returned `200 image/jpeg`.

## SQL Apply

Applied:

- `docs/asiandeligo-new-product-creation-sql-plan-folder14-20260713.sql`

The production transaction inserted:

- products: `53`
- variants: `53`
- images: `53`
- translations: `106`

## Production Verification

- Batch DB counts: `53` products, `53` variants, `53` images, `106`
  translations.
- Visibility policy: all `53` products are draft, unpublished, and not for
  sale.
- Media URL check after apply: `53/53` returned `200 image/jpeg`.
- `https://zira-ai.com/api/v1/health` returned `200`.
- `https://asiandeligo.eshoper.pro` returned `200`.
- `https://asiandeligo.eshoper.pro/products` returned `200`.
- `https://asiandeligo-admin.eshoper.pro/api/health` returned `200`.

## Rollback

Rollback SQL is available at:

- `docs/asiandeligo-new-product-creation-rollback-folder14-20260713.sql`

Use it only before these draft products have orders or manual admin edits.
