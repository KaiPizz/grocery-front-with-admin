# Asia Deli Go catalog metadata batch 3 production apply — 2026-07-22

## Authorization and artifact identity

- Owner authorization: `ok go` in the active catalog-cleanup conversation.
- Source commit on `origin/main`: `aff47efbd9c8846fcab18bd4001441d16d2da066`.
- Batch: `asiandeligo-catalog-metadata-batch3-20260722-v1`.
- Decision SHA-256: `01e138ed3f76c4871e981bec117a4e1051ba18d3bfdc8566364012c4c46fa00e`.
- Apply SQL SHA-256: `82abd50c275362bedae7c41caf68c682e6ddeaad16b25b861deda84a969a4d7c`.
- Rollback SQL SHA-256: `eb2b7b072a4833c73444a88fffd6551d21aa84fc4240f990f0c74cff5ae9b454`.

The generic SQL-write helper was not used because this is a reviewed
multi-statement transaction with persistent backup/audit DDL, exact timestamp
guards, and a separate stale-safe rollback. Production received the
byte-identical committed apply SQL through `psql` stdin. No source transfer,
package operation, application build, or service restart ran on Contabo.

## Final preflight

Immediately before execution:

- the feature commit was a clean fast-forward of fetched `origin/main` at
  `aff47ef`;
- local and committed decision, apply, and rollback artifacts matched the
  hashes above;
- all 18 product/variant identities, metadata snapshots, status values,
  categories, prices/units, stock values, and `updated_at` guards matched;
- exactly one active `asiandeligo` channel, one enabled monotonic product
  timestamp trigger, and all declared product/variant/category foreign keys
  existed;
- all product and category joins were tenant-safe and had zero orphans;
- both batch-3 backup/audit relations were absent.

## Execution

- Committed at approximately `2026-07-22 09:37:37 UTC`.
- PostgreSQL transaction ID: `7048434`.
- Result: `COMMIT` with exactly 18 persistent product backups and 18 exact
  product updates.
- Exactly the approved 18 `products` rows were changed; zero
  `product_variants` and zero `categories` rows were written.

## Exact applied scope

- Reviewed: 25 exact SKUs, deterministic priority-cohort ranks 51–75.
- Applied: 18 products / 24 metadata field transitions.
- Held without mutation: `ADG-001285`, `ADG-000002`, `ADG-000013`,
  `ADG-000014`, `ADG-000015`, `ADG-000017`, and `ADG-000037`.
- Field counts: 16 storage zones, two nutrition panels, and six countries of
  origin.
- Allergens, may-contain declarations, ingredients, price, unit price,
  category, name, slug, publication state, stock, variants, and category rows
  were unchanged.
- All 18 guarded variant quantities remained exactly `100`.

The seven holds are intentional. Exact-EAN sources conflict for several label
generations, `ADG-000017` has an uncorroborated production EAN, and four rows
were already complete with no safe transition. Independent review specifically
rejected allergen, trace, and nutrition changes for `ADG-000640`; only its
well-supported storage zone and country were changed.

## Post-apply verification

- Backup contains exactly 18 rows for the correct tenant, channel, batch, and
  decision SHA; audit contains one successful backup event and one successful
  apply event in transaction `7048434`, with no rollback event.
- Database values match all 24 targets; timestamp, stock, scope, and status
  invariants each match 18/18.
- Direct storefront GraphQL and the public GraphQL proxy each returned the
  complete 1,779-product catalog and exact metadata, unchanged scope, and stock
  `100` for 18/18 applied products.
- All 25 cohort PDPs plus five storefront/eNail routes returned HTTP 200
  (30/30), including both health endpoints, login, and mail inbox.
- All PM2 processes remained online and no process was restarted.

## Catalog impact and next cohort

A fresh read-only audit of all 1,779 published products found:

- missing storage zone reduced from 560 to 544;
- missing nutrition panel reduced from 310 to 309;
- missing country of origin reduced from 85 to 81;
- 782 products still have no positive allergen declaration;
- 184 products still lack ingredients;
- 1,762 variants remain at placeholder stock `100`.

Catalog cleanup is not complete. The next safe unit is deterministic cohort
ranks 76–100, again with exact-pack research, independent review, and guarded
SQL. Placeholder stock remains intentionally outside this metadata workflow.

## Recovery state

Persistent backup and audit tables are intentionally retained:

- `asiandeligo_catalog_metadata_batch3_product_backup_20260722`
- `asiandeligo_catalog_metadata_batch3_audit_20260722`

The committed rollback passed happy-path, duplicate, stale-row,
intervening-edit, and tampered-backup rehearsals but was not executed on
production. Any future rollback is a separate owner-approved operation and
refuses changed product or backup state.
