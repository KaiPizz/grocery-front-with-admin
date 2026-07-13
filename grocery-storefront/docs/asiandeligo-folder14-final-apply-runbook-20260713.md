# Asia Deli Go Folder14 Final Draft Cleanup Runbook

Generated: 2026-07-13

## Scope

- Clean Polish/English names, slugs, brands, and two categories for 52 retained drafts.
- Add 11 owner-selected gallery images.
- Merge duplicate `ADG-001811` into survivor `ADG-001803`.
- Move the duplicate photo into the survivor gallery.
- Keep every retained product draft, unpublished, and not for sale while prices are pending.

## Apply Order

1. Upload all 12 files staged under `/tmp/asiandeligo-folder14-draft-quality-20260713/r2/` to their exact R2 object keys.
2. Verify all 12 new public media URLs return `200 image/jpeg`.
3. Apply `docs/asiandeligo-folder14-draft-quality-apply-20260713.sql`.
4. Apply `docs/asiandeligo-folder14-duplicate-merge-apply-20260713.sql`.
5. Run the post-apply checks below.

No application build or PM2 restart is required.

## Expected Result

- Active folder14 products: 52
- Active folder14 variants: 52
- Retained products cleaned: 52
- Active-product image rows: 64
- Active-product translations: 104
- `ADG-001803` gallery images: 2
- `ADG-001811`: soft-deleted product and variant
- Unsafe visibility rows: 0

## Rollback Order

1. Apply `docs/asiandeligo-folder14-duplicate-merge-rollback-20260713.sql`.
2. Apply `docs/asiandeligo-folder14-draft-quality-rollback-20260713.sql`.
3. Re-verify 53 active folder14 products, 53 variants, 53 image rows, and 106 translations.
4. Remove the 12 newly uploaded R2 objects only after database rollback is verified.

## Monitor

- Production DB counts and visibility guards for batch `asiandeligo-new-products-folder14-20260713`.
- `https://zira-ai.com/api/v1/health`
- `https://asiandeligo-admin.eshoper.pro/api/health`
- `https://asiandeligo.eshoper.pro`
- Twelve new `https://img.zira.pl/asiandeligo/owner-images/folder14/...` media URLs.

## Tested

- Quality apply SQL: transaction dry-run passed and rolled back.
- Duplicate merge SQL: transaction dry-run passed and rolled back.
- Combined apply sequence: passed and rolled back.
- Combined apply plus reverse rollback sequence: passed and rolled back.
- Production remained unchanged after all tests.
