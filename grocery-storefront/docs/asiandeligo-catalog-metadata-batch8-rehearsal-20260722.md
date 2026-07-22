# Asia Deli Go catalog metadata batch 8 rehearsal — 2026-07-22

## Scope

- Batch: `asiandeligo-catalog-metadata-batch8-20260722-v1`
- Tenant: `e73271a9-53e3-4a20-a02e-791726b452aa`
- Channel: `asiandeligo`
- Frozen queue slice: deterministic priority-cohort ranks 176–200, 25 exact SKUs
- High-confidence transitions: 13 products / 13 field changes
- Evidence/conflict/no-op holds: 12 products
- Field scope: 13 unopened storage zones to `AMBIENT`
- Decision SHA-256: `b7f405d8eea6aa7465f63ba05f9e00ed8c14bea2525675db003041775b99ca93`
- Apply SQL SHA-256: `1868ab833a46a7e7ca6c2d34197a3ea724f35763329f1fbf34e70e1734defee2`
- Rollback SQL SHA-256: `981fc54edd1529220d96592367a7d2291f34e725581775b567f66d79f8b1a7d2`

Allergens, may-contain declarations, nutrition, ingredients, country, unit
price, stock, category, product identity, publication state, variants, and
categories are immutable in this batch. Production access during preparation
and rehearsal was read-only.

## Production-shape fixture

A disposable PostgreSQL 16 fixture was built locally from a fresh production
schema stream and fresh data streams of the four canonical joined tables. It
contained 43 channels, 1,228 categories, 142,631 products, and 674,016
variants; the pinned tenant contributed 1,837 products and 1,837 variants
(1,836 non-deleted in each table). The schema projections matched production
exactly:

| Table | Columns |
| --- | ---: |
| `categories` | 38 |
| `channels` | 39 |
| `product_variants` | 134 |
| `products` | 178 |

The required `zz_enforce_products_monotonic_updated_at` trigger was enabled
in ordinary mode (`tgenabled=O`). The initial 13-target signature, excluding
the volatile product timestamp, was
`05e9a9fe55ea7f4b2b265bff49275d19`. The 12-hold full signature was
`824d2be8db0d7f8c55c346c926ba604e`.

## Rehearsal results

| Case | Result | Evidence |
| --- | --- | --- |
| Happy-path apply | PASS | Exit `0`, transaction `199566851`; exactly 13 backups, 13 timestamp links, two audit rows in one transaction, and 13/13 exact targets. |
| Exact scope | PASS | Field count was exactly 13 storage zones; applied signature `1afde4fe54aa946bad4ec0a4d30b293b`. |
| Immutable/out-of-scope state | PASS | Allergens, may-contain, nutrition, ingredients, country, category, price/unit, identity, status, publication, variant state, and stock matched 13/13; the 12-hold signature stayed `824d2be8db0d7f8c55c346c926ba604e`. |
| Duplicate apply | PASS (rejected) | Exit `3`; existing dated support relations caused a full abort. |
| Happy-path rollback | PASS | Exit `0`, transaction `199566853`; all 13 rows restored and the target signature returned to `05e9a9fe55ea7f4b2b265bff49275d19`. |
| Duplicate rollback | PASS (rejected) | Exit `3`; the existing rollback audit caused a full abort. |
| Stale pre-apply row | PASS (rejected atomically) | A local unit-price edit changed `ADG-000234` from `348.00` to `348.01`; apply exited `3` with 12/13 locks, preserved the edit, left all 13 storage values unchanged, and created zero support relations. |
| Intervening product edit | PASS (rollback rejected atomically) | A post-apply ingredient marker on `ADG-000492` made rollback exit `3`; the marker and applied storage remained, with zero rollback audit rows. |
| Tampered persistent backup | PASS (rollback rejected atomically) | A local backup-price edit on `ADG-000234` made rollback exit `3`; the live target remained applied and zero rollback audit rows were created. |

The generated SQL pins `search_path`, uses `SERIALIZABLE`, locks exact
product, variant, and category rows, requires the ordinary timestamp trigger
state, and verifies tenant/channel/IDs/SKU/status/category/full
metadata/price/unit/`updated_at`. It neither deletes business data nor
manually assigns `products.updated_at`.

## Evidence and automated verification

- Frozen source cohort SHA-256:
  `3757364066fef4f84904694fc9e15e84b51f2868d68169ef0b92c8db6550c2c6`.
- Source dry-run: 25/25 mapped source rows became review candidates with zero
  fetch errors; incomplete fields were treated as holds rather than inferred.
- Evidence probe: 58 unique URLs; 24 direct HTTP 200, nine anti-bot HTTP 403,
  three rate-limit HTTP 429, and 22 origin timeouts from the Netcup IP. Two
  genuine HTTP 404 links were replaced or removed before final hashes; the
  final set contains no observed HTTP 404.
- Focused batch-8 generator suite: **4/4 passed**.
- Full catalog audit suite: **57/57 passed**.
- `node --check`, byte-for-byte reproducible generation, content-hash lock,
  and `git diff --check`: passed.
- Independent final SQL/decision review: PASS with no remaining finding. Its
  doc-only hold wording note was fixed without changing decision/apply/rollback
  hashes, and the focused suite was rerun.
- Exact identifier recall/safety searches found no current exact-product
  recall for approved transitions. This is screening, not legal clearance.
  The exact Assi kelp Proposition 65 complaint and historical CJO iodine recall
  are described only as qualified hold evidence, not current recalls.
- Production mutation, source transfer, application build, and service restart
  during rehearsal: none.

## Cleanup

The exact disposable databases `adg_b8_reh_base`,
`adg_b8_reh_happy`, `adg_b8_reh_stale`,
`adg_b8_reh_intervening`, and `adg_b8_reh_tampered` were removed.
The final exact-name lookup returned zero.
