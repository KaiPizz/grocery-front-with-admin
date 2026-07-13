# Asia Deli Go Catalog Quality Audit

Generated: 2026-07-13T18:49:41.873Z
Endpoint: https://zira-ai.com/graphql/storefront
Channel: asiandeligo
Inspected products: 1784 / 1784
Inspected categories: 72 / 72
CSV detail report: docs/asiandeligo-catalog-audit-20260713.csv
CSV blocker/review queue: docs/asiandeligo-catalog-review-queue-20260713.csv
JSON summary: docs/asiandeligo-catalog-audit-20260713.json

## Executive Summary

- Products with at least one issue: 1784 / 1784
- Blocker products: 0
- Products requiring data review: 28
- Products in metadata backlog: 1756
- Polish-only products: 0
- Duplicate SKU values: 0
- Duplicate slug values: 0
- Duplicate normalized product names: 6
- Legacy Kamito/Kenmito mentions: 0
- Products whose active variants all have stock exactly 100: 1750
- Products with an EAN/GTIN candidate: 2 / 1784
- Valid EAN/GTIN candidates: 0 / 2
- Unique image URLs checked: 2225
- Broken image URLs: 0
- Image URLs reused by multiple products: 0
- Image URLs still using legacy KIMCHI-* object keys: 1783
- Categories with zero products: 0
- Categories missing description: 72
- Categories missing image: 72
- Oversized categories: 1
- Provisional/unmapped categories: 3 (10 products)
- Similar category-name pairs requiring merge review: 2

## Launch Gates

- Product/catalog blockers: 0
- Safety claim conflicts requiring human confirmation: 11
- Missing EAN does not block the storefront UI, but it blocks reliable scanner/POS receiving and should remain a separate owner/supplier data project.
- Stock value 100 is treated as a known temporary placeholder, not verified physical inventory.
- All checked product images are served from the owned img.zira.pl domain; legacy KIMCHI-* appears only inside object paths.
- Empty allergen/dietary fields are treated as unverified, never auto-filled from product names.

## Product Issue Counts

- legacy image key: 1783
- missing ean: 1782
- missing allergens: 792
- missing storage zone: 602
- non ascii category slug: 585
- missing nutrition: 317
- missing unit price: 196
- missing ingredients: 186
- missing country: 90
- missing english description: 40
- missing english translation: 40
- out of stock: 17
- slug contains sku: 12
- untranslated english name candidate: 12
- vegetarian ingredient conflict candidate: 9
- missing description: 5
- invalid ean: 2
- vegan ingredient conflict candidate: 2

## Category Distribution

