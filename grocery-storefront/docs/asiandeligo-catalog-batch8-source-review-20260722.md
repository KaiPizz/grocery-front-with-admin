# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T13:45:49.589Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Cohort offset: 175
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 25 |
| no_metadata_found | 0 |
| fetch_error | 0 |
| rows with candidate allergens | 1 |
| rows with nutrition block | 22 |
| rows with storage text | 12 |
| rows with ingredients text | 20 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000492 | Algi Sushi Nori Premium Gold 3 x 10 szt - Asia Kitchen | - | - | yes | https://kimchi.pl/product-pol-2506.html |
| ADG-000493 | Algi Sushi Nori Premium Gold 5 x 10 szt - Asia Kitchen | - | - | yes | https://kimchi.pl/product-pol-2507.html |
| ADG-000537 | Glony do sushi Yaki Nori GOLD 10 szt. - KC | - | - | yes | https://kimchi.pl/product-pol-2648.html |
| ADG-000538 | Glony do sushi Yaki Nori GOLD 3 x 10 szt. - KC | - | - | yes | https://kimchi.pl/product-pol-2649.html |
| ADG-000539 | Glony do sushi Yaki Nori GOLD 5 x 10 szt. - KC | - | - | yes | https://kimchi.pl/product-pol-2650.html |
| ADG-000564 | Algi Sushi Nori Gold 50 szt. - Sen Soy | - | - | yes | https://kimchi.pl/product-pol-2761.html |
| ADG-000105 | Papier ryżowy okrągły 22cm, 300g - Ricefield Cu Chi | - | - | no | https://kimchi.pl/product-pol-388.html |
| ADG-000121 | Papier ryżowy kwadratowy 16x16cm, 300g - Ricefield Cu Chi | - | - | yes | https://kimchi.pl/product-pol-448.html |
| ADG-000234 | Wakame (miyeok) suszone wodorosty sałatkowe 25g - CJO Essential | - | - | yes | https://kimchi.pl/product-pol-994.html |
| ADG-000352 | Wakame, suszone wodorosty 100g - Eagle Brand | - | - | yes | https://kimchi.pl/product-pol-1449.html |
| ADG-000025 | Wodorosty kombu 100g Asia Kitchen | - | AMBIENT | yes | https://kimchi.pl/product-pol-78.html |
| ADG-000702 | Edomae Inari Age, smażone kieszonki tofu (24 szt.) 540g - Nishimoto | - | - | no | https://kimchi.pl/product-pol-3396.html |
| ADG-000062 | Suszone grzyby mun, krojone 100g | - | AMBIENT | yes | https://kimchi.pl/product-pol-224.html |
| ADG-000069 | Grzyby shiitake w zalewie 284g Diamond | - | AMBIENT | yes | https://kimchi.pl/product-pol-242.html |
| ADG-000089 | Grzyby słomiane (pochwiaki) 425g - Diamond | - | - | yes | https://kimchi.pl/product-pol-335.html |
| ADG-000179 | Glony Dasima (kombu) suszone 56g - Assi Brand | - | - | yes | https://kimchi.pl/product-pol-756.html |
| ADG-000382 | Wodorosty Kombu / Dasima, cięte 150g - CJO Essential | - | AMBIENT | no | https://kimchi.pl/product-pol-1799.html |
| ADG-000957 | Grzyby shiitake w zalewie 284g - House of Asia | - | - | yes | https://kimchi.pl/product-pol-4290.html |
| ADG-000029 | Grzyby shiitake suszone 50g Asia Kitchen | - | AMBIENT | yes | https://kimchi.pl/product-pol-85.html |
| ADG-000034 | Grzyby shiitake suszone 100g Asia Kitchen | - | AMBIENT | yes | https://kimchi.pl/product-pol-128.html |
| ADG-000071 | Suszone grzyby mun, krojone 100g Asia Kitchen | - | AMBIENT | yes | https://kimchi.pl/product-pol-251.html |
| ADG-000308 | Yuba, suszone płaty tofu 200g - Swallow Sailing | soybeans | - | yes | https://kimchi.pl/product-pol-1275.html |
| ADG-000349 | Suszone grzyby mun, całe 50g - Green Pagoda | - | AMBIENT | yes | https://kimchi.pl/product-pol-1444.html |
| ADG-000350 | Suszone grzyby mun, nitki 50g - Green Pagoda | - | AMBIENT | yes | https://kimchi.pl/product-pol-1445.html |
| ADG-000371 | Suszone grzyby mun, krojone 1kg | - | AMBIENT | yes | https://kimchi.pl/product-pol-1535.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch8-source-review-20260722.csv
