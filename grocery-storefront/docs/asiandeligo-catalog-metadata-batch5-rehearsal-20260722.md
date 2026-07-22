# Asia Deli Go catalog metadata batch 5 rehearsal — 2026-07-22

## Scope

- Batch: `asiandeligo-catalog-metadata-batch5-20260722-v1`
- Tenant: `e73271a9-53e3-4a20-a02e-791726b452aa`
- Channel: `asiandeligo`
- Reviewed queue slice: deterministic priority-cohort ranks 101–125, 25 exact SKUs
- High-confidence transitions: 18 products / 19 field changes
- Evidence or no-op holds: 7 products
- Decision SHA-256: `286cb02a38bd432f1d1f03d0594ddbe3a448dba69280cc36bc9d9d4dcc899b3f`
- Apply SQL SHA-256: `c22eccd3d9bb3564e4ddc66add6a85e70e95b35ecb87b99ae316e8630e6ebbb4`
- Rollback SQL SHA-256: `ea835367a50e597976e79edfbc7230afcb97f95b8bae58963711d294840ea91e`
- Production access during preparation and rehearsal was read-only.

Only six `products` metadata columns are writable. The final reviewed set
changes 16 storage zones, two countries of origin, and one nutrition object.
Price, unit price, stock, category, identity, publication state, variants, and
categories are not mutated.

Independent exact-pack review removed the initially proposed BOSS allergen and
nutrition values because they belonged to a different Suntory JAN. It also
held Sang Tao 4/5 and Creative 4/5 composition or trace declarations because
their exact-pack sources conflict and production does not pin the physical
label generation tightly enough. The superseded 22-transition artifact was
regenerated before rehearsal and was never committed or applied.

An official French recall for Tian Hu Shan 100g confirms `AMBIENT` but applies
only to GTIN `6922163624012`, lot `17042028`, DDM `17/04/2028`. Batch 5 keeps
the independently correct storage change and records a separate sale-safety
follow-up; it does not infer the physical warehouse lot or change availability.

## Production-shape fixture

A fresh disposable PostgreSQL 16 fixture was built locally from the current
read-only production schema and exact current row extracts. It contained one
active channel, four referenced categories, 18 target products and variants,
plus four product-only out-of-scope controls from removed proposals. The table
schema projections matched production:

| Table | Columns |
| --- | ---: |
| `categories` | 38 |
| `channels` | 39 |
| `product_variants` | 134 |
| `products` | 178 |

The initial 18-row target signature, excluding volatile `updated_at`, was
`73f02d1c78fc0f18c82bc303620ec58c`. The four-row out-of-scope signature was
`d3d2cc39eed8a9652f3271d84fb1d338`. All 18 variants had stock `100`, and the
required monotonic `products.updated_at` trigger was enabled.

`ADG-000457` has a real null unit-price/unit pair. Batch 5 therefore permits a
null value only in the exact immutable price snapshot; SQL still guards it with
`IS NOT DISTINCT FROM` and cannot write either field.

## Rehearsal results

| Case | Result | Evidence |
| --- | --- | --- |
| Happy-path apply | PASS | Exit `0`, transaction `199550285`; exactly 18 backups, 18 timestamp links, two apply audit rows, and 18/18 exact targets. |
| Exact scope verification | PASS | Field counts were exactly storage 16, country 2, and nutrition 1 (19 total). Applied signature: `ff9e0d5a1fa37d7a247f9d09ed86de36`. |
| Out-of-scope invariants | PASS | Product/variant identity, status, category, price/unit, and stock matched 18/18; the four-row out-of-scope signature remained `d3d2cc39eed8a9652f3271d84fb1d338`. |
| Duplicate apply | PASS (rejected) | Exit `3`; existing dated backup/audit relations caused a full abort. |
| Happy-path rollback | PASS | Exit `0`, transaction `199550287`; all 18 products restored and the target signature returned exactly to `73f02d1c78fc0f18c82bc303620ec58c`. |
| Duplicate rollback | PASS (rejected) | Exit `3`; the existing `rollback_complete` audit caused a full abort. |
| Stale pre-apply row | PASS (rejected atomically) | A local unit-price edit changed one row from `58.10` to `58.11`; apply exited `3` with 17/18 locks, preserved signature `1d76b9fd1526550d1e007404d1b5707e`, and created no support relation. |
| Intervening product edit | PASS (rollback rejected atomically) | A post-apply ingredient marker caused rollback exit `3`; signature `49c4cbdcb2dc6057ca9742d7f092e76e` and the marker remained, with zero rollback audit rows. |
| Tampered persistent backup | PASS (rollback rejected atomically) | A local backup-price edit caused rollback exit `3`; live targets remained at signature `ff9e0d5a1fa37d7a247f9d09ed86de36`, with zero rollback audit rows. |

The generated SQL pins `search_path`, runs at `SERIALIZABLE`, locks exact
product, variant, and category rows, verifies tenant/channel/IDs/SKU/status/
category/full metadata/price/unit/`updated_at`, and never deletes business
data or manually assigns `products.updated_at`.

## Automated verification

- Focused batch-5 generator suite: **4/4 passed**.
- Full catalog audit suite: **45/45 passed**.
- Independent exact-pack review: **cleared after five product scope reductions and one Suntory field correction**.
- `node --check`, reproducible generation, decision content hash lock, and `git diff --check`: passed.
- Production mutation, source transfer, app build, and service restart during rehearsal: none.

## Cleanup

The disposable base and four case databases are removed after the final SQL
review. A final exact-name lookup must return zero `adg_b5_reh_%` databases.
