# Asia Deli Go catalog metadata batch 4 production apply — 2026-07-22

## Authorization and artifact identity

- Owner authorization: `ok tiếp` / `tiếp tục đi` in the active catalog-cleanup conversation.
- Source commit on `origin/main`: `a61f21feee145b6d9dfb2ab7daed0be6cba9dc30`.
- Batch: `asiandeligo-catalog-metadata-batch4-20260722-v1`.
- Decision SHA-256: `2025ae4440ca3468156b4c7430db77ee4f41c2f7e77ad48cb3cc7e4c34709595`.
- Apply SQL SHA-256: `d9e7fa68369aa09da41bc7c7c1a069f4a3077e05cec82d242a666761c3ef0da1`.
- Rollback SQL SHA-256: `47c1b47db274b6ce11cf1dfc93b4a3fd6e48c0fb39fc35fc5ae5350ce80c5a1a`.

The generic SQL-write helper was not used because this is a reviewed
multi-statement transaction with persistent backup/audit DDL, exact timestamp
guards, and a separate stale-safe rollback. Production received the
byte-identical committed apply SQL through `psql` stdin. No source transfer,
package operation, application build, or service restart ran on Contabo.

## Final preflight

Immediately before execution:

- the clean feature commit was a one-commit fast-forward of fetched
  `origin/main`, and both refs pointed to `a61f21f`;
- local and committed decision, apply, and rollback artifacts matched the
  hashes above;
- all 23 product/variant identities, metadata snapshots, status values,
  categories, prices/units, stock values, and `updated_at` guards matched;
- exactly one active `asiandeligo` channel, the enabled monotonic product
  timestamp trigger, and the declared product/variant/category foreign keys
  existed;
- product/category joins were tenant-safe with zero orphans;
- both batch-4 backup/audit relations were absent.

## Execution

- Committed at approximately `2026-07-22 10:56:06 UTC`.
- PostgreSQL transaction ID: `7049910`.
- Result: `COMMIT` with exactly 23 persistent product backups and 23 exact
  product updates.
- Exactly the approved 23 `products` rows were changed; zero
  `product_variants` and zero `categories` rows were written.

## Exact applied scope

- Reviewed: 25 exact SKUs, deterministic priority-cohort ranks 76–100.
- Applied: 23 products / 34 metadata field transitions.
- Held without mutation: `ADG-000040` and `ADG-000129`.
- Field counts: three direct-allergen lists, three trace declarations, 20
  storage zones, one nutrition panel, six countries of origin, and one
  ingredient list.
- Price, unit price, category, name, slug, publication state, stock, variants,
  and category rows were unchanged.
- All 23 guarded variant quantities remained exactly `100`.

The conservative source gate removed allergen or nutrition proposals from
`ADG-000274`, `ADG-000816`, and `ADG-001046` because current label generations
conflict and production lacks enough exact identity evidence. Those rows only
received the well-supported `AMBIENT` storage value. The superseded artifact
was never committed or applied to production.

## Post-apply verification

- Backup contains exactly 23 distinct tenant/channel/SHA-scoped rows, 23
  linked timestamps, and 34 declared field changes.
- Audit contains one `backup_captured` and one `apply_complete` event, both in
  transaction `7049910`; there is no rollback event.
- Database status, stock, price/unit, category, identity, and timestamp-link
  invariants each match 23/23; neither hold SKU appears in backup.
- Direct storefront GraphQL and the public GraphQL proxy each returned the
  complete 1,779-product catalog and exact metadata, category, and stock `100`
  for 23/23 applied products.
- All 25 cohort PDPs plus storefront, health, login, and mail-inbox routes
  returned HTTP 200 (29/29).
- All 18 PM2 processes remained online and no process was restarted.

## Catalog impact and next cohort

A fresh read-only audit of all 1,779 published products found:

- missing storage zone reduced from 544 to 524;
- missing nutrition panel reduced from 309 to 308;
- missing country of origin reduced from 81 to 76;
- products without a positive allergen declaration reduced from 782 to 781;
- 184 products still lack ingredients;
- 1,762 variants remain at placeholder stock `100`.

Catalog cleanup is not complete. The next safe unit is deterministic cohort
ranks 101–125, again with exact-pack research, independent review, and guarded
SQL. Placeholder stock remains intentionally outside this metadata workflow.

## Recovery state

Persistent backup and audit tables are intentionally retained:

- `asiandeligo_catalog_metadata_batch4_product_backup_20260722`
- `asiandeligo_catalog_metadata_batch4_audit_20260722`

The committed rollback passed happy-path, duplicate, stale-row,
intervening-edit, and tampered-backup rehearsals but was not executed on
production. Any future rollback is a separate owner-approved operation and
refuses changed product or backup state.
