# Asia Deli Go catalog metadata batch 7 rehearsal — 2026-07-22

## Scope

- Batch: `asiandeligo-catalog-metadata-batch7-20260722-v1`
- Tenant: `e73271a9-53e3-4a20-a02e-791726b452aa`
- Channel: `asiandeligo`
- Frozen queue slice: deterministic priority-cohort ranks 151–175, 25 exact SKUs
- High-confidence transitions: 21 products / 25 field changes
- Evidence/conflict/no-op holds: 4 products
- Field scope: 20 storage zones, four allergen arrays, and one country of origin
- Decision SHA-256: `2287c2c57b6758668141ee12ebd1b2e5143e8643c0f80e38259513b24c378a0e`
- Apply SQL SHA-256: `09920d4cc247e0ae5dd3eef94900963fe8c3517520a97537f5b5043da875d46a`
- Rollback SQL SHA-256: `78ce83e7d86524eea6ef5f74469166d49f1b8cdcc5e41e01bb77caeca9a20aaf`

May-contain declarations, nutrition, ingredients, unit price, stock, category,
product identity, publication state, variants, and categories are immutable in
this batch. Production access during preparation and rehearsal was read-only.

## Production-shape fixture

A disposable PostgreSQL 16 fixture was built locally from a fresh production
schema stream and fresh data streams of the four canonical joined tables. It
contained 43 channels, 1,228 categories, 142,609 products, and 673,994
variants; the pinned tenant contributed 1,837 products and 1,837 variants
(1,836 non-deleted in each table). The schema projections matched production
exactly:

| Table | Columns |
| --- | ---: |
| `categories` | 38 |
| `channels` | 39 |
| `product_variants` | 134 |
| `products` | 178 |

The required `zz_enforce_products_monotonic_updated_at` trigger was enabled in
ordinary mode (`tgenabled=O`). The initial 21-target signature, excluding the
volatile product timestamp, was `8b39ae25c4ec60229a4056b4d2c37b47`.
The four-hold out-of-scope signature was
`4dc88ec6da724b7cc5f9145f4ef1755f`.

## Rehearsal results

| Case | Result | Evidence |
| --- | --- | --- |
| Happy-path apply | PASS | Exit `0`, transaction `199561268`; exactly 21 backups, 21 timestamp links, two audit rows in one transaction, and 21/21 exact targets. |
| Exact scope | PASS | Field counts were exactly storage 20, allergens 4, country 1; applied signature `7a3452f3090679e708c7fbda338232f3`. |
| Immutable/out-of-scope state | PASS | Identity, category, price/unit, status, publication state, variant state, and stock matched 21/21; the four-hold signature stayed `4dc88ec6da724b7cc5f9145f4ef1755f`. |
| Duplicate apply | PASS (rejected) | Exit `3`; existing dated support relations caused a full abort and preserved 21 backups / two audit rows. |
| Happy-path rollback | PASS | Exit `0`, transaction `199561270`; all 21 rows restored and the target signature returned to `8b39ae25c4ec60229a4056b4d2c37b47`. |
| Duplicate rollback | PASS (rejected) | Exit `3`; the existing rollback audit caused a full abort. |
| Stale pre-apply row | PASS (rejected atomically) | A local immutable unit-price edit changed `ADG-001234` from `106.55` to `106.56`; apply exited `3` with 20/21 locks, preserved the edit, and created zero support relations. |
| Intervening product edit | PASS (rollback rejected atomically) | A post-apply ingredient marker made rollback exit `3`; the marker and applied storage remained, with zero rollback audit rows. |
| Tampered persistent backup | PASS (rollback rejected atomically) | A local backup-price edit made rollback exit `3`; the live target remained applied and zero rollback audit rows were created. |

The generated SQL pins `search_path`, uses `SERIALIZABLE`, locks exact product,
variant, and category rows, requires the ordinary timestamp trigger state, and
verifies tenant/channel/IDs/SKU/status/category/full metadata/price/unit/
`updated_at`. It neither deletes business data nor manually assigns
`products.updated_at`.

## Evidence and automated verification

- Frozen source cohort SHA-256:
  `3757364066fef4f84904694fc9e15e84b51f2868d68169ef0b92c8db6550c2c6`.
- Source dry-run: 25/25 mapped products inspected with zero fetch errors.
- Evidence probe after replacing two stale Umeboshi links: 73 unique URLs;
  40 direct HTTP 200, 12 anti-bot HTTP 403, six rate-limit HTTP 429, and 15
  origin timeouts from the Netcup IP. No URL returned HTTP 404. Every
  transition retains at least two substantively independent exact-product
  sources.
- Focused batch-7 generator suite: **4/4 passed**.
- Full catalog audit suite: **53/53 passed**.
- `node --check`, byte-for-byte reproducible generation, content-hash lock,
  and `git diff --check`: passed.
- Independent SQL and decision review found no production-blocking issue. Its
  evidence-count wording finding for `ADG-001105` was corrected before the
  final hashes and the complete rehearsal above was rerun on those exact bytes.
- Exact-GTIN/indexed official recall searches found no hit for the batch. This
  does not replace physical lot/DDM checks. The unrelated Jongga Gat Kimchi
  500g recall does not cover the 80g shelf-stable Napa product in this batch.
- Production mutation, source transfer, application build, and service restart
  during rehearsal: none.

## Cleanup

The disposable base and case databases are removed after the final independent
SQL review. A final exact-name lookup must return zero `adg_b7_reh_%`
databases.
