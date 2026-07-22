# Asia Deli Go catalog metadata batch 2 production apply — 2026-07-22

## Authorization and artifact identity

- Owner authorization: continue the next catalog-cleanup batch in the active conversation.
- Source commit on `origin/main`: `7f267ddcc5701b659b25221c861f72a53209317d`.
- Batch: `asiandeligo-catalog-metadata-batch2-20260722-v1`.
- Decision SHA-256: `792e0c4277c96bc5a49edcd988b268ea178c0d93176ddfd5d3dd770fe2922732`.
- Apply SQL SHA-256: `8f8696f1bd0f5fd8fcaf5b367666f0d5218fc6a7c2b41aa6841befdfffdc6d45`.
- Rollback SQL SHA-256: `ea421070127b0d22a31444b1cde901f9bac6bdf46cc85758a722f40aad8817bb`.

The generic SQL-write helper was not used because this is a reviewed
multi-statement transaction with persistent backup/audit DDL, exact timestamp
guards, and a separate stale-safe rollback. Production received the
byte-identical committed apply SQL through `psql` stdin. No source transfer,
package operation, application build, or service restart ran on Contabo.

## Final preflight

Immediately before execution:

- clean worktree `HEAD` equaled fetched `origin/main` at `7f267dd`;
- local and committed apply artifacts both hashed to `8f8696f1...`;
- all 24 product/variant identities, metadata snapshots, status values,
  categories, prices/units, stock values, and `updated_at` guards matched;
- tracked pre-state signature was `13dfbbb294afe9b5f8b9efa256d4a097`;
- exactly one active `asiandeligo` channel, one enabled monotonic product
  timestamp trigger, and both declared product/variant/category foreign keys
  existed;
- both batch-2 backup/audit relations were absent;
- all 24 PDPs, storefront homepage, both health endpoints, login, and mail
  inbox returned HTTP 200.

## Execution

- Committed at `2026-07-22 08:58:35 UTC`.
- PostgreSQL transaction ID: `7047363`.
- Result: `COMMIT` with exactly 24 persistent product backups and 24 exact
  product updates.
- Exactly the approved 24 `products` rows have transaction ID `7047363` among
  the guarded business tables; zero `product_variants` and zero `categories`
  rows were written.

## Exact applied scope

- Reviewed: 25 exact SKUs, deterministic priority-cohort ranks 26–50.
- Applied: 24 products / 36 metadata field transitions.
- Held without mutation: `ADG-000176` because its production EAN conflicts
  with the exact evidence identity already assigned to `ADG-000177`.
- Field counts: 19 storage zones, four allergen declarations, two may-contain
  declarations, four nutrition panels, five countries of origin, and two
  ingredients corrections.
- Price, unit price, category, name, slug, publication state, stock, variants,
  and category rows were unchanged.
- All 24 guarded variant quantities remained exactly `100`.

## Post-apply verification

- Backup table contains exactly 24 rows for the correct tenant, channel,
  batch, and decision SHA; every applied timestamp is newer than its original.
- Audit contains `backup_captured:24` and `apply_complete:24` in transaction
  `7047363`, with no rollback row.
- Database values match all 36 exact targets; out-of-scope invariants match
  24/24 and `ADG-000176` has no backup row.
- Direct storefront GraphQL and the public GraphQL proxy each returned the full
  1,779-product catalog and exact target metadata, unchanged price/unit/
  category, and stock `100` for 24/24 products.
- The tracked post-state signature is `92f7b98fa8ed9b10c0a27220ba8b0f62`.
- All 24 PDPs plus five storefront/eNail health routes returned HTTP 200 after
  apply; all PM2 processes remained online and no process was restarted.

## Catalog impact and next cohort

A fresh read-only audit inspected all 1,779 published products and 70
categories. Current outstanding counts are:

- 782 products with no positive allergen declaration;
- 184 products missing ingredients;
- 310 products missing a nutrition panel;
- 560 products missing a storage zone;
- 1,762 variants still at placeholder stock `100`.

Relative to the original 2026-07-21 baseline, the two guarded 25-SKU metadata
batches plus the preceding exact-six remediation have reduced missing allergen
declarations from 790 to 782. This batch alone supplied 19 storage zones, four
positive allergen declarations, four nutrition panels, five countries, and
one previously missing ingredients value; the second ingredients edit repaired
malformed markup on an already-populated field. Placeholder stock remains
intentionally untouched.

Catalog cleanup is not complete. The next safe unit is deterministic cohort
ranks 51–75, again with exact source review and guarded SQL.

## Recovery state

Persistent backup and audit tables are intentionally retained. The committed
rollback SQL passed happy-path, duplicate, stale-row, intervening-edit, and
tampered-backup rehearsal cases but was not executed on production. Any future
rollback is a separate owner-approved operation and refuses changed product or
backup state.