- Słodycze / Przekąski (słodycze-przekąski): 355 — missing description, missing image, non-ASCII slug (SEO polish), oversized
- Ramyun / Ramen (ramyun-ramen): 171 — missing description, missing image
- Sosy, marynaty (sosy-marynaty): 133 — missing description, missing image
- Napoje (napoje): 81 — missing description, missing image
- Herbaty (herbaty): 68 — missing description, missing image
- Pasty smakowe (pasty-smakowe): 65 — missing description, missing image
- Przyprawy (przyprawy): 62 — missing description, missing image
- Dania gotowe (dania-gotowe): 61 — missing description, missing image
- Komplety do sushi i herbaty (komplety-do-sushi-i-herbaty): 54 — missing description, missing image
- Owoce / Marynowane warzywa (owoce-marynowane-warzywa): 41 — missing description, missing image
- Ryż i inne ziarna (ryż-i-inne-ziarna): 39 — missing description, missing image, non-ASCII slug (SEO polish)
- Sos sojowy (sos-sojowy): 37 — missing description, missing image
- Kawy (kawy): 36 — missing description, missing image
- Koreańskie kosmetyki (koreańskie-kosmetyki): 34 — missing description, missing image, non-ASCII slug (SEO polish)
- Makaron pszenny (makaron-pszenny): 32 — missing description, missing image
- Pałeczki i sztućce (pałeczki-i-sztućce): 32 — missing description, missing image, non-ASCII slug (SEO polish)
- Mąki / Panierki / Tapioka (mąki-panierki-tapioka): 30 — missing description, missing image, non-ASCII slug (SEO polish)
- Octy i winne przyprawy (octy-i-winne-przyprawy): 27 — missing description, missing image
- Buliony (buliony): 26 — missing description, missing image
- Noże (noże): 26 — missing description, missing image, non-ASCII slug (SEO polish)
- Oleje (oleje): 25 — missing description, missing image
- Sosy / Marynaty / Oleje (sosy-marynaty-oleje): 24 — missing description, missing image
- Patelnie Wok / Grill (patelnie-wok-grill): 23 — missing description, missing image
- Mleczko kokosowe (mleczko-kokosowe): 21 — missing description, missing image
- Pasta miso (pasta-miso): 17 — missing description, missing image
- Kimchi (kimchi): 16 — missing description, missing image
- Makaron ryżowy (makaron-ryżowy): 14 — missing description, missing image, non-ASCII slug (SEO polish)
- Makaron konjac (makaron-konjac): 13 — missing description, missing image
- Tofu (tofu): 13 — missing description, missing image
- Sezam (sezam): 12 — missing description, missing image
- Arkusze Nori / Gim (arkusze-nori-gim): 10 — missing description, missing image
- Imbir marynowany (imbir-marynowany): 9 — missing description, missing image
- Kluski tteok do dań (kluski-tteok-do-dań): 9 — missing description, missing image, non-ASCII slug (SEO polish)
- Makaron szklisty (makaron-szklisty): 9 — missing description, missing image
- Papier ryżowy (papier-ryżowy): 9 — missing description, missing image, non-ASCII slug (SEO polish)
- Wasabi (wasabi): 9 — missing description, missing image
- Grzyby shiitake (grzyby-shiitake): 8 — missing description, missing image
- Miski (miski): 8 — missing description, missing image
- Syropy (syropy): 8 — missing description, missing image
- Duża micha (duża-micha): 7 — missing description, missing image, non-ASCII slug (SEO polish)
- Parowary bambusowe (parowary-bambusowe): 7 — missing description, missing image
- Patelnie Tamago (patelnie-tamago): 7 — missing description, missing image
- Sosy sojowe (sosy-sojowe): 7 — missing description, missing image
- Wakame / Miyeok (wakame-miyeok): 7 — missing description, missing image
- Sól (sól): 6 — missing description, missing image, non-ASCII slug (SEO polish)
- Unmapped (unmapped): 6 — missing description, missing image, provisional/unmapped
- Grzyby mun (grzyby-mun): 5 — missing description, missing image
- Kombu / Dasima (kombu-dasima): 5 — missing description, missing image
- Koty szczęścia i inne gadżety (koty-szczęścia-i-inne-gadżety): 5 — missing description, missing image, non-ASCII slug (SEO polish)
- Maty do zwijania (maty-do-zwijania): 5 — missing description, missing image
- Przyprawy jednoskładnikowe (przyprawy-jednoskładnikowe): 5 — missing description, missing image, non-ASCII slug (SEO polish)
- Zupy / Buliony (zupy-buliony): 5 — missing description, missing image
- Foremki (foremki): 4 — missing description, missing image
- Moździerze (moździerze): 4 — missing description, missing image, non-ASCII slug (SEO polish)
- Słodycze japońskie (słodycze-japońskie): 4 — missing description, missing image, non-ASCII slug (SEO polish)
- Inne grzyby azjatyckie (inne-grzyby-azjatyckie): 3 — missing description, missing image
- *Kategoria tymczasowa (kategoria-tymczasowa): 3 — missing description, missing image, provisional/unmapped
- Pasty (pasty): 3 — missing description, missing image
- Makaron gryczany (makaron-gryczany): 2 — missing description, missing image
- Makarony (makarony): 2 — missing description, missing image
- Naczynia (naczynia): 2 — missing description, missing image
- Ryż do sushi i nie tylko (ryż-do-sushi-i-nie-tylko): 2 — missing description, missing image, non-ASCII slug (SEO polish)
- Zaparzacze do kawy (zaparzacze-do-kawy): 2 — missing description, missing image
- Japońskie ciasto ryżowe (japońskie-ciasto-ryżowe): 1 — missing description, missing image, non-ASCII slug (SEO polish)
- Marynowane warzywa i owoce (marynowane-warzywa-i-owoce): 1 — missing description, missing image
- Ocet ryżowy do sushi (ocet-ryżowy-do-sushi): 1 — missing description, missing image, non-ASCII slug (SEO polish)
- Oleje sezamowe (oleje-sezamowe): 1 — missing description, missing image
- Pozostałe produkty (pozostałe-produkty): 1 — missing description, missing image, non-ASCII slug (SEO polish), provisional/unmapped
- Prezenty (prezenty): 1 — missing description, missing image
- Sosy i marynaty (sosy-i-marynaty): 1 — missing description, missing image
- Świeże produkty (świeże-produkty): 1 — missing description, missing image, non-ASCII slug (SEO polish)
- Zestawy do sushi (zestawy-do-sushi): 1 — missing description, missing image

