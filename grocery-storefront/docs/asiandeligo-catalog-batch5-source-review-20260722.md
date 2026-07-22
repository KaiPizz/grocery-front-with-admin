# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T11:08:28.764Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Cohort offset: 100
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 25 |
| no_metadata_found | 0 |
| fetch_error | 0 |
| rows with candidate allergens | 6 |
| rows with nutrition block | 14 |
| rows with storage text | 15 |
| rows with ingredients text | 20 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000231 | Mochi, ryżowe ciasteczka z sezamem 210g - Yuki & Love | peanuts|soybeans|nuts|sesame | - | yes | https://kimchi.pl/product-pol-980.html |
| ADG-000249 | Mochi, ryżowe ciasteczka z orzeszkami ziemnymi 210g - Yuki & Love | peanuts|soybeans|nuts | - | yes | https://kimchi.pl/product-pol-1044.html |
| ADG-000264 | Paluszki Pepero Nude - wypełnione czekoladą 45g - Lotte | cereals|soybeans|milk|nuts | - | yes | https://kimchi.pl/product-pol-1092.html |
| ADG-000273 | Prażony bób z solą 170g - Six Fortune | - | AMBIENT | yes | https://kimchi.pl/product-pol-1138.html |
| ADG-000304 | Jelly Belly Harry Potter - Fasolki wszystkich smaków Bertiego Botta 35g | - | AMBIENT | yes | https://kimchi.pl/product-pol-1233.html |
| ADG-000316 | Krakersy ryżowe Arare, snack miks Yamato 300g - Golden Turtle Brand | cereals|soybeans|milk|nuts | AMBIENT | yes | https://kimchi.pl/product-pol-1317.html |
| ADG-000325 | Miękkie cukierki Malang Cow o smaku skondensowanego mleka 79g - LOTTE | soybeans|milk | - | yes | https://kimchi.pl/product-pol-1361.html |
| ADG-000331 | Prażony zielony groszek z wasabi 140g - Khao Shong | cereals|crustaceans|fish|milk|nuts | - | yes | https://kimchi.pl/product-pol-1385.html |
| ADG-000341 | Chipsy Hi Tempura, algi nori w tempurze 40g - Tao Kae Noi | - | - | yes | https://kimchi.pl/product-pol-1416.html |
| ADG-000351 | Chipsy Hi Tempura, algi nori w tempurze, pikantne 40g - Tao Kae Noi | - | - | yes | https://kimchi.pl/product-pol-1448.html |
| ADG-000292 | Kawa ziarnista Espresso Innovator 500g - Trung Nguyen | - | - | no | https://kimchi.pl/product-pol-1185.html |
| ADG-000293 | Kawa mielona Trung Nguyen Creative 3 - 250g | - | - | no | https://kimchi.pl/product-pol-1186.html |
| ADG-001263 | Kawa BOSS Manzoku Milk Banana mleczna bananowa 185ml - Suntory | - | - | no | https://kimchi.pl/product-pol-5031.html |
| ADG-001265 | Napój Dekavita C z witaminami 210ml - Suntory | - | - | no | https://kimchi.pl/product-pol-5033.html |
| ADG-001287 | Herbata liściasta zielona Green Tea 100g - Tian Hu Shan | - | - | no | https://kimchi.pl/product-pol-5063.html |
| ADG-001650 | Japońska czarna herbata Sakura z kwiatem wiśni 15 saszetek (24g) - Lipton | - | - | no | https://kimchi.pl/product-pol-5559.html |
| ADG-000457 | Hyunmi Nokcha - zielona herbata z brązowym ryżem, 50 saszetek - Ottogi | - | - | yes | https://kimchi.pl/product-pol-2333.html |
| ADG-000131 | Kawa mielona Trung Nguyen Sang Tao 4 - 340g | - | AMBIENT | no | https://kimchi.pl/product-pol-506.html |
| ADG-000189 | Herbata aloesowa 400g - All Groo | - | - | yes | https://kimchi.pl/product-pol-789.html |
| ADG-000239 | Herbata z yuzu 400g - All Gr∞ | - | - | yes | https://kimchi.pl/product-pol-1004.html |
| ADG-000291 | Kawa ziarnista Trung Nguyen Espresso Specialist - 500g | - | AMBIENT | no | https://kimchi.pl/product-pol-1184.html |
| ADG-000294 | Kawa wietnamska mielona Creative 4 (Arabica, Robusta) 250g - Trung Nguyen | - | AMBIENT | no | https://kimchi.pl/product-pol-1187.html |
| ADG-000296 | Kawa mielona Trung Nguyen Creative 5 - 250g | - | AMBIENT | no | https://kimchi.pl/product-pol-1189.html |
| ADG-000470 | Kawa mielona Trung Nguyen Sang Tao 5 - 340g | - | AMBIENT | no | https://kimchi.pl/product-pol-2390.html |
| ADG-000482 | Old Jamaica Ginger Beer Original, imbirowe piwo korzenne (0%) 2L | - | AMBIENT | yes | https://kimchi.pl/product-pol-2465.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch5-source-review-20260722.csv
