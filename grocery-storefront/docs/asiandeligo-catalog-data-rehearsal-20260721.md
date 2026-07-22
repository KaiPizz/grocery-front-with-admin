# Asia Deli Go catalog-data rehearsal — 2026-07-21

## Scope

- Batch: `asiandeligo-catalog-data-fix-20260721-v1`
- Tenant: `e73271a9-53e3-4a20-a02e-791726b452aa`
- Channel: `asiandeligo`
- Products: `ADG-000404`, `ADG-000702`, `ADG-001014`, `ADG-001382`, `ADG-001383`, `ADG-001750`
- Decision SHA-256: `2cfcbb9f10277a814d33c8ded770f005f35b80ad7e9024f7c0cd61b7febe30d7`
- Only `products` is mutated. `channels`, `product_variants`, and `categories` are read-only guards.
- Production mutation during preparation and rehearsal: **none**.

The Bento nutrition target follows the matching panel published by three current
retailer records for EAN `8850157405836`. The conflicting Kimchi/Allegro-style
panel is recorded in the decision notes and is not mixed into the selected
panel. The Q-Chew salt value remains unchanged pending a physical or importer
label; that product changes only comparison-unit price.

## Production-shape fixture

A disposable local PostgreSQL database was created from the current local
schema and loaded read-only from production with one channel, all 72 tenant
categories, the exact six products, and their exact six variants. Generated
columns were excluded from the data copy. The schema signatures matched
production before execution:

| Table | Columns | Ordered schema signature |
| --- | ---: | --- |
| `channels` | 39 | `6359ff6505a692f7f66571b7406dae53` |
| `categories` | 38 | `dcd8d20abe2b2716e9f231aef77a490f` |
| `products` | 178 | `b1f99aaf6c9db5fb8fec1ac051031de9` |
| `product_variants` | 134 | `8401537ee6cb8c4db3dd54c624d68c30` |

The product/variant tracked-content signature before apply was
`8df609299ec4ddac564f8ca1d4d02377`; the six guarded category identities had
signature `1a185daf00ae43448fe1725ea54b9ec9`.

## Rehearsal results

| Case | Result | Evidence |
| --- | --- | --- |
| Happy-path apply | PASS | Exactly six backups, six updates, six monotonic `applied_updated_at` captures, and `backup_captured` + `apply_complete` audits. All six products matched their complete target snapshots. |
| Duplicate apply | PASS (rejected) | Exited non-zero on exact old-state/timestamp precondition; no second mutation. |
| Happy-path rollback | PASS | Exactly six products restored. Tracked-content signature returned to `8df609299ec4ddac564f8ca1d4d02377`; all rollback timestamps advanced monotonically. Backup and audit remained persistent. |
| Duplicate rollback | PASS (rejected) | Exited non-zero because `rollback_complete` already existed. |
| Stale pre-apply row | PASS (rejected atomically) | Locally changed one expected unit price before apply. Apply exited non-zero; backup/audit tables were absent and the other five products remained untouched. |
| Intervening post-apply edit | PASS (rollback rejected atomically) | After apply, locally added an allergen marker to one product. Rollback exited non-zero before restoration; the marker remained, the other five products stayed at target state, and no `rollback_complete` audit was written. |

Both apply and rollback were parsed and executed by PostgreSQL, not only checked
as generated text. The production monotonic `updated_at` trigger was present and
exercised in both directions.

## Automated verification

- Focused generator suite: **4/4 passed**.
- Full catalog suite: **25/25 passed**.
- Generated plan/apply/rollback artifacts: byte-for-byte reproducible from the decision JSON.
- `git diff --check`: passed.
- Generated apply and rollback both contain the literal psql command `\set ON_ERROR_STOP on`.

## Fresh production read-only gate

Immediately after rehearsal, production was re-read without mutation:

- tracked-content signature still `8df609299ec4ddac564f8ca1d4d02377`;
- category signature still `1a185daf00ae43448fe1725ea54b9ec9`;
- one active pinned `asiandeligo` channel;
- all six `updated_at` values still exactly matched the decision file;
- dated backup and audit tables did not exist.

At rehearsal close, the committed SQL remained a candidate until the separate
production data-apply approval gate. The later approved execution is recorded
in `docs/asiandeligo-catalog-data-production-apply-20260722.md`. No
storefront/backend build, artifact transfer, PM2 restart, or Contabo build was
required for this data-only batch.

## Cleanup

All disposable databases named `adg_catalog_fix_rehearsal_20260721_*` were
removed after the evidence above was captured.
