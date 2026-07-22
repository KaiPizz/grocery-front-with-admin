# Asia Deli Go catalog metadata batch 6 rehearsal — 2026-07-22

## Scope

- Batch: `asiandeligo-catalog-metadata-batch6-20260722-v1`
- Tenant: `e73271a9-53e3-4a20-a02e-791726b452aa`
- Channel: `asiandeligo`
- Frozen queue slice: deterministic priority-cohort ranks 126–150, 25 exact SKUs
- High-confidence transitions: 14 products / 15 field changes
- Evidence/conflict/no-op holds: 11 products
- Field scope: 13 storage zones, one country of origin, and one allergen array
- Decision SHA-256: `19d2a71766d82e9ac4089b60472959412bd49b772820b75521260ae112e7844f`
- Apply SQL SHA-256: `30478f7f7255407332e509a88548e7a31f1758d0f797e47bbe55545b81883168`
- Rollback SQL SHA-256: `022ac160ccd151abc79fb5873b7b230214fb5b463e39ff680ab5c8c5bcffe736`

Price, unit price, stock, category, product identity, publication state,
variants, and categories are immutable in this batch. Production access during
preparation and rehearsal was read-only.

## Production-shape fixture

A disposable PostgreSQL 16 fixture was built locally from a fresh production
schema dump and fresh data dumps of the four canonical joined tables. It
contained 43 channels, 1,228 categories, 142,606 products, and 673,991
variants; the pinned tenant contributed 1,837 products and 1,837 variants.
The schema projections matched production exactly:

| Table | Columns |
| --- | ---: |
| `categories` | 38 |
| `channels` | 39 |
| `product_variants` | 134 |
| `products` | 178 |

The required `zz_enforce_products_monotonic_updated_at` trigger was enabled in
ordinary mode (`tgenabled=O`). The initial 14-target signature, excluding the
volatile product timestamp, was `52765a84b79610f5c07fb0f332c7c9a1`.
The 11-hold out-of-scope signature was
`9b8fe77776352b6977d2c655cd089427`.

## Rehearsal results

| Case | Result | Evidence |
| --- | --- | --- |
| Happy-path apply | PASS | Exit `0`, transaction `199555784`; exactly 14 backups, 14 timestamp links, two audit rows in one transaction, and 14/14 exact targets. |
| Exact scope | PASS | Field counts were exactly storage 13, country 1, allergens 1; applied signature `159c9c63d81dbafa4646fc4a4115271c`. |
| Immutable/out-of-scope state | PASS | Identity, category, price/unit, status, publication state, variant state, and stock matched 14/14; the 11-hold signature stayed `9b8fe77776352b6977d2c655cd089427`. |
| Duplicate apply | PASS (rejected) | Exit `3`; existing dated support relations caused a full abort. |
| Happy-path rollback | PASS | Exit `0`, transaction `199555786`; all 14 rows restored and the target signature returned to `52765a84b79610f5c07fb0f332c7c9a1`. |
| Duplicate rollback | PASS (rejected) | Exit `3`; the existing rollback audit caused a full abort. |
| Stale pre-apply row | PASS (rejected atomically) | A local immutable unit-price edit changed one row from `424.75` to `424.76`; apply exited `3` with 13/14 locks, preserved signature `abccbf320596a528bab010b98a0e9fd6`, and created zero support relations. |
| Intervening product edit | PASS (rollback rejected atomically) | A post-apply ingredient marker made rollback exit `3`; signature `6057e5b7de3ff198608bf27066995b68` and the marker remained, with zero rollback audit rows. |
| Tampered persistent backup | PASS (rollback rejected atomically) | A local backup-price edit made rollback exit `3`; live targets stayed at `159c9c63d81dbafa4646fc4a4115271c`, with zero rollback audit rows. |

The generated SQL pins `search_path`, uses `SERIALIZABLE`, locks exact product,
variant, and category rows, requires the ordinary timestamp trigger state, and
verifies tenant/channel/IDs/SKU/status/category/full metadata/price/unit/
`updated_at`. It neither deletes business data nor manually assigns
`products.updated_at`.

## Evidence and automated verification

- Source dry-run: 25/25 mapped products inspected with zero fetch errors.
- Evidence probe after removing one stale 404: 54 unique URLs; 26 direct HTTP
  200, three anti-bot 403, one WAF 202, and 24 origin timeouts from the Netcup
  IP. Every transition retains at least two substantively independent sources.
- Focused batch-6 generator suite: **4/4 passed**.
- Full catalog audit suite: **49/49 passed**.
- `node --check`, byte-for-byte reproducible generation, content-hash lock,
  `git diff --check`, and independent SQL review: passed.
- Independent SQL review found no production-blocking issue. Its low-severity
  trigger-state observation was incorporated by requiring `tgenabled=O`.
- Production mutation, source transfer, application build, and service restart
  during rehearsal: none.

## Cleanup

The disposable base and four case databases are removed after the final SQL
review. A final exact-name lookup must return zero `adg_b6_reh_%` databases.
