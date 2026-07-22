# Asia Deli Go catalog metadata batch 7 production apply — 2026-07-22

## Authorization and artifact identity

- Owner authorization: `ok tiếp` in the active catalog-cleanup conversation.
- Source commit on `origin/main`:
  `1fe20e776d9bfa71c5badb3d180e7c223e8a3564`.
- Batch: `asiandeligo-catalog-metadata-batch7-20260722-v1`.
- Decision SHA-256:
  `2287c2c57b6758668141ee12ebd1b2e5143e8643c0f80e38259513b24c378a0e`.
- Apply SQL SHA-256:
  `09920d4cc247e0ae5dd3eef94900963fe8c3517520a97537f5b5043da875d46a`.
- Rollback SQL SHA-256:
  `78ce83e7d86524eea6ef5f74469166d49f1b8cdcc5e41e01bb77caeca9a20aaf`.

The generic SQL-write helper was not used because this was a reviewed
multi-statement transaction with persistent backup/audit DDL, exact timestamp
guards, and a separately rehearsed stale-safe rollback. Production received
the exact committed apply SQL through `psql` stdin. No source transfer,
package operation, application build, or service restart ran on Contabo.

## Final preflight

Immediately before execution:

- clean `HEAD` and fetched `origin/main` both pointed to `1fe20e7`;
- regeneration from a fresh production snapshot produced a clean Git diff;
- decision/apply/rollback hashes matched the committed artifacts;
- all 21 transition snapshots and all 25 status identities matched exactly;
- all 21 target variants remained active, for sale, synced, `IN_STOCK`, and
  at stock `100`;
- exactly one active pinned `asiandeligo` channel existed;
- both declared join foreign keys existed and the monotonic product timestamp
  trigger was in ordinary mode (`tgenabled=O`);
- both dated batch-7 backup/audit relations were absent.

## Execution

- Committed at approximately `2026-07-22 13:17:47 UTC`.
- PostgreSQL transaction ID: `7052180`.
- Result: `COMMIT` with exactly 21 persistent product backups and 21 exact
  product updates.
- Exactly the approved 21 `products` rows were changed; zero
  `product_variants` and zero `categories` rows were written.

## Exact applied scope

- Reviewed: 25 exact SKUs, deterministic priority-cohort ranks 151–175.
- Applied: 21 products / 25 metadata field transitions.
- Field counts: 20 storage zones, four allergen arrays, and one country of
  origin.
- Storage impact: 18 missing zones were filled with `AMBIENT`; two values
  inferred from after-opening refrigeration instructions were corrected from
  `CHILLED` to `AMBIENT` for unopened stock.
- Direct allergens added: sulphites on `ADG-000217` and `ADG-001166`; soy on
  `ADG-000793` and `ADG-001571`.
- Country added: `Japonia` on exact-GTIN `ADG-001105`.
- Held without mutation: `ADG-001460`, `ADG-000606`, `ADG-000020`, and
  `ADG-000035`.
- May-contain declarations, nutrition, ingredients, price, unit price,
  category, name, slug, publication state, stock, variants, and category rows
  were unchanged.

Evidence review retained only exact-product or cross-label-invariant values.
It held the Harim Samgyetang identity conflict, the curated Koszyk Wioli
basket, no-op products, variable cross-contact declarations, and conflicting
nutrition generations instead of merging metadata across packs. All applied
transitions retain at least two substantively independent sources.

## Post-apply verification

- Backup contains exactly 21 distinct tenant/channel/SHA-scoped rows, 21
  linked timestamps, and 25 declared field changes.
- Audit contains one `backup_captured` and one `apply_complete` event, both in
  transaction `7052180`; there is no rollback event.
- Exact targets matched 20/20 storage values, 4/4 allergen arrays, and 1/1
  country value.
- Database identity, category, price/unit, unchanged-field, status, stock, and
  timestamp-link invariants matched 21/21; none of the four hold SKUs appears
  in backup.
- Direct storefront GraphQL and the public GraphQL proxy each returned all
  1,779 products and exact target metadata/category/stock for 21/21 applied
  products. Their normalized full-catalog payloads matched; their generated
  catalog-audit CSV files were byte-identical.
- All 25 cohort PDPs plus storefront, health, login, and mail-inbox routes
  returned HTTP 200 (29/29).
- All 18 PM2 processes remained online. No process was restarted.

## Catalog impact and next cohort

A fresh read-only audit of all 1,779 published products and 70 categories
found:

- missing storage zone reduced from 495 to 477;
- missing nutrition panel remained 307;
- missing country of origin reduced from 73 to 72;
- missing positive allergen declaration reduced from 780 to 776;
- missing ingredients remained 184;
- 1,762 variants remain at placeholder stock `100`.

Catalog cleanup is not complete. The next deterministic metadata unit is
priority-cohort ranks 176–200. Placeholder stock and the Koszyk Wioli bundle
classification/exclusion remain separate operational workflows.

## Recovery state

Persistent backup and audit tables are intentionally retained:

- `asiandeligo_catalog_metadata_batch7_product_backup_20260722`
- `asiandeligo_catalog_metadata_batch7_audit_20260722`

The committed rollback passed happy-path, duplicate, stale-row,
intervening-edit, and tampered-backup rehearsals but was not executed on
production. Any future rollback is a separate owner-approved operation and
refuses changed product or backup state.