### Taxonomy Structure

- Categories: 72
- Root-level categories: 72
- Categories with children: 0
- Provisional/unmapped categories: 3 (10 products)
- A flat 72-category filter is functional but needs consolidation before it is considered launch-clean.

### Similar Category Merge Candidates
- Sosy i marynaty (1) ↔ Sosy, marynaty (133), similarity 1
- Sos sojowy (37) ↔ Sosy sojowe (7), similarity 0.82

## Duplicate Product Name Review

- Danie o smaku ostrego kurczaka Quattro Cheese Buldak 145g - Samyang
  - ADG-001760: https://asiandeligo.eshoper.pro/products/danie-o-smaku-ostrego-kurczaka-quattro-cheese-buldak-145g-samyang-adg001760
  - ADG-001282: https://asiandeligo.eshoper.pro/products/danie-o-smaku-ostrego-kurczaka-quattro-cheese-buldak-145g-samyang-adg001282
- Kaki no Tane, przyprawione krakersy ryżowe arare z orzeszkami 180g (6 x 30g) - KAMEDA
  - ADG-001350: https://asiandeligo.eshoper.pro/products/kaki-no-tane-przyprawione-krakersy-ryzowe-arare-z-orzeszkami-180g-6-x-30g-kameda-adg001350
  - ADG-001463: https://asiandeligo.eshoper.pro/products/kaki-no-tane-przyprawione-krakersy-ryzowe-arare-z-orzeszkami-180g-6-x-30g-kameda-adg001463
- Mleko kokosowe (70% wyciągu z kokosa) 1L w kartonie AROY-D
  - ADG-000033: https://asiandeligo.eshoper.pro/products/mleko-kokosowe-70-wyciagu-z-kokosa-1l-w-kartonie-aroy-d-adg000033
  - ADG-001446: https://asiandeligo.eshoper.pro/products/mleko-kokosowe-70-wyciagu-z-kokosa-1l-w-kartonie-aroy-d-adg001446
- Ryż jaśminowy Fragrant Jasmine Rice 1kg Tilda
  - ADG-001732: https://asiandeligo.eshoper.pro/products/ryz-jasminowy-fragrant-jasmine-rice-1kg-tilda-adg001732
  - ADG-001782: https://asiandeligo.eshoper.pro/products/ryz-jasminowy-fragrant-jasmine-rice-1kg-tilda-adg001782
- Sos rybny Myeolchi Aekjeot z anchois 870ml - Hansung
  - ADG-001666: https://asiandeligo.eshoper.pro/products/sos-rybny-myeolchi-aekjeot-z-anchois-870ml-hansung-adg001666
  - ADG-001507: https://asiandeligo.eshoper.pro/products/sos-rybny-myeolchi-aekjeot-z-anchois-870ml-hansung-adg001507
- Zestaw do herbaty matcha zielony, 4 elementy - Edo Japan
  - ADG-001327: https://asiandeligo.eshoper.pro/products/zestaw-do-herbaty-matcha-zielony-4-elementy-edo-japan-adg001327
  - ADG-000612: https://asiandeligo.eshoper.pro/products/zestaw-do-herbaty-matcha-zielony-4-elementy-edo-japan-adg000612

## Filter Value Coverage

### Dietary Tags
- vegetarian: 64
- vegan: 36
- gluten-free: 32

