# Asia Deli Go Public Taxonomy v2 Rehearsal

Rehearsed: 2026-07-20 UTC

## Scope and isolation

- Production access during rehearsal was read-only.
- The four required production table column contracts matched the local schema exactly: `categories` 38 columns, `channels` 39, `products` 178, and `product_variants` 134.
- A fresh dedicated local database, `adg_taxonomy_rehearsal_20260720_02`, was created from the current schema and populated only with Asia Deli Go rows copied read-only from production after the category timestamp guards were added.
- Imported tenant rows: 3 channels, 72 categories, 1,837 products, and 1,837 variants. The import deliberately included draft and soft-deleted rows so the guards were tested against the complete tenant data, not only the ten target rows.
- The rehearsal database was dropped after verification; a final database lookup returned zero matching databases.

## Artifact identity

| Artifact | SHA-256 |
| --- | --- |
| Decisions JSON | `70b71a2b00df04367040658a0989eeaf1cad39f7de9aae97a3a2476ef3cfb3bd` |
| Apply SQL | `d85a9645f8bcefb5af4d4ca800d05116cb363a4f3e8def8b80bfd276b2b200cf` |
| Rollback SQL | `6efe4ef41fedcbcd29c4dc738aff03f71c0fde2f19b0825bd4c28fb041916317` |

## Preconditions observed

- Exact target rows: 10.
- Exact source-category matches: 10.
- Rows already in a target category: 0.
- `kategoria-tymczasowa`: active, 3 non-deleted products.
- `unmapped`: active, 6 non-deleted products.
- `pozostałe-produkty`: active, 7 non-deleted products.
- All three dated production backup/audit table names were absent before rehearsal and were separately confirmed absent on production.

## Apply result

- Transaction committed without an error.
- Exact target-category matches: 10 of 10.
- Persistent product backup rows: 10.
- Persistent category backup rows: 2.
- `backup_captured` audit rows: 1.
- `apply_complete` audit rows: 1.
- `kategoria-tymczasowa`: inactive, 0 products.
- `unmapped`: inactive, 0 products.
- `pozostałe-produkty`: still active, 6 products.
- The existing monotonic revision trigger advanced `products.updated_at` for all 10 changed products even though the SQL does not explicitly assign that field. This makes the rows eligible for the existing hourly index sync.
- Both deactivated categories received a timestamp strictly newer than their captured original value, and the persistent backup recorded the exact applied timestamp.
- A query matching the POS incremental contract (`categories.updated_at > since`, without an active-only filter) returned exactly the 2 changed categories and both rows were inactive.

## Rollback result

- Transaction committed without an error.
- Original category restored: 10 of 10.
- `rollback_complete` audit rows: 1.
- Product/category backup rows remained intact: 10 and 2.
- `kategoria-tymczasowa`: active, 3 products.
- `unmapped`: active, 6 products.
- `pozostałe-produkty`: active, 7 products.
- Both restored categories received a timestamp strictly newer than their applied timestamp.
- The POS incremental-contract query returned exactly the 2 changed categories and both rows were active.

## One-shot fail-closed result

- A second rollback attempt exited non-zero at the completed-rollback audit guard.
- A second apply attempt exited non-zero because the persistent dated backup table already existed.
- Category state/timestamp and product category/timestamp hashes were identical before and after both rejected attempts.

## Production status

No production SQL mutation, application deploy, backend restart, reindex-secret change, payment change, shipping change, or POS change was performed by this rehearsal.
