# Asia Deli Go Catalog Blocker Unpublish Plan

Generated: 2026-07-13T19:58:32.590Z

## Result

- Products prepared for temporary unpublish: 5.
- Production mutation in this step: none.
- The rows remain active/editable in admin as drafts; they are not deleted.
- Search reindex is required after apply and rollback.

## Products

| SKU | Current product | Observed identity | Owner evidence required |
| --- | --- | --- | --- |
| ADG-001327 | [Zestaw do herbaty matcha zielony, 4 elementy - Edo Japan](https://asiandeligo.eshoper.pro/products/zestaw-do-herbaty-matcha-zielony-4-elementy-edo-japan-adg001327) | Edo Japan Kurobizen black matcha set, 4 pieces | Front and base/origin label confirming the exact model and country of origin |
| ADG-001446 | [Mleko kokosowe (70% wyciągu z kokosa) 1L w kartonie AROY-D](https://asiandeligo.eshoper.pro/products/mleko-kokosowe-70-wyciagu-z-kokosa-1l-w-kartonie-aroy-d-adg001446) | COCO-D coconut milk 1L | Front, back ingredients/allergens, origin label, net volume and barcode photos |
| ADG-001463 | [Kaki no Tane, przyprawione krakersy ryżowe arare z orzeszkami 180g (6 x 30g) - KAMEDA](https://asiandeligo.eshoper.pro/products/kaki-no-tane-przyprawione-krakersy-ryzowe-arare-z-orzeszkami-180g-6-x-30g-kameda-adg001463) | Kameda Kaki no Tane Wasabi 164g | Front, back ingredients/allergens, net weight and barcode photos |
| ADG-001666 | [Sos rybny Myeolchi Aekjeot z anchois 870ml - Hansung](https://asiandeligo.eshoper.pro/products/sos-rybny-myeolchi-aekjeot-z-anchois-870ml-hansung-adg001666) | Hansung Myeolchi Aekjeot anchovy fish sauce 2L | Front, back ingredients/allergens, origin label, net volume and barcode photos |
| ADG-001782 | [Ryż jaśminowy Fragrant Jasmine Rice 1kg Tilda](https://asiandeligo.eshoper.pro/products/ryz-jasminowy-fragrant-jasmine-rice-1kg-tilda-adg001782) | Marukome dried rice koji 100g | Front, back ingredients/allergens, origin label, net weight and barcode photos |

## Schema assumptions

1. `product_variants.template_id = products.id` uses UUIDs, has a declared FK, and all five production samples matched.
2. Every products/variants lookup is scoped by the one active `asiandeligo` channel salon; soft-deleted rows are excluded.
3. Product status is varchar; `active` and `draft` are present production values. Product visibility is controlled by `products.is_published`.
4. Only canonical `channels`, `products`, and `product_variants` tables are used; backup tables are ignored.

## Apply and rollback

- Apply SQL: `docs/asiandeligo-catalog-blocker-unpublish-apply-20260713.sql`
- Rollback SQL: `docs/asiandeligo-catalog-blocker-unpublish-rollback-20260713.sql`
- Owner queue: `docs/asiandeligo-catalog-blocker-owner-review-20260713.csv`
- Both files abort unless all five rows exactly match the expected before-state.
- After either SQL file commits, call the guarded storefront `reindexSalonProducts(channel: "asiandeligo")` mutation and wait for Meilisearch.

## Production approval template

```text
DEPLOY APPROVED: apply asiandeligo catalog blocker unpublish
+ rollback: run asiandeligo-catalog-blocker-unpublish-rollback-20260713.sql, then reindex channel asiandeligo
+ monitor: Zira/admin/storefront health + published count 1779 + 5 product URLs absent + storefront search
```

## Notes

- The image/product mismatch is verified, but regulated food fields are not corrected without physical EU-label evidence.
- Only products.status and products.is_published are changed; is_active remains true so the rows stay editable in admin.
- Run the channel search reindex after apply and rollback so Meilisearch receives the publication-state change.
