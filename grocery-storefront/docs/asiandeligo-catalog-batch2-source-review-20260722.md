# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T08:24:43.063Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Cohort offset: 25
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 24 |
| no_metadata_found | 1 |
| fetch_error | 0 |
| rows with candidate allergens | 2 |
| rows with nutrition block | 17 |
| rows with storage text | 9 |
| rows with ingredients text | 18 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000155 | Płatki suszonego tuńczyka bonito, Katsuobushi 20g | fish | AMBIENT | no | https://kimchi.pl/product-pol-639.html |
| ADG-000163 | Mleko kokosowe (70% wyciągu z kokosa) w kartonie 500ml - AROY-D | - | AMBIENT | yes | https://kimchi.pl/product-pol-682.html |
| ADG-000168 | Pasta Harissa ostra (chili 87%) 135g - Le Phare Du Cap Bon | - | - | yes | https://kimchi.pl/product-pol-728.html |
| ADG-000176 | Papryka Gochugaru / Red Pepper Powder 500g - OURHOME | - | - | yes | https://kimchi.pl/product-pol-748.html |
| ADG-000177 | Papryka Gochugaru do kimchi 500g - Ourhome | - | - | yes | https://kimchi.pl/product-pol-749.html |
| ADG-000191 | Chrzan wasabi w proszku S&B puszka 30g | - | - | no | https://kimchi.pl/product-pol-796.html |
| ADG-000199 | Sos chili Sriracha z czosnkiem, ostry (51% chili) 730ml - Flying Goose | - | - | yes | https://kimchi.pl/product-pol-836.html |
| ADG-000200 | Sos chili Sriracha, bardzo ostry (chili 61%) 730ml - Flying Goose | - | AMBIENT | yes | https://kimchi.pl/product-pol-838.html |
| ADG-000201 | Syrop kukurydziany 100% 2,45kg - CJO Essential | - | AMBIENT | yes | https://kimchi.pl/product-pol-839.html |
| ADG-000206 | Pasta Harissa ostra (chili 87%) 70g - Le Phare Du Cap Bon | - | - | yes | https://kimchi.pl/product-pol-850.html |
| ADG-000209 | Sos chili Sambal Oelek (chili 86%) 750g - Windmill | - | - | yes | https://kimchi.pl/product-pol-860.html |
| ADG-000213 | Pasta Inaka Aka Miso, ciemna 400g - Hikari Miso | - | - | yes | https://kimchi.pl/product-pol-874.html |
| ADG-000246 | Wino ryżowe do gotowania Mijak (Mirin) imbirowo-śliwkowe 410ml - CJO Essential | - | - | yes | https://kimchi.pl/product-pol-1026.html |
| ADG-000248 | Syrop ryżowy 100% 700g - CJO Essential | - | - | yes | https://kimchi.pl/product-pol-1032.html |
| ADG-000255 | Zaprawa do ryżu 500ml - Miyata | - | - | yes | https://kimchi.pl/product-pol-1065.html |
| ADG-000174 | Makaron ryżowy czerwony Hiep Long 500g | - | - | no | https://kimchi.pl/product-pol-739.html |
| ADG-000301 | Makaron z brązowego ryżu Vermicelli, nitki 200g - MAMA | - | - | no | https://kimchi.pl/product-pol-1201.html |
| ADG-000405 | Jjajang Men, makaron z sosem z czarnej fasoli, łagodny 200g - Paldo | cereals|peanuts|soybeans|milk|nuts|celery|sesame|molluscs | - | yes | https://kimchi.pl/product-pol-2170.html |
| ADG-001154 | Ramen Kumamoto Mokkosu o smaku tonkotsu 104g - Itsuki | - | - | no | https://kimchi.pl/product-pol-4777.html |
| ADG-001210 | Ryż Basmati Everyday 1kg - India Gate | - | - | no | https://kimchi.pl/product-pol-4913.html |
| ADG-001374 | Danie makaronowe Bodle Bodle Stir-fry Cheese Ramen o smaku serowym, lekko pikantne 120g - Ottogi | - | - | no | https://kimchi.pl/product-pol-5200.html |
| ADG-000047 | Makaron ryżowy 3mm 400g Farmer | - | AMBIENT | yes | https://kimchi.pl/product-pol-157.html |
| ADG-000048 | Makaron ryżowy 5mm 400g Farmer | - | AMBIENT | yes | https://kimchi.pl/product-pol-158.html |
| ADG-000059 | Ryż do sushi Kimpo Calrose 9,07 kg | - | AMBIENT | yes | https://kimchi.pl/product-pol-199.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch2-source-review-20260722.csv
