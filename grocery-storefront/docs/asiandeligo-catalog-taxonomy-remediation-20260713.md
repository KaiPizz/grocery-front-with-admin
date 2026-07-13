# Asia Deli Go Catalog Taxonomy Remediation

Generated: 2026-07-13T19:50:14.927Z

## Result

- Product category moves prepared: 18.
- Empty source categories to deactivate: 4.
- Source categories are retained for rollback; none are deleted.
- Production mutation in this step: none.

## Moves

| SKU | Product | From | To | Reason |
| --- | --- | --- | --- | --- |
| ADG-000103 | Sos Hoisin 200ml - Flying Goose | unmapped | sosy-marynaty | Hoisin sauce belongs with sauces and marinades. |
| ADG-000277 | Czerwona fasolka azuki 900g - Valle Del Sole | pozostałe-produkty | ryż-i-inne-ziarna | Azuki is a dried pulse; this is the closest existing dry-grain category. |
| ADG-000393 | Ryż basmati 5kg - Laila | unmapped | ryż-i-inne-ziarna | Basmati rice belongs with rice and grains. |
| ADG-000527 | Sos sojowy jasny 500ml - Asia Kitchen | sosy-sojowe | sos-sojowy | Consolidate duplicate soy-sauce categories into the larger canonical category. |
| ADG-000528 | Sos sojowy jasny 150ml - Asia Kitchen | sosy-sojowe | sos-sojowy | Consolidate duplicate soy-sauce categories into the larger canonical category. |
| ADG-000529 | Sos sojowy ciemny 500ml - Asia Kitchen | sosy-sojowe | sos-sojowy | Consolidate duplicate soy-sauce categories into the larger canonical category. |
| ADG-000530 | Sos sojowy ciemny 150ml - Asia Kitchen | sosy-sojowe | sos-sojowy | Consolidate duplicate soy-sauce categories into the larger canonical category. |
| ADG-000607 | Koszyk Wioli - Rodowity Koreańczyk | kategoria-tymczasowa | prezenty | The product is a gift basket. |
| ADG-000641 | Tamaryndowiec, miąższ w kostce 400g - Thai Dancer | unmapped | pasty-smakowe | Tamarind pulp belongs with flavor pastes. |
| ADG-000648 | Pasta z tamaryndowca 114g - Asia Kitchen | unmapped | pasty-smakowe | Tamarind paste belongs with flavor pastes. |
| ADG-000668 | Sos sojowy Premium 1l - Asia Kitchen | sosy-sojowe | sos-sojowy | Consolidate duplicate soy-sauce categories into the larger canonical category. |
| ADG-000690 | Przyprawa Pięć Smaków 50g - Mee Chun | kategoria-tymczasowa | przyprawy | Five-spice powder belongs with seasonings. |
| ADG-000781 | Ryż jaśminowy Premium Quality Orange 5kg - Royal Umbrella | unmapped | ryż-i-inne-ziarna | Jasmine rice belongs with rice and grains. |
| ADG-000791 | Kostki bulionowe PHO BO, wołowe 75g - Ong ChaVa | unmapped | buliony | Bouillon cubes belong with bouillons. |
| ADG-001413 | Sos sojowy ciemny 1l - Asia Kitchen | sosy-sojowe | sos-sojowy | Consolidate duplicate soy-sauce categories into the larger canonical category. |
| ADG-001414 | Sos sojowy jasny 1l - Asia Kitchen | sosy-sojowe | sos-sojowy | Consolidate duplicate soy-sauce categories into the larger canonical category. |
| ADG-001694 | Mieszanka przypraw do dania Palabok 57g - Mama Sita's | kategoria-tymczasowa | przyprawy | The product is a seasoning mix. |
| ADG-001712 | Sos orzechowy Satay 340g - Lee Kum Kee | sosy-i-marynaty | sosy-marynaty | Consolidate the one-product duplicate sauces category. |

## Category state

| Category | Current live/not-deleted rows | Apply state |
| --- | ---: | --- |
| kategoria-tymczasowa | 3 | active -> inactive |
| sosy-i-marynaty | 1 | active -> inactive |
| sosy-sojowe | 7 | active -> inactive |
| unmapped | 6 | active -> inactive |

## Guardrails

- Every operation is scoped through the single active `asiandeligo` channel salon.
- Apply requires each SKU to resolve to one active/published product and the exact expected source category.
- Apply requires all target categories to exist and be active.
- A source category is deactivated only after it owns zero non-deleted products.
- Rollback requires the exact post-apply state and reactivates source categories before moving products back.
- No price, stock, content, publication, order, or reservation field is changed.

## Notes

- Pozostałe produkty remains active because it also contains six non-live draft products outside the 1,784-product storefront audit.
- Source categories are deactivated, not deleted, so rollback remains possible.
- No product price, stock, content, publication state, order, or reservation is changed.

## Artifacts

- Decisions: `docs/asiandeligo-catalog-taxonomy-decisions-20260713.json`
- Guarded apply: `docs/asiandeligo-catalog-taxonomy-remediation-apply-20260713.sql`
- Guarded rollback: `docs/asiandeligo-catalog-taxonomy-remediation-rollback-20260713.sql`
