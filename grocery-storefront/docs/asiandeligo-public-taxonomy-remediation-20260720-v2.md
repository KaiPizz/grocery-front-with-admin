# Asia Deli Go Public Taxonomy Remediation v2

Prepared: 2026-07-20T18:03:25.000Z
Batch: `asiandeligo-public-taxonomy-backup-20260720-v1`

## Result

- Exactly 10 live products are in scope: the products omitted from curated public-category browsing.
- Exactly 2 emptied provisional categories are deactivated.
- The historical eight duplicate-category consolidation moves are explicitly outside this batch.
- Persistent tenant-scoped product/category backups and an audit log are created before mutation.
- Production mutation in this preparation step: none.

## Approved moves

| SKU | Product | From | To | Type | Confidence | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| ADG-000103 | Sos Hoisin 200ml - Flying Goose | unmapped | sosy-marynaty | business | high | Hoisin sauce belongs with sauces and marinades. |
| ADG-000277 | Czerwona fasolka azuki 900g - Valle Del Sole | pozostałe-produkty | ryż-i-inne-ziarna | business | medium | Azuki is a dried pulse; rice and other grains is the closest existing dry-pantry category. |
| ADG-000393 | Ryż basmati 5kg - Laila | unmapped | ryż-i-inne-ziarna | business | high | Basmati rice belongs with rice and grains. |
| ADG-000607 | Koszyk Wioli - Rodowity Koreańczyk | kategoria-tymczasowa | prezenty | business | high | The product is a gift basket. |
| ADG-000641 | Tamaryndowiec, miąższ w kostce 400g - Thai Dancer | unmapped | pasty-smakowe | business | medium | Tamarind pulp blocks are closest to the existing flavor-pastes category, though the format is not a prepared paste. |
| ADG-000648 | Pasta z tamaryndowca 114g - Asia Kitchen | unmapped | pasty-smakowe | business | high | Tamarind paste belongs with flavor pastes. |
| ADG-000690 | Przyprawa Pięć Smaków 50g - Mee Chun | kategoria-tymczasowa | przyprawy | business | high | Five-spice powder belongs with seasonings. |
| ADG-000781 | Ryż jaśminowy Premium Quality Orange 5kg - Royal Umbrella | unmapped | ryż-i-inne-ziarna | business | high | Jasmine rice belongs with rice and grains. |
| ADG-000791 | Kostki bulionowe PHO BO, wołowe 75g - Ong ChaVa | unmapped | buliony | business | high | Bouillon cubes belong with bouillons. |
| ADG-001694 | Mieszanka przypraw do dania Palabok 57g - Mama Sita's | kategoria-tymczasowa | przyprawy | business | high | The product is a seasoning mix. |

## Category state

| Category | Exact products before move | Apply state |
| --- | ---: | --- |
| kategoria-tymczasowa | 3 | active -> inactive |
| unmapped | 6 | active -> inactive |

## Explicitly retained

- `pozostałe-produkty`: The one live product moves out, but six non-live draft products remain; category state is not changed.
- `sosy-sojowe`: Duplicate-category consolidation is outside the exact-ten public-coverage scope.
- `sosy-i-marynaty`: Duplicate-category consolidation is outside the exact-ten public-coverage scope.

## Persistent recovery evidence

- Product backup: `asiandeligo_public_taxonomy_product_backup_20260720` — exactly 10 rows for the batch and tenant.
- Category backup: `asiandeligo_public_taxonomy_category_backup_20260720` — exactly 2 rows for the batch and tenant.
- Audit log: `asiandeligo_public_taxonomy_audit_20260720` — records backup capture, completed apply, and completed rollback timestamps.
- Rollback uses captured product/category UUIDs and original category states, not a newly resolved slug mapping.
- Backup and audit rows are retained; neither script contains DELETE.

## Guardrails

- Every canonical and backup-table join is scoped by the single active `asiandeligo` salon.
- Apply is SERIALIZABLE and requires exact SKU, source category, target category, active/published, soft-delete, and category-count preconditions.
- Apply aborts unless exactly ten product backups, two category backups, ten updates, and two deactivations occur.
- Rollback requires the exact approved backup set plus exact post-apply product IDs, category IDs, and states.
- The channel lookup is pinned to salon UUID `e73271a9-53e3-4a20-a02e-791726b452aa`, slug `asiandeligo`, and active state.
- `pozostałe-produkty` stays active; `sosy-sojowe` and `sosy-i-marynaty` are untouched.
- `pozostałe-produkty` must contain exactly seven non-deleted rows before apply, six after apply, and seven after rollback.
- The SQL explicitly changes `products.category_id`, `categories.is_active`, and `categories.updated_at`.
- Category timestamps use an explicit monotonic raw-SQL update because production has no category revision trigger and POS incremental category sync reads `categories.updated_at`; apply and rollback both remain discoverable without a full POS resync.
- The SQL does not explicitly assign `products.updated_at`; the existing database revision trigger advances it for the ten product updates so the hourly product-index sync and POS product sync can detect them.
- No price, stock, content, publication, order, reservation, or translation field is changed.

## Notes

- The historical 18-move taxonomy plan remains unchanged and is not the execution artifact for this batch.
- ADG-000277 and ADG-000641 are explicitly recorded as medium-confidence business mappings.
- Source categories are deactivated, not deleted, and persistent backup/audit rows are retained.
- No product price, stock, content, publication state, order, reservation, or translation is changed.

## Artifacts

- Decisions: `docs/asiandeligo-public-taxonomy-decisions-20260720-v2.json`
- Guarded apply: `docs/asiandeligo-public-taxonomy-remediation-apply-20260720-v2.sql`
- Guarded rollback: `docs/asiandeligo-public-taxonomy-remediation-rollback-20260720-v2.sql`
- Rehearsal evidence: `docs/asiandeligo-public-taxonomy-rehearsal-20260720-v2.md`
