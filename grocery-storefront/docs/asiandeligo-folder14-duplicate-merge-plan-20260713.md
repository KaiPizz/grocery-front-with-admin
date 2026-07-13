# Asia Deli Go Folder14 Duplicate Merge Plan

Generated: 2026-07-13T13:31:32.763Z

## Decision

- Keep: `ADG-001803` (Stainless-handle Chinese cleaver, exact model unclear)
- Merge and soft-delete: `ADG-001811` (Stainless-handle Chinese cleaver / kitchen knife)
- Move the duplicate photo into the survivor gallery at priority 1.
- Keep the survivor draft, unpublished, and not for sale because price is pending.

## Media

- Source: `/tmp/asiandeligo-owner-images/folder14-batch002/extracted/PETE8104.JPG`
- Staged R2 object: `asiandeligo/owner-images/folder14/ADG-001803/02-PETE8104.JPG`
- Public URL after upload: `https://img.zira.pl/asiandeligo/owner-images/folder14/ADG-001803/02-PETE8104.JPG`

## Safety

- The duplicate is soft-deleted rather than hard-deleted.
- Product translations remain attached to the soft-deleted duplicate for rollback/audit.
- Rollback restores the duplicate product, variant, and original image mapping.
- Production mutation in this planning step: none.

## Apply Order

1. Upload the staged media object.
2. Apply `docs/asiandeligo-folder14-duplicate-merge-apply-20260713.sql`.
3. Verify 52 active folder14 products and two gallery images on `ADG-001803`.

Rollback SQL: `docs/asiandeligo-folder14-duplicate-merge-rollback-20260713.sql`
