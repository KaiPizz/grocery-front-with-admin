# Asia Deli Go catalog-data production apply — 2026-07-22

## Authorization and artifact identity

- Owner approval: explicit confirmation to apply the exact six-SKU batch in the active conversation.
- Source commit on `origin/main`: `ebebacb44c5785c8bb02d1830cb69d4b05d20218`.
- Batch: `asiandeligo-catalog-data-fix-20260721-v1`.
- Tenant: `e73271a9-53e3-4a20-a02e-791726b452aa`.
- Decision SHA-256: `2cfcbb9f10277a814d33c8ded770f005f35b80ad7e9024f7c0cd61b7febe30d7`.
- Apply SQL SHA-256: `1ce2f18dac51e07635b213301049c7a935101fa02336a26bd9d9820f6aeeb08d`.
- Rollback SQL SHA-256: `db4a75b2993fde00de41528ff1e1a5f422064e9693e25c055660f992a642b5ce`.

The generic SQL-write helper was not used because this reviewed operation is
a multi-statement transaction with persistent backup/audit DDL and exact
rollback guards. Production received the byte-identical committed apply SQL
through `psql` stdin; no source, package, or build operation ran on Contabo.

## Final preflight

Immediately before execution at `2026-07-22 06:55 UTC`:

- clean worktree `HEAD` equaled fetched `origin/main` at `ebebacb`;
- the six tracked production rows had old-state signature
  `8df609299ec4ddac564f8ca1d4d02377`;
- all six exact `updated_at` guards still matched the decision JSON;
- source/target category signature was
  `1a185daf00ae43448fe1725ea54b9ec9`;
- exactly one active pinned `asiandeligo` channel existed;
- dated backup and audit tables did not exist;
- required product revision trigger and declared product/variant/category
  foreign keys were present;
- all six PDPs, both health endpoints, login, and mail inbox returned HTTP 200.

## Execution

- Started/committed: `2026-07-22 06:56:18–06:56:19 UTC`.
- PostgreSQL transaction ID: `7045960`.
- Result: `COMMIT` with exactly six persistent backups and six exact product
  updates.
- Only the six approved `products` rows have transaction ID `7045960` among
  the guarded business tables. No `product_variants` or `categories` rows were
  written.

## Exact applied changes

| SKU | Applied change |
| --- | --- |
| `ADG-000404` | Allergens `cereals` → `cereals, fish`. |
| `ADG-000702` | Added `cereals, soybeans`, `AMBIENT`, and the reviewed 263 kcal nutrition panel. |
| `ADG-001014` | Nutrition → 347 kcal / fat 2.1 / saturated fat 0.5 / carbs 57 / sugar 30 / protein 24 / salt 5; category → `słodycze-przekąski`. |
| `ADG-001382` | Comparison unit price `623.75` → `311.88` PLN/kg. Nutrition, including the held salt value, remained unchanged. |
| `ADG-001383` | Comparison unit price `886.25` → `443.13` PLN/kg. |
| `ADG-001750` | Category `ramyun-ramen` → `sosy-marynaty`. |

## Post-apply verification

- Backup table: exactly six rows, correct tenant/channel/batch/decision SHA,
  with all `applied_updated_at` values captured and greater than originals.
- Audit table: one `backup_captured` and one `apply_complete`, both for six
  products; zero `rollback_complete` rows.
- Database: 6/6 products match the complete persisted target snapshots and
  exact applied timestamps; 6/6 variants and all guarded categories remain at
  their pre-apply identities and statuses.
- Direct storefront GraphQL and the storefront GraphQL proxy both returned
  HTTP 200, `errors=[]`, and exact target values for all six products.
- All six exact PDP URLs returned HTTP 200.
- `https://enail.pro/api/v1/health` and
  `https://zira-ai.com/api/v1/health` returned HTTP 200 with `status=ok`.
- `https://enail.pro/vi/login`, `https://enail.pro/app/mail-inbox`, and the
  Asia Deli Go homepage returned HTTP 200.
- All PM2 processes remained online. The backend error log was not modified
  after `06:40 UTC`, and the last 1,000 backend output lines contained zero
  `error`, `fatal`, `exception`, or `unhandled` signatures.

## Recovery state

The persistent backup and audit tables are intentionally retained. The
committed rollback SQL was successfully rehearsed before production, but it was
not executed. Any later production rollback remains a separate owner-approved
operation and will refuse to overwrite an intervening product edit.
