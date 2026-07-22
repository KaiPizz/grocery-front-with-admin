# Asia Deli Go catalog metadata batch 8 production apply — 2026-07-22

## Authorization and artifact identity

- Owner authorization: `go` in the active catalog-cleanup conversation.
- Source commit on `origin/main`:
  `cf8cde5b015e6b4e1307dbfb9f7e1e49498953ec`.
- Batch: `asiandeligo-catalog-metadata-batch8-20260722-v1`.
- Decision SHA-256:
  `b7f405d8eea6aa7465f63ba05f9e00ed8c14bea2525675db003041775b99ca93`.
- Apply SQL SHA-256:
  `1868ab833a46a7e7ca6c2d34197a3ea724f35763329f1fbf34e70e1734defee2`.
- Rollback SQL SHA-256:
  `981fc54edd1529220d96592367a7d2291f34e725581775b567f66d79f8b1a7d2`.

The generic SQL-write helper was not used because this was a reviewed
multi-statement transaction with persistent backup/audit DDL, exact timestamp
guards, and a separately rehearsed stale-safe rollback. Production received
the exact committed apply SQL through `psql` stdin. No source transfer,
package operation, application build, or service restart ran on Contabo.

## Final preflight

Immediately before execution:

- clean `HEAD` and fetched `origin/main` both pointed to `cf8cde5`;
- regeneration from a fresh production snapshot produced a clean Git diff;
- decision/apply/rollback hashes matched the committed artifacts;
- all 13 transition snapshots and all 25 status identities matched exactly;
- all 13 target variants remained active, for sale, synced, `IN_STOCK`, and
  at stock `100`;
- exactly one active pinned `asiandeligo` channel existed;
- both declared join foreign keys existed and the monotonic product timestamp
  trigger was in ordinary mode (`tgenabled=O`);
- both dated batch-8 backup/audit relations were absent.

## Execution

- Committed at approximately `2026-07-22 14:15:39 UTC`.
- PostgreSQL transaction ID: `7053684`.
- Result: `COMMIT` with exactly 13 persistent product backups and 13 exact
  product updates.
- Exactly the approved 13 `products` rows were changed; zero
  `product_variants` and zero `categories` rows were written.

## Exact applied scope

- Reviewed: 25 exact SKUs, deterministic priority-cohort ranks 176–200.
- Applied: 13 products / 13 metadata field transitions.
- Field count: 13 missing unopened storage zones filled with `AMBIENT`.
- Held without mutation: `ADG-000105`, `ADG-000121`, `ADG-000702`,
  `ADG-000062`, `ADG-000179`, `ADG-000382`, `ADG-000029`,
  `ADG-000034`, `ADG-000071`, `ADG-000349`, `ADG-000350`, and
  `ADG-000371`.
- Allergens, may-contain declarations, nutrition, ingredients, country,
  unit price, category, name, slug, publication state, stock, variants, and
  category rows were unchanged.

Evidence review retained only exact-product or identical-member-unit storage
values. It held Diamond/Ricefield and whole/sliced mushroom identity conflicts,
current-complete no-ops, the exact Assi arsenic complaint, the historical CJO
iodine recall context, and conflicting nutrition or allergen generations.
Warnings were not converted into allergen values, and after-opening
refrigeration was not used as the unopened storage class.

## Post-apply verification

- Backup contains exactly 13 distinct tenant/channel/SHA-scoped rows, 13
  linked timestamps, and 13 declared field changes.
- Audit contains one `backup_captured` and one `apply_complete` event, both
  in transaction `7053684`; there is no rollback event.
- Exact database targets matched `AMBIENT` storage 13/13.
- Database category, price/unit, unchanged-field, status, stock, and
  timestamp-link invariants matched 13/13; none of the 12 hold SKUs appears in
  backup. The full hold signature remained
  `824d2be8db0d7f8c55c346c926ba604e`.
- Direct storefront GraphQL and the public GraphQL proxy each returned all
  1,779 products and all 70 categories. Their generated full-catalog audit
  CSV files were byte-identical (SHA-256
  `ffa38327012ab62ee812c9c1d91fd3320cb8bcfb7dcdecda326fdb355296bd95`).
- Direct/proxy exact target payloads matched each other and the reviewed
  metadata/category/stock for 13/13 applied products.
- All 25 cohort PDPs plus storefront, health, login, and mail-inbox routes
  returned HTTP 200 (29/29).
- All 18 PM2 processes remained online. No process was restarted.

## Catalog impact and next work

A fresh read-only audit of all 1,779 published products and 70 categories
found:

- missing storage zone reduced from 477 to 464;
- missing nutrition panel remained 307;
- missing country of origin remained 72;
- missing positive allergen declaration remained 776;
- missing ingredients remained 184;
- 1,762 variants remain at placeholder stock `100`.

The deterministic top-200 metadata review is complete across batches 1–8:
154 products received at least one guarded transition and 46 were held.
Catalog cleanup as a whole is not complete. The next safe catalog unit is the
held identity/current-label queue and a separate operational plan for
placeholder stock; taxonomy/search and SEO/accessibility remain separate
tracks.

## Recovery state

Persistent backup and audit tables are intentionally retained:

- `asiandeligo_catalog_metadata_batch8_product_backup_20260722`
- `asiandeligo_catalog_metadata_batch8_audit_20260722`

The committed rollback passed happy-path, duplicate, stale-row,
intervening-edit, and tampered-backup rehearsals but was not executed on
production. Any future rollback is a separate owner-approved operation and
refuses changed product or backup state.
