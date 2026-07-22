# Asia Deli Go catalog metadata batch 25 rehearsal — 2026-07-22

## Scope

- Batch: `asiandeligo-catalog-metadata-batch25-20260722-v1`
- Tenant: `e73271a9-53e3-4a20-a02e-791726b452aa`
- Channel: `asiandeligo`
- Reviewed queue slice: 25 exact SKUs
- High-confidence transitions: 23 products / 28 field changes
- Holds: `ADG-000219` and `ADG-000119`
- Decision SHA-256: `0aff66c79c10e96e5ca614fa4b5a250ae4f236d784bea557a3d72fe9836d4e9c`
- Apply SQL SHA-256: `e9a24ebba9661e0e4b79138a92991f5df8525cd8b5c20105143db78bdb586430`
- Rollback SQL SHA-256: `8a9987891d2b2716cfca81fa4a3d729ddfd9942c15f52be5db804faffa15b84c`
- Production access during rehearsal was read-only.

Only six `products` metadata columns are writable in the generated SQL:
`allergens`, `may_contain_allergens`, `storage_zone`, `nutrition_facts`,
`country_of_origin`, and `ingredients`. This reviewed decision set changes
three allergens, two may-contain declarations, 21 storage zones, one nutrition
panel, and one ingredients value. Price, stock, unit, category, name, slug,
publication state, variants, and categories are not mutated.

`ADG-001241` nutrition remains `NULL`: sources tied to the same EAN disagree on
sugars and salt. The product receives only the supported crustacean/fish
allergens and ambient storage. Empty allergen arrays on reviewed single-
ingredient products are not replaced with fabricated codes.

## Production-shape fixture

A fresh disposable PostgreSQL database was created locally from a read-only
production schema dump. It was loaded read-only from production with the one
active channel, eight referenced categories, the exact 23 products, and their
exact 23 variants. Generated columns were excluded from data copy. The four
business-table schema signatures matched production exactly before execution:

| Table | Columns | Ordered schema signature |
| --- | ---: | --- |
| `channels` | 39 | `7dbcd6b890c0de51cf9380dde5354c53` |
| `categories` | 38 | `2e2af48483a742993ecf795b1f840104` |
| `products` | 178 | `5e6bd6c6eb89b85498d363ebc4953da3` |
| `product_variants` | 134 | `dcec0843e3c174f677ea7f85cb4f7d32` |

The tracked product/variant content signature before apply was
`f279aa4f0adeaa4838531430f8071d4b`; the eight referenced category rows had
signature `2809958e06daa80a9fbffb4a511a49f5`. The required monotonic
`products.updated_at` trigger was present and enabled.

## Rehearsal results

| Case | Result | Evidence |
| --- | --- | --- |
| Happy-path apply | PASS | PostgreSQL committed exactly 23 backups and 23 updates in transaction `199512221`; all 23 `applied_updated_at` values advanced. Audit contains `backup_captured:23` and `apply_complete:23`. |
| Exact target verification | PASS | Field counts were allergens 3, may-contain 2, storage 21, nutrition 1, ingredients 1. All 21 storage targets were `AMBIENT`; special allergen/nutrition/ingredients values matched the decision exactly. |
| Out-of-scope invariants | PASS | Price, unit, and category matched backup for 23/23 products. All 23 variant stock values remained exactly `100`. |
| Duplicate apply | PASS (rejected) | Exited `3` because the dated backup/audit tables already existed; backup and audit row counts remained unchanged. |
| Happy-path rollback | PASS | PostgreSQL restored exactly 23 rows in transaction `199512223`; tracked content returned to `f279aa4f0adeaa4838531430f8071d4b` and all rollback timestamps advanced past applied timestamps. |
| Duplicate rollback | PASS (rejected) | Exited `3` because `rollback_complete` already existed. |
| Stale pre-apply row | PASS (rejected atomically) | A local unit-price edit reduced the exact lock count to 22. Apply exited `3`; no dated backup/audit table existed afterward and the pre-attempt content signature was unchanged. |
| Intervening product edit | PASS (rollback rejected atomically) | A local post-apply ingredient marker reduced target locks to 22. Rollback exited `3`; marker and all other target rows remained, with zero `rollback_complete` rows. |
| Tampered persistent backup | PASS (rollback rejected atomically) | A local backup-value edit failed the exact decision-vs-backup guard. Rollback exited `3`; target products remained untouched and no rollback audit was written. |

Both hardened generated files were parsed and executed by PostgreSQL after the
final review. Apply and rollback pin `search_path` to `pg_catalog, public`, use
schema-qualified persistent relations, lock the exact product, variant, and
category rows, run at `SERIALIZABLE`, verify the reviewed decision content
hash, and refuse stale product or backup state.

## Automated verification

- Focused generator suite: **4/4 passed**.
- Full catalog suite: **29/29 passed**.
- Generated plan/apply/rollback artifacts: byte-for-byte reproducible.
- `node --check` and `git diff --check`: passed.

## Fresh production read-only gate

After rehearsal, production was re-read without mutation:

- exact 23-row tracked signature remained `f279aa4f0adeaa4838531430f8071d4b`;
- all 23 `updated_at` guards still matched the reviewed decision;
- exactly one active pinned `asiandeligo` channel and one enabled monotonic
  product timestamp trigger existed;
- dated backup and audit relations were absent;
- all 23 public product pages, the storefront homepage, both health endpoints,
  `/vi/login`, and `/app/mail-inbox` returned HTTP 200.

No production database write, source transfer, application build, deploy, or
service restart occurred during this rehearsal.

## Cleanup

The disposable fixture and four rehearsal databases were removed after the
results above were captured; a final lookup returned zero matching databases.
