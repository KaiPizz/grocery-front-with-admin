# Asia Deli Go Folder14 Draft Quality Audit

Generated: 2026-07-13T13:46:19.819Z

## Result

- Audited draft products: 53
- Structurally complete in production: 53 products, 53 variants, 53 primary images, 106 translations
- Safe automatic content updates prepared: 52
- Rows still held for owner confirmation: 0
- Confirmed duplicate merges handed to the dedicated merge plan: 1
- Category corrections prepared: 2
- Confirmed brand fills prepared: 16
- Extra owner-selected gallery images checked and staged: 11
- Primary image visual review: 53/53 usable; no hand/person obstruction found.
- Extra gallery image visual review: 11/11 usable; no hand/person obstruction found.
- Production mutation in this step: none.

## Safety

- All 53 products remain draft, unpublished, and not for sale.
- Price, EAN, and country of origin remain pending for all 53 products.
- Food label details remain pending for ADG-001834, ADG-001835, and ADG-001836.
- This quality SQL plan changes 52 `update_content` rows. The confirmed duplicate merge is handled by a separate guarded plan.

## Resolved Merge

| Duplicate SKU | Keep SKU | Resolution |
| --- | --- | --- |
| ADG-001811 | ADG-001803 | Właściciel potwierdził scalenie; zdjęcie zostanie przeniesione do produktu docelowego |

## Category Corrections

| SKU | From | To |
| --- | --- | --- |
| ADG-001801 | patelnie-wok-grill | naczynia |
| ADG-001823 | naczynia | pałeczki-i-sztućce |

## Generated Artifacts

- Resolved owner actions: `docs/asiandeligo-folder14-draft-resolved-actions-20260713.csv`
- Gallery upload manifest: `docs/asiandeligo-folder14-gallery-upload-manifest-20260713.csv`
- Guarded SQL apply plan: `docs/asiandeligo-folder14-draft-quality-apply-20260713.sql`
- Rollback SQL: `docs/asiandeligo-folder14-draft-quality-rollback-20260713.sql`
- Structured audit: `docs/asiandeligo-folder14-draft-quality-audit-20260713.json`

## Schema Assumptions

1. `product_variants.template_id = products.id` uses UUIDs and a declared FK; sampled matches are valid.
2. `product_images.template_id` and `product_translations.template_id` both reference `products.id`; every table is salon-scoped.
3. Products and variants exclude soft-deleted rows; all 53 current products are verified `draft` and unpublished.