### Storage Zones
- AMBIENT: 1106
- CHILLED: 65
- FROZEN: 11

### Stock Values
- 100: 1750
- 0: 17
- 1: 6
- 2: 6
- 3: 5

### Top Allergens
- soybeans: 679
- cereals: 583
- milk: 283
- sesame: 194
- fish: 141
- eggs: 96
- crustaceans: 76
- nuts: 71
- mustard: 67
- molluscs: 54
- celery: 50
- peanuts: 40
- sulphites: 22
- lupin: 1

### Top Countries Of Origin
- Japonia: 442
- Korea Południowa: 418
- Chiny: 334
- Tajlandia: 171
- Wietnam: 62
- Indonezja: 46
- Polska: 42
- Tajwan: 22
- Francja: 15
- Hiszpania: 15
- Holandia: 15
- Unia Europejska: 15
- Filipiny: 13
- Indie: 13
- Turcja: 10
- Niemcy: 8
- Singapur: 8
- Hong Kong: 6
- Wielka Brytania: 6
- Włochy: 5

## EAN / GTIN Audit

- Active variant rows matched: 1784
- Products with an identifier: 2 / 1784
- Products missing an identifier: 1782
- Valid checksums: 0
- Invalid checksums/formats: 2
- Values in product_variants.ean: 2
- Values found only in fallback barcode/product fields: 0
- Duplicate normalized identifiers: 0

## Image Audit

- Unique URLs checked: 2225
- Broken URLs: 0

### Image Source Domains
- img.zira.pl: 2225

### Most Reused Image URLs
- No image URL is shared by multiple products.

## Specific Filter Gaps

- Gluten-free text candidates without dietary gluten tag: 0
- Vegetarian text candidates without vegetarian tag: 3
- Baza do zupy Tom Yum, łagodna 80g - Sen Soy (ADG-000507, Buliony)
- Sos ostrygowy Mae Krua 300ml (ADG-000190, Sosy, marynaty)
- Sos ostrygowy Premium 255g - Lee Kum Kee (ADG-000532, Sosy, marynaty)

## Top Product Fix Queue

