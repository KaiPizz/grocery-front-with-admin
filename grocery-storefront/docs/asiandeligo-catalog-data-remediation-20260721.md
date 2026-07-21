# Asia Deli Go Catalog Data Remediation

Prepared: 2026-07-21T22:10:36Z
Batch: `asiandeligo-catalog-data-fix-20260721-v1`
Decision SHA-256: `2cfcbb9f10277a814d33c8ded770f005f35b80ad7e9024f7c0cd61b7febe30d7`

## Result

- Exactly 6 published Asia Deli Go products are in scope.
- Only rows in products are changed; product_variants and categories are read-only guards.
- Persistent tenant-scoped backup and audit tables are created before mutation.
- Production mutation in this preparation step: none.

## Reviewed changes

| SKU | Product | Exact change | Confidence | Evidence |
| --- | --- | --- | --- | --- |
| ADG-000404 | Kimchi Hot 300g - Runoland | allergens ["cereals"] -> ["cereals","fish"] | high | [1](https://kimchi.pl/product-pol-2168.html), [2](https://asiandeligo.eshoper.pro/products/kimchi-hot-300g-runoland) |
| ADG-000702 | Edomae Inari Age, smażone kieszonki tofu (24 szt.) 540g - Nishimoto | allergens [] -> ["cereals","soybeans"]; storage null -> AMBIENT; nutrition exact JSON replacement | high | [1](https://yamatomarket.pl/product/tofu-inari-540g-nishimoto/), [2](https://paleczkami.pl/product-pol-3396-Inari-smazone-kieszonki-tofu-540g-Nishimoto.html), [3](https://asiandeligo.eshoper.pro/products/edomae-inari-age-smazone-kieszonki-tofu-24-szt-540g-nishimoto) |
| ADG-001014 | Bento Squid Snack Sweet & Spicy, przekąska z kałamarnicy słodko-ostra 20g - Bento & Co | nutrition exact JSON replacement; category Dania gotowe -> Słodycze / Przekąski | high | [1](https://asiapoint.de/tintenfisch-snack-sweet-spicy-bento-20g), [2](https://www.fiksuruoka.fi/product/29091/bento-mixed-seafood-snack-sweet--spicy-merenelavasnacks-20g), [3](https://www.tavato.de/p/8850157405836), [4](https://asiandeligo.eshoper.pro/products/bento-squid-snack-sweet-and-spicy-przekaska-z-kalamarnicy-slodko-ostra-20g-bento-and-co) |
| ADG-001382 | 2 x Dubai Chocolate, zestaw czekolad dubajskich z kremem pistacjowym i ciastem kataifi - mleczna i biała 160g Q Chew | unit price 623.75 -> 311.88 KG | high | [1](https://kimchi.pl/product-pol-5215.html), [2](https://asiandeligo.eshoper.pro/products/2-x-dubai-chocolate-zestaw-czekolad-dubajskich-z-kremem-pistacjowym-i-ciastem-kataifi-mleczna-i-biala-160g-q-chew) |
| ADG-001383 | 2 x Angel Hair Chocolate, zestaw czekolad z anielskim włosiem i pistacjami - biała i różowa 80g Mistachio | unit price 886.25 -> 443.13 KG | high | [1](https://img.zira.pl/asiandeligo/products/KIMCHI-5216/1.webp), [2](https://kimchi.pl/product-pol-5216.html), [3](https://asiandeligo.eshoper.pro/products/2-x-angel-hair-chocolate-zestaw-czekolad-z-anielskim-wlosiem-i-pistacjami-biala-i-rozowa-80g-mistachio) |
| ADG-001750 | Buldak Hot Sauce Carbonara Flavour - sos o smaku pikantnego kurczaka carbonara 165ml Samyang | category Ramyun / Ramen -> Sosy, marynaty | high | [1](https://kimchi.pl/product-pol-5783.html), [2](https://asiandeligo.eshoper.pro/products/buldak-hot-sauce-carbonara-flavour-sos-o-smaku-pikantnego-kurczaka-carbonara-165ml-samyang) |

## Guardrails

- Apply is SERIALIZABLE, one-shot, and pinned to the exact active channel plus salon UUID.
- Every row is guarded by exact SKU, product UUID, variant UUID, name, slug, category IDs/names/slugs, product and variant statuses, soft-delete state, tracked old values, and expected product updated_at.
- Apply aborts unless exactly six product locks, backups, updates, applied timestamps, and post-state rows are observed.
- The SHA-256 of the exact decision JSON is persisted in both backup and audit rows and must match during rollback.
- Rollback requires the exact post-apply values and exact applied updated_at; any intervening product edit causes a full abort.
- The production zz_enforce_products_monotonic_updated_at trigger must advance updated_at after both apply and rollback.
- No category, variant, stock, retail-price, EAN, translation, media, publication, order, reservation, or customer row is changed.
- Backup and audit rows are retained; neither SQL artifact contains DELETE.

## Persistent recovery evidence

- Product backup: `asiandeligo_catalog_data_product_backup_20260721` — exactly six explicit-column rows.
- Audit log: `asiandeligo_catalog_data_audit_20260721` — backup_captured, apply_complete, and rollback_complete timestamps.

## Schema assumptions

1. product_variants.template_id = products.id uses UUIDs and a declared FK; tenant-scoped match/mismatch samples were verified.
2. products.category_id = categories.id uses UUIDs and a declared FK; source and target category identities are exact read-only guards.
3. All canonical joins use the pinned salon_id; products and variants use exact active/published/for-sale/status and deleted_at snapshots.

## Notes

- The source facts were reviewed manually against public supplier/retailer pages and the current public Asia Deli Go product pages.
- This batch updates only six rows in products; product_variants and categories are identity/status guards and remain read-only.
- ADG-001014 deliberately uses the matching panel shared by three current EAN 8850157405836 retailer records; the conflicting Kimchi/Allegro-style 52/26/23/6.6 panel was reviewed and rejected for this batch.
- ADG-001382 salt remains exactly 50.7 pending verification from a physical package or authoritative importer label.
- Stock, retail price, EAN, publication state, translations, media, orders, reservations, and customer data are outside scope.

## Artifacts

- Decisions: `docs/asiandeligo-catalog-data-decisions-20260721.json`
- Guarded apply: `docs/asiandeligo-catalog-data-remediation-apply-20260721.sql`
- Guarded rollback: `docs/asiandeligo-catalog-data-remediation-rollback-20260721.sql`
