# Asia Deli Go catalog metadata batch 5 production apply — 2026-07-22

## Authorization and artifact identity

- Owner authorization: `ok tiếp tục` in the active catalog-cleanup
  conversation.
- Source commit on `origin/main`:
  `d45fe64fc7c6bb584a0d0a33078e7be867aa8fc4`.
- Batch: `asiandeligo-catalog-metadata-batch5-20260722-v1`.
- Decision SHA-256:
  `286cb02a38bd432f1d1f03d0594ddbe3a448dba69280cc36bc9d9d4dcc899b3f`.
- Apply SQL SHA-256:
  `c22eccd3d9bb3564e4ddc66add6a85e70e95b35ecb87b99ae316e8630e6ebbb4`.
- Rollback SQL SHA-256:
  `ea835367a50e597976e79edfbc7230afcb97f95b8bae58963711d294840ea91e`.

The generic SQL-write helper was not used because this is a reviewed
multi-statement transaction with persistent backup/audit DDL, exact timestamp
guards, and a separate stale-safe rollback. Production received the
byte-identical committed apply SQL through `psql` stdin. No source transfer,
package operation, application build, or service restart ran on Contabo.

## Final preflight

Immediately before execution:

- the clean feature commit and fetched `origin/main` both pointed to
  `d45fe64`;
- regeneration from the current production snapshot produced a clean Git
  diff, and the local and committed decision/apply/rollback hashes matched;
- all 18 product/variant identities, metadata snapshots, status values,
  categories, prices/units, and `updated_at` guards matched;
- exactly one active `asiandeligo` channel, the enabled monotonic product
  timestamp trigger, and both declared product/variant/category foreign keys
  existed;
- all 18 target products, variants, and categories matched their required live
  states;
- both batch-5 backup/audit relations were absent.

## Execution

- Committed at approximately `2026-07-22 11:46:22 UTC`.
- PostgreSQL transaction ID: `7050754`.
- Result: `COMMIT` with exactly 18 persistent product backups and 18 exact
  product updates.
- Exactly the approved 18 `products` rows were changed; zero
  `product_variants` and zero `categories` rows were written.

## Exact applied scope

- Reviewed: 25 exact SKUs, deterministic priority-cohort ranks 101–125.
- Applied: 18 products / 19 metadata field transitions.
- Held without mutation: `ADG-000273`, `ADG-000304`, `ADG-000131`,
  `ADG-000291`, `ADG-000294`, `ADG-000296`, and `ADG-000470`.
- Field counts: 16 storage zones, two countries of origin, and one nutrition
  panel.
- Allergens, trace-allergen declarations, ingredients, price, unit price,
  category, name, slug, publication state, stock, variants, and category rows
  were unchanged.
- All 18 guarded variant quantities remained exactly `100`.

Independent review removed unsafe allergen/nutrition proposals for the BOSS
coffee and Sang Tao/Creative coffee products because the available labels
belonged to different SKUs or conflicting pack generations. Only fields backed
by exact-product evidence remained in the committed batch.

## Recall follow-up outside this metadata transaction

Exact GTIN `6922163624012` for `ADG-001287` appears in an official French
lot-specific recall for lot `17042028`, DDM `17/04/2028`, due to excessive
pesticide residue. The recall also corroborates the applied `AMBIENT` storage
classification, but it does not establish that the current physical stock is
from the recalled lot.

No sale/availability state was changed in this metadata transaction. The
physical lot and DDM must be photographed and checked separately; a matching
pack must be quarantined and returned or destroyed. See
`docs/asiandeligo-catalog-batch5-recall-followup-20260722.md`.

## Post-apply verification

- Backup contains exactly 18 distinct tenant/channel/SHA-scoped rows, 18
  linked timestamps, and 19 declared field changes.
- Audit contains one `backup_captured` and one `apply_complete` event, both in
  transaction `7050754`; there is no rollback event.
- Database status, price/unit, category, identity, unchanged-field, and
  timestamp-link invariants each match 18/18; none of the seven hold SKUs
  appears in backup.
- Exact targets match 16/16 storage values, 2/2 origins, and 1/1 nutrition
  panel.
- Direct storefront GraphQL and the public GraphQL proxy each returned the
  complete 1,779-product catalog and exact changed metadata, category, and
  stock `100` for 18/18 applied products.
- All 25 cohort PDPs plus storefront, health, login, and mail-inbox routes
  returned HTTP 200 (29/29).
- All 18 PM2 processes remained online and no process was restarted for this
  batch.

## Catalog impact and next cohort

A fresh read-only audit of all 1,779 published products and 70 categories
found:

- missing storage zone reduced from 524 to 508;
- missing nutrition panel reduced from 308 to 307;
- missing country of origin reduced from 76 to 74;
- 781 products still lack a positive allergen declaration;
- 184 products still lack ingredients;
- 1,762 variants remain at placeholder stock `100`.

Catalog cleanup is not complete. The next metadata unit is deterministic
cohort ranks 126–150. Placeholder stock and the lot-specific recall check are
separate operational workflows.

## Recovery state

Persistent backup and audit tables are intentionally retained:

- `asiandeligo_catalog_metadata_batch5_product_backup_20260722`
- `asiandeligo_catalog_metadata_batch5_audit_20260722`

The committed rollback passed happy-path, duplicate, stale-row,
intervening-edit, and tampered-backup rehearsals but was not executed on
production. Any future rollback is a separate owner-approved operation and
refuses changed product or backup state.