- Nóż Tomoko Yanagi-Sashimi 20,5cm - Satake Cutlery (ADG-001744, Noże) — legacy image key, out of stock, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [review]
- Patelnia stalowa do tamagoyaki - duża (22 x 23 cm) Emro Aziatica (ADG-000426, Patelnie Tamago) — legacy image key, out of stock, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [review]
- Zestaw do sushi żółto-brązowy, 6 elementów - Edo Japan (ADG-001423, Komplety do sushi i herbaty) — legacy image key, out of stock, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [review]
- Aloe CICA Waterproof Sunscreen SPF 50+ PA++++ Wodoodporny żel przeciwsłoneczny o działaniu kojącym i nawilżającym 100ml Holika Holika (ADG-001551, Koreańskie kosmetyki) — legacy image key, out of stock, non ascii category slug, missing allergens, missing nutrition, missing storage zone, missing ean [review]
- Płatki suszonego tuńczyka bonito, Katsuobushi 40g - Wadakyu (ADG-000637, Buliony) — legacy image key, out of stock, missing nutrition, missing country, missing ean [review]
- Ryż kleisty tajski Glutinous Rice 1kg - Golden Phoenix (ADG-001684, Ryż i inne ziarna) — legacy image key, out of stock, non ascii category slug, missing allergens, missing ean [review]
- Syrop koncentrat Mojito Zero cukru 600ml - Teisseire (ADG-000946, Napoje) — legacy image key, out of stock, missing allergens, missing storage zone, missing ean [review]
- Syrop kukurydziany 100% 2,45kg - CJO Essential (ADG-000201, Sosy, marynaty) — legacy image key, out of stock, missing allergens, missing storage zone, missing ean [review]
- Żelki Puré Gummy Muscat o smaku winogronowym 56g - Kanro (ADG-001314, Słodycze / Przekąski) — legacy image key, out of stock, non ascii category slug, missing allergens, missing ean [review]
- Zupa makaronowa Jin Ramen Veggie, lekko pikantna 110g - Ottogi (ADG-000671, Ramyun / Ramen) — legacy image key, missing storage zone, missing ean, vegetarian ingredient conflict candidate, vegan ingredient conflict candidate [review]
- Chrupki Zzaldduk o smaku ostrego kurczaka Buldak 2xSpicy, ostre 80g - Samyang (ADG-000889, Słodycze / Przekąski) — legacy image key, out of stock, non ascii category slug, missing ean [review]
- Makaron Konjac, fettuccine 20 x 270g (cały karton) - Asia Style (ADG-000725, Makaron konjac) — legacy image key, out of stock, missing allergens, missing ean [review]
- Makaron ramen świeży  ITA-SAN 200g (ADG-000144, Makaron pszenny) — legacy image key, out of stock, missing storage zone, missing ean [review]
- Zestaw DIY Popin Cookin Choco Fondue Party 31g - Kracie (ADG-000885, Słodycze / Przekąski) — legacy image key, out of stock, non ascii category slug, missing ean [review]
- Zupa instant Shin Kimchi Ramyun, ostra - 5-pak (5 x 120g) Nongshim (ADG-000502, Ramyun / Ramen) — legacy image key, missing storage zone, missing ean, vegetarian ingredient conflict candidate [review]
- Zupa instant Shin Kimchi Ramyun, ostra 120g Nongshim (ADG-000096, Ramyun / Ramen) — legacy image key, missing storage zone, missing ean, vegetarian ingredient conflict candidate [review]
- Zupa makaronowa Jin Ramen Veggie, lekko pikantna 4 x 110g - Ottogi (ADG-000672, Ramyun / Ramen) — legacy image key, missing ean, vegetarian ingredient conflict candidate, vegan ingredient conflict candidate [review]
- Zupa makaronowa Shin Kimchi Ramyun, ostra 20 x 120g (cały karton) - Nongshim (ADG-001208, Ramyun / Ramen) — legacy image key, missing storage zone, missing ean, vegetarian ingredient conflict candidate [review]
- Curry Medium Hot - curry instant w proszku 1kg - Ottogi (ADG-000660, Dania gotowe) — legacy image key, out of stock, missing ean [review]
- Danie Tangle makaron z kremowym sosem bulgogi 105g - Samyang (ADG-001639, Ramyun / Ramen) — legacy image key, out of stock, missing ean [review]
- Dried Soy Stick Beef Flavor, wegetariańskie szaszłyki na ostro z suszonego tofu o smaku wołowiny shaokao 60g - Joytofu XiangXiangZui (ADG-001191, Dania gotowe) — legacy image key, missing ean, vegetarian ingredient conflict candidate [review]
- Fermentowane tofu (hong furu) w czerwonym różanym sosie 340g - Wangzhihe (ADG-001054, Sosy, marynaty) — legacy image key, out of stock, missing ean [review]
- Ryż basmati 5kg - Laila (ADG-000393, Unmapped) — legacy image key, missing allergens, invalid ean [review]
- Sos Teriyaki, japońska marynata 1L - Sen Soy (ADG-000647, Sosy, marynaty) — legacy image key, out of stock, missing ean [review]
- Zupa instant o smaku warzywnym z makaronem ryżowym 55g - MAMA (ADG-000820, Ramyun / Ramen) — legacy image key, missing ean, vegetarian ingredient conflict candidate [review]
- Zupa makaronowa instant o smaku warzywnym 40 x 75g - Indomie (ADG-001165, Ramyun / Ramen) — legacy image key, missing ean, vegetarian ingredient conflict candidate [review]
- Zupa makaronowa instant o smaku warzywnym 5 x 75g - Indomie (ADG-001199, Ramyun / Ramen) — legacy image key, missing ean, vegetarian ingredient conflict candidate [review]
- Baza do zupy, pasta do Hot Pot po syczuańsku 70g - Lee Kum Kee (ADG-000392, Pasty smakowe) — legacy image key, invalid ean [review]
- Pałeczki ze stali nierdzewnej 23cm - 1 para (ADG-000416, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Podstawka hashi-oki pod pałeczki Maneki Neko - 1 sztuka (ADG-000750, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Podstawka hashi-oki pod pałeczki Panda - 1 sztuka (ADG-000751, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw czarnych pałeczek 22,5cm - 10 par (ADG-000434, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw do zup, pałeczki ze stali nierdzewnej i łyżka - dla 1 osoby (ADG-000597, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw drewnianych pałeczek z motywem kwiatów wiśni 22,5cm - 2 pary (ADG-000519, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw drewnianych pałeczek z niebieskimi wzorami 22,5cm - 5 par (ADG-000632, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw Maneki Neko, pałeczki z ciemnego drewna z podstawkami 22,5cm - 4 pary (ADG-000748, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw pałeczek ze stali nierdzewnej 23cm - 5 par (ADG-000415, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw Panda, pałeczki z motywem bambusa z podstawkami 22,5cm - 4 par (ADG-000596, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw Seigaiha, pałeczki z ciemnego drewna z podstawkami 22,5cm - 4 par (ADG-000595, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Koszyk Wioli - Rodowity Koreańczyk (ADG-000607, *Kategoria tymczasowa) — legacy image key, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Koszyk Wioli - Znawca (ADG-000606, Kimchi) — legacy image key, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Moździerz granitowy - śr. 14cm (ADG-000067, Moździerze) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Moździerz granitowy - śr. 15,5cm (ADG-000068, Moździerze) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Moździerz granitowy - śr. 18cm (ADG-000065, Moździerze) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Pałeczki bambusowe - Niebieskie Wzory 22,5 cm (5 par) (ADG-000594, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Pałeczki bambusowe 21cm w kopertach - 50 par (ADG-000010, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Pałeczki bambusowe białe - wzór Maneki-neko 22,5 cm (5 par) (ADG-000413, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Pałeczki bambusowe brązowe - wzór Koty 22,5 cm (5 par) (ADG-000414, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Plastikowe pałeczki z pomocnikiem 22,5cm - Miś Panda (ADG-000429, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Plastikowe pałeczki z pomocnikiem 22,5cm - Miś Rilakkuma (ADG-000427, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Zestaw lakierowanych pałeczek z motywem kwiatów wiśni 22,5cm - 5 par (ADG-000616, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Foremka do futomaki sushi - duża rolka (ADG-000266, Foremki) — legacy image key, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Foremka do maki sushi - mała rolka (ADG-000258, Foremki) — legacy image key, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Kotek szczęścia Maneki Neko na baterię słoneczną, biały 10,5cm (ADG-000412, Koty szczęścia i inne gadżety) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing ean [backlog]
- Kotek szczęścia Maneki Neko na baterię słoneczną, złoty 10,5cm (ADG-000411, Koty szczęścia i inne gadżety) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing ean [backlog]
- Parowar bambusowy okrągły, dwupiętrowy 20 cm - Shi Ba Ling (ADG-000400, Parowary bambusowe) — legacy image key, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Stojak na miotełkę chasen do matchy, porcelanowy ⌀6cm - miętowo-zielony (ADG-001002, Komplety do sushi i herbaty) — legacy image key, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing english translation, missing english description, missing ean [backlog]
- Chiński nóż szefa kuchni, tasak 32,5 cm – do mięsa i warzyw - Xiao Tian Zi (ADG-000524, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Japońska rybka przynosząca szczęście złota 8x5cm (ADG-001221, Koty szczęścia i inne gadżety) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Japoński nóż Bunka szefa, uniwersalny 20cm - Satake Houcho (ADG-000585, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Japoński nóż Nakiri-boncho do warzyw, 16 cm - Seki Ryu (ADG-000379, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Japoński nóż w stylu chińskim, tasak Tao 20,5 cm – do mięsa i warzyw - Seki Ryu (ADG-000520, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Japoński nóż Yanagiba Sashimi do ryb 21cm - Satake Houcho (ADG-000525, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Japoński nóż Yanagiba Sashimi do ryb 27cm - Satake Cutlery (ADG-000586, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Kotek szczęścia Maneki Neko na baterię słoneczną, biały otwarte oczka 9cm (ADG-001325, Koty szczęścia i inne gadżety) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Kotek szczęścia Maneki Neko na baterię słoneczną, biały zamknięte oczka 9cm (ADG-001326, Koty szczęścia i inne gadżety) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Łopatka do ryżu Shamoji, drewniana 30cm (ADG-000601, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Łyżka japońska do ramenu, biała 12,5cm (ADG-001038, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Łyżka japońska do ramenu, czarna 12,5cm (ADG-000744, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Łyżka-nabierka Otama, drewniana 18cm (ADG-000599, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Moździerz granitowy - śr. 18cm - Jade Temple (ADG-001420, Moździerze) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż OSAKA Annaki, uniwersalny 20cm - CSS (ADG-000590, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż OSAKA Pankiri do chleba 20cm - CSS (ADG-000592, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż OSAKA Santoku, uniwersalny 18cm - CSS (ADG-000588, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż OSAKA Yanagi-ba do ryb i sushi 23cm - CSS (ADG-000587, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż OSAKA Yunibasaru, uniwersalny 13cm - CSS (ADG-000591, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż Saku Santoku uniwersalny 17cm - Satake Cutlery (ADG-001747, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż Saku Sashimi Yanagiba 21cm - Satake Cutlery (ADG-001745, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż Saku Szefa kuchni Air Holes 18cm - Satake Cutlery (ADG-001746, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż szefa kuchni 19cm - KIWI (ADG-000339, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż tasak do kości 20,5cm - KIWI (ADG-000569, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż tasak szefa kuchni 19cm - KIWI (ADG-000338, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż tasak szefa kuchni, mały 16,5 cm - KIWI (ADG-000570, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż Tomoko Deba do filetowania ryb 15,5cm - Satake Cutlery (ADG-001742, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż Tomoko Santoku uniwersalny 17cm - Satake Cutlery (ADG-001740, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Nóż Tomoko Szefa kuchni uniwersalny 18cm - Satake Cutlery (ADG-001743, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Ostrzałka kamienna (1200) (ADG-000753, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Pałeczki bambusowe 21cm w kopertach 100 par (ADG-000011, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Pałeczki bambusowe kwadratowe 24 cm (10 par) Jade Temple (ADG-000122, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Pałeczki bambusowe kwadratowe 26,5 cm (10 par) Emro Aziatica (ADG-001663, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Pałeczki bambusowe w kopertach 10 szt. - Asia Kitchen (ADG-000622, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Plastikowe pałeczki z pomocnikiem 22,5cm - Króliczek (ADG-000754, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Plastikowe pałeczki z pomocnikiem 22,5cm - Maneki Neko (ADG-000428, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Pomocniki do pałeczek / nakładka na pałeczki 10 szt. (ADG-000783, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Pomocniki do pałeczek / nakładka na pałeczki 100 szt. czarne/czerwone (ADG-001156, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Pomocniki do pałeczek / nakładka na pałeczki 5 szt. (ADG-000782, Pałeczki i sztućce) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Sushi Set Gold Premium XXL, zestaw do sushi dla 6-8 osób - Asia Kitchen (ADG-000521, Zestawy do sushi) — legacy image key, missing ingredients, missing allergens, missing nutrition, missing country, missing storage zone, missing unit price, missing ean [backlog]
- Zestaw 2 noży japońskich Houcho - Santoku + Nakiri - Satake Cutlery (ADG-000531, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Zestaw 2 noży NARA, Yanagi-ba do sushi (21cm) i Santoku (11cm) - CSS (ADG-000101, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]
- Zestaw 3 noży japońskich Megumi - Sashimi + Gyuto + Nakiri - Satake Cutlery (ADG-000615, Noże) — legacy image key, non ascii category slug, missing ingredients, missing allergens, missing nutrition, missing storage zone, missing unit price, missing ean [backlog]

## Recommended Next Batch

1. Fix blocker rows first: image availability, SKU/slug, price, stock field, category and variant structure.
2. Send explicit gluten-free/vegetarian/vegan conflict candidates for human confirmation; never infer food safety claims automatically.
3. Build EAN collection around supplier labels or owner photos; online lookup may suggest candidates but must not be accepted without barcode verification.
4. Replace temporary stock 100 with POS/physical inventory only when the owner is ready; do not treat it as audited inventory.
5. Backfill English descriptions and high-value food metadata after launch blockers are closed.
