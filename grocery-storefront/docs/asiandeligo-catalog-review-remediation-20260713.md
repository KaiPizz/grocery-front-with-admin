# Asia Deli Go Catalog Review Remediation

Generated: 2026-07-13T19:50:14.739Z

## Result

- Stock updates prepared: 17 (0 -> 100).
- EAN corrections prepared: 2.
- Dietary false positives resolved in audit code: 9.
- Production mutation in this step: none.

## Stock

Owner instructed that all launch stock may temporarily be set to 100 until the physical inventory is entered.

| SKU | Product | From | To |
| --- | --- | ---: | ---: |
| ADG-000144 | Makaron ramen świeży ITA-SAN 200g | 0 | 100 |
| ADG-000201 | Syrop kukurydziany 100% 2,45kg - CJO Essential | 0 | 100 |
| ADG-000426 | Patelnia stalowa do tamagoyaki - duża (22 x 23 cm) Emro Aziatica | 0 | 100 |
| ADG-000637 | Płatki suszonego tuńczyka bonito, Katsuobushi 40g - Wadakyu | 0 | 100 |
| ADG-000647 | Sos Teriyaki, japońska marynata 1L - Sen Soy | 0 | 100 |
| ADG-000660 | Curry Medium Hot - curry instant w proszku 1kg - Ottogi | 0 | 100 |
| ADG-000725 | Makaron Konjac, fettuccine 20 x 270g (cały karton) - Asia Style | 0 | 100 |
| ADG-000885 | Zestaw DIY Popin Cookin Choco Fondue Party 31g - Kracie | 0 | 100 |
| ADG-000889 | Chrupki Zzaldduk o smaku ostrego kurczaka Buldak 2xSpicy, ostre 80g - Samyang | 0 | 100 |
| ADG-000946 | Syrop koncentrat Mojito Zero cukru 600ml - Teisseire | 0 | 100 |
| ADG-001054 | Fermentowane tofu (hong furu) w czerwonym różanym sosie 340g - Wangzhihe | 0 | 100 |
| ADG-001314 | Żelki Puré Gummy Muscat o smaku winogronowym 56g - Kanro | 0 | 100 |
| ADG-001423 | Zestaw do sushi żółto-brązowy, 6 elementów - Edo Japan | 0 | 100 |
| ADG-001551 | Aloe CICA Waterproof Sunscreen SPF 50+ PA++++ 100ml Holika Holika | 0 | 100 |
| ADG-001639 | Danie Tangle makaron z kremowym sosem bulgogi 105g - Samyang | 0 | 100 |
| ADG-001684 | Ryż kleisty tajski Glutinous Rice 1kg - Golden Phoenix | 0 | 100 |
| ADG-001744 | Nóż Tomoko Yanagi-Sashimi 20,5cm - Satake Cutlery | 0 | 100 |

## EAN

| SKU | Product | Invalid value | Verified GTIN | Sources |
| --- | --- | --- | --- | --- |
| ADG-000392 | Baza do zupy, pasta do Hot Pot po syczuańsku 70g - Lee Kum Kee | mpn:749 | 078895123395 | [1](https://hk.lkk.com/en/products/soup-base-for-sichuan-hot--spicy-hot-pot), [2](https://heuschenschroufforder.com/hot-pot-sichuan-soup-70-gr/) |
| ADG-000393 | Ryż basmati 5kg - Laila | mpn:837 | 5020580400156 | [1](https://desibasket.de/products/laila-basmati-rice-5kg), [2](https://www.zing-asia.co.uk/rice/12596-laila-basmati-rice-5kg-naturally-gluten-free-basmati-rice-5020580400156.html) |

## Dietary audit fix

The old substring check matched `ryb` inside `ryboflawina` and `rybonukleotyd`. The new matcher uses bounded words/stems and retains detection of actual fish/meat ingredients.

| SKU | Resolution | Evidence |
| --- | --- | --- |
| ADG-000096 | keep vegetarian | Owner-confirmed on 2026-07-08; audit matched ryboflawina, not fish. |
| ADG-000502 | keep vegetarian | Owner-confirmed on 2026-07-08; audit matched ryboflawina, not fish. |
| ADG-000671 | keep vegan and vegetarian | Current ingredient list contains no animal ingredient; audit matched ryboflawina only. |
| ADG-000672 | keep vegan and vegetarian | Current ingredient list contains no animal ingredient; audit matched ryboflawina only. |
| ADG-000820 | keep vegetarian | Owner-confirmed on 2026-07-08; audit matched rybonukleotyd, not fish. |
| ADG-001165 | keep vegetarian | Owner-confirmed on 2026-07-08; audit matched ryboflawina, not fish. |
| ADG-001191 | keep vegetarian | Soy product with flavoring and no animal ingredient listed; audit matched rybonukleotyd, not fish. |
| ADG-001199 | keep vegetarian | Owner-confirmed on 2026-07-08; audit matched ryboflawina, not fish. |
| ADG-001208 | keep vegetarian | Owner-confirmed on 2026-07-08; audit matched ryboflawina, not fish. |

## Safety and rollback

- Apply aborts unless the channel resolves once, all 17 variants are visible/active, each has exactly one zero/unreserved quant, and both EANs still have the expected legacy values.
- Apply aborts if either target EAN is already in use for this salon.
- Rollback aborts if stock/reservations or EANs changed after apply, preventing overwrite of real sales activity.
- Apply and rollback also verify that the stock-quant trigger synchronized variant aggregate stock.
- No price, dietary tag, product content, publication state, order, or reservation is changed.

## Schema assumptions

1. `product_variants.template_id = products.id` uses UUIDs and a declared FK; sampled matches are valid.
2. `stock_quants.variant_id = product_variants.id` uses UUIDs and a declared FK; all target rows match the channel salon.
3. Products/variants exclude soft-deleted rows; `stock_quants` has no soft-delete column.
4. `trg_stock_quants_sync_variant` is present and synchronizes variant aggregate stock after quant changes.

## Artifacts

- Decisions: `docs/asiandeligo-catalog-review-decisions-20260713.json`
- Guarded apply: `docs/asiandeligo-catalog-review-remediation-apply-20260713.sql`
- Guarded rollback: `docs/asiandeligo-catalog-review-remediation-rollback-20260713.sql`
