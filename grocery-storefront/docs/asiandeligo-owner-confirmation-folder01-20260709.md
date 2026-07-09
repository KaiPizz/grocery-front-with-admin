# Asia Deli Go Owner Confirmation Sheet - Folder 01

Generated: 2026-07-09
Source folder: `winpc:C:\co_Hanh\images\quảng cáo deli-20201024T132054Z-001`
Reviewed image coverage: 289 / 289 files

## Files

- Main CSV for owner review: `grocery-storefront/docs/asiandeligo-owner-confirmation-folder01-20260709.csv`
- Source audit reports:
  - `grocery-storefront/docs/asiandeligo-owner-image-match-batch-001-20260708.md`
  - `grocery-storefront/docs/asiandeligo-owner-image-match-batch-002-20260708.md`
  - `grocery-storefront/docs/asiandeligo-owner-image-match-folder01-batch003-20260709.md`
  - `grocery-storefront/docs/asiandeligo-owner-image-match-folder01-batch004-20260709.md`
  - `grocery-storefront/docs/asiandeligo-owner-image-match-folder01-batch005-20260709.md`
  - `grocery-storefront/docs/asiandeligo-owner-image-match-folder01-batch006-20260709.md`

## CSV Buckets

| Bucket | Rows | Meaning |
| --- | ---: | --- |
| `review_high_existing_sku` | 36 | Strong candidate mappings to an existing ADG SKU. These are still owner-review rows so we can measure false positives. |
| `needs_owner_confirmation` | 36 | Candidate mapping or use case is plausible, but brand/size/variant or usage needs confirmation. |
| `new_product_candidate` | 142 | Owner product photo appears real, but no exact current catalog row was found or the scraped row differs by size/brand. |
| `marketing_asset` | 3 | Grouped rows of lifestyle/category/recipe images. Do not map as product packshots. |
| `store_gallery` | 1 | Grouped store/interior photos for homepage/about/store gallery. |

Total CSV rows: 218

## Columns To Fill

Use these values in `owner_decision`:

- `approve` - mapping/use is correct.
- `reject` - mapping/use is wrong.
- `create_new` - this is a real product that should become a new product row.
- `ignore` - do not use this image/product for launch.
- `marketing` - use as banner/category/recipe/store-gallery content, not as a product image.

Optional owner columns:

- `owner_correct_product` - fill the correct product name/SKU if the suggested mapping is wrong.
- `owner_notes` - size, variant, launch priority, alcohol/compliance note, or any extra detail.

## Review Order

1. Review `review_high_existing_sku` first.
   - This gives a fast error-rate sample for my matching assumptions.
   - If these are mostly correct, we can safely speed up later folders.

2. Review `needs_owner_confirmation` second.
   - These are mostly variant/size/brand questions.
   - Important examples: Kikkoman 1L variant, Haechandle vs CJO Ssamjang, Sempio glass noodle size, fresh udon brand, bamboo mat size.

3. Review `new_product_candidate` third.
   - These are likely real store products absent from the scraped Kimchi catalog.
   - Mark `create_new` only for products intended for launch.

4. Review `marketing_asset` and `store_gallery` last.
   - These are not SKU packshots, but can improve homepage/category/recipe sections.

## Important Notes

- The CSV is candidate-level, not one row per photo. Some rows contain multiple gallery files for one product.
- No DB/product/media changes were applied from this sheet.
- Alcohol rows are present in `new_product_candidate`, but should not be listed until the business decides age-gating, delivery restrictions, and compliance policy.
- Several LaMi/Hiep Long noodle packs are similar but not interchangeable. Do not reuse `ADG-000013` images for LaMi Bun Ha Noi Size S/M/L unless the owner explicitly approves a product merge.
- Green Pagoda mun mushroom rows look like valid product matches, but English metadata currently says shiitake. Fix English copy before broad English publishing.

## Next Step After Owner Review

After owner decisions are filled, generate an import plan:

- approved existing SKU media mappings
- new product creation rows
- catalog copy corrections
- marketing/gallery asset assignments
- products to ignore for launch
