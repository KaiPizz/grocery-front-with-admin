# Asia Deli Go Launch Cleanup Plan

Generated: 2026-07-08T09:22:35.129Z
Source: docs/catalog-quality-audit.json and docs/catalog-quality-audit.csv

## Launch Blocker Status

- Missing image: 0
- Missing SKU: 0
- Missing price: 0
- Missing category: 0
- Duplicate SKU: 0
- Duplicate slug: 0
- Legacy Kamito/Kenmito mentions: 0
- Out of stock: 17

Conclusion: product display essentials are clean enough for launch. Do not block launch on food metadata polish.

## Out Of Stock Review

Storefront product cards already disable add-to-cart and show out-of-stock copy for these items. Review stock in admin/POS instead of hiding them blindly.

- KIMCHI-5452: Aloe CICA Waterproof Sunscreen SPF 50+ PA++++ Wodoodporny żel przeciwsłoneczny o działaniu kojącym i nawilżającym 100ml Holika Holika — Koreańskie kosmetyki — price 89.9|89.9 — stock 0
- KIMCHI-4043: Chrupki Zzaldduk o smaku ostrego kurczaka Buldak 2xSpicy, ostre 80g - Samyang — Słodycze / Przekąski — price 9.5|9.5 — stock 0
- KIMCHI-3151: Curry Medium Hot - curry instant w proszku 1kg - Ottogi — Dania gotowe — price 55.5|55.5 — stock 0
- KIMCHI-5546: Danie Tangle makaron z kremowym sosem bulgogi 105g - Samyang — Ramyun / Ramen — price 14.9|14.9 — stock 0
- KIMCHI-4546: Fermentowane tofu (hong furu) w czerwonym różanym sosie 340g - Wangzhihe — Sosy, marynaty — price 16.5|16.5 — stock 0
- KIMCHI-3552: Makaron Konjac, fettuccine 20 x 270g (cały karton) - Asia Style — Makaron konjac — price 137.8|137.8 — stock 0
- KIMCHI-599: Makaron ramen świeży  ITA-SAN 200g — Makaron pszenny — price 4.99|4.99 — stock 0
- KIMCHI-5777: Nóż Tomoko Yanagi-Sashimi 20,5cm - Satake Cutlery — Noże — price 99.5|99.5 — stock 0
- KIMCHI-2230: Patelnia stalowa do tamagoyaki - duża (22 x 23 cm) Emro Aziatica — Patelnie Tamago — price 154.9|154.9 — stock 0
- KIMCHI-3061: Płatki suszonego tuńczyka bonito, Katsuobushi 40g - Wadakyu — Buliony — price 24.9|24.9 — stock 0
- KIMCHI-5594: Ryż kleisty tajski Glutinous Rice 1kg - Golden Phoenix — Ryż i inne ziarna — price 18.5|18.5 — stock 0
- KIMCHI-3088: Sos Teriyaki, japońska marynata 1L - Sen Soy — Sosy, marynaty — price 19.9|19.9 — stock 0
- KIMCHI-4267: Syrop koncentrat Mojito Zero cukru 600ml - Teisseire — Napoje — price 25|25 — stock 0
- KIMCHI-839: Syrop kukurydziany 100% 2,45kg - CJO Essential — Sosy, marynaty — price 56.9|56.9 — stock 0
- KIMCHI-5109: Żelki Puré Gummy Muscat o smaku winogronowym 56g - Kanro — Słodycze / Przekąski — price 13.99|13.99 — stock 0
- KIMCHI-4029: Zestaw DIY Popin Cookin Choco Fondue Party 31g - Kracie — Słodycze / Przekąski — price 45|45 — stock 0
- KIMCHI-5272: Zestaw do sushi żółto-brązowy, 6 elementów - Edo Japan — Komplety do sushi i herbaty — price 185|185 — stock 0

## Dietary Tag Review

Current tagged products: vegetarian 64, vegan 36, gluten-free 32.
Gluten-free text candidates without tag: 0.
Vegetarian text candidates without tag: 3.

Manual decision received 2026-07-08: KIMCHI-3834, KIMCHI-355, KIMCHI-2553, KIMCHI-4795, KIMCHI-4850, and KIMCHI-4908 were confirmed vegetarian and updated. The remaining candidates were confirmed not vegetarian and should stay untagged unless the owner changes the decision.

- CONFIRMED NO: KIMCHI-2579: Baza do zupy Tom Yum, łagodna 80g - Sen Soy — Buliony
- CONFIRMED NO: KIMCHI-791: Sos ostrygowy Mae Krua 300ml — Sosy, marynaty
- CONFIRMED NO: KIMCHI-2635: Sos ostrygowy Premium 255g - Lee Kum Kee — Sosy, marynaty
- APPLIED YES: KIMCHI-3834: Zupa instant o smaku warzywnym z makaronem ryżowym 55g - MAMA — Ramyun / Ramen
- APPLIED YES: KIMCHI-355: Zupa instant Shin Kimchi Ramyun, ostra 120g Nongshim — Ramyun / Ramen
- APPLIED YES: KIMCHI-2553: Zupa instant Shin Kimchi Ramyun, ostra - 5-pak (5 x 120g) Nongshim — Ramyun / Ramen
- APPLIED YES: KIMCHI-4795: Zupa makaronowa instant o smaku warzywnym 40 x 75g - Indomie — Ramyun / Ramen
- APPLIED YES: KIMCHI-4850: Zupa makaronowa instant o smaku warzywnym 5 x 75g - Indomie — Ramyun / Ramen
- APPLIED YES: KIMCHI-4908: Zupa makaronowa Shin Kimchi Ramyun, ostra 20 x 120g (cały karton) - Nongshim — Ramyun / Ramen

## Metadata Batch Priority

### Missing allergens, top categories
- Słodycze / Przekąski: 88
- Napoje: 66
- Herbaty: 55
- Komplety do sushi i herbaty: 54
- Przyprawy: 40
- Ryż i inne ziarna: 39
- Sosy, marynaty: 36
- Koreańskie kosmetyki: 34

### Missing storage zone, top categories
- Słodycze / Przekąski: 76
- Ramyun / Ramen: 59
- Komplety do sushi i herbaty: 54
- Koreańskie kosmetyki: 34
- Sosy, marynaty: 34
- Pałeczki i sztućce: 32
- Noże: 26
- Dania gotowe: 24

### Missing unit price, top categories
- Komplety do sushi i herbaty: 45
- Pałeczki i sztućce: 32
- Noże: 26
- Patelnie Wok / Grill: 23
- Arkusze Nori / Gim: 10
- Miski: 8
- Parowary bambusowe: 7
- Patelnie Tamago: 7

### Missing ingredients, top categories
- Komplety do sushi i herbaty: 54
- Pałeczki i sztućce: 32
- Noże: 26
- Patelnie Wok / Grill: 23
- Miski: 8
- Parowary bambusowe: 7
- Patelnie Tamago: 7
- Koty szczęścia i inne gadżety: 5

## Recommended Work Order

1. Verify or restock the 17 out-of-stock SKUs in admin/POS.
2. Manually verify the 9 dietary-tag candidates before adding vegetarian claims.
3. Backfill storage zone in bulk from category defaults where safe: snacks/ramen/sauces are mostly AMBIENT; chilled/frozen require explicit verification.
4. Backfill allergens and ingredients from supplier/OCR only, not guessing.
5. Deprioritize English translations for launch if the shop is Polish-first.
