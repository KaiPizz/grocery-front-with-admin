# Asia Deli Go New Product Creation Apply - Folder 01 Review 2

Generated: 2026-07-09

## Scope

Applied the folder01 review2 create-new plan to the local/build eNail PostgreSQL database.

This was not a Contabo production deploy.

## Pricing Note

Per user direction, real retail prices are deferred to the final owner/admin phase. Missing prices should not block finishing the web/catalog cleanup.

The created products are intentionally safe:

- `products.status = draft`
- `products.is_published = false`
- `product_variants.is_for_sale = false`
- `products.retail_price = 0`
- `product_variants.retail_price = 0`
- metadata marks `price_pending = true`

The owner/admin can fill real prices later, then publish products when ready.

## Media Upload

Uploaded 7 owner images to Cloudflare R2 under:

- `s3://zira/asiandeligo/owner-images/folder01/`

Public URL verification passed:

- `ADG-001785` - `200 image/jpeg`
- `ADG-001786` - `200 image/jpeg`
- `ADG-001787` - `200 image/jpeg`
- `ADG-001788` - `200 image/jpeg`
- `ADG-001789` - `200 image/jpeg`
- `ADG-001790` - `200 image/jpeg`
- `ADG-001791` - `200 image/jpeg`

## SQL Apply

Applied:

- `docs/asiandeligo-new-product-creation-sql-plan-folder01-review2-20260709.sql`

Before the real apply, the same SQL was validated by replacing `COMMIT` with `ROLLBACK`; the rollback run inserted:

- products: 7
- variants: 7
- images: 7
- translations: 14

Then the real local apply inserted:

- products: 7
- variants: 7
- images: 7
- translations: 14

## Created Draft SKUs

| SKU | Slug | Status | Stock | Price policy |
| --- | --- | --- | ---: | --- |
| `ADG-001785` | `hoang-long-tra-che-nhai-dac-biet-100g` | draft / unpublished / not for sale | 100 | owner price pending |
| `ADG-001786` | `koh-kae-peanuts-coconut-cream-flavour-coated` | draft / unpublished / not for sale | 100 | owner price pending |
| `ADG-001787` | `lee-kum-kee-chicken-marinade-410ml` | draft / unpublished / not for sale | 100 | owner price pending |
| `ADG-001788` | `sen-soy-premium-soy-sauce` | draft / unpublished / not for sale | 100 | owner price pending |
| `ADG-001789` | `megachef-gluten-free-soy-sauce-200ml` | draft / unpublished / not for sale | 100 | owner price pending |
| `ADG-001790` | `megachef-gluten-free-soy-sauce-500ml` | draft / unpublished / not for sale | 100 | owner price pending |
| `ADG-001791` | `megachef-premium-mushroom-sauce-570g` | draft / unpublished / not for sale | 100 | owner price pending |

## Remaining Product Data Gaps

- Real retail prices: deferred.
- `ADG-001785` Hoang Long tea: EAN still needs back-label confirmation.
- `ADG-001788` Sen Soy Premium soy sauce: EAN and exact volume still need back-label confirmation.
- Country/allergen fields should be confirmed from physical labels or supplier data later.

## Next Step

Continue catalog/media cleanup that does not depend on owner pricing: process the next owner-image review batch, import safe existing-SKU images, and keep new products as draft until price review is possible.
