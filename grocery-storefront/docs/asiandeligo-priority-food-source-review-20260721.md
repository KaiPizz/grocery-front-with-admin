# Kimchi Source Metadata Dry Run

Generated: 2026-07-21T19:37:52.738Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Catalog total: 1779
Inspected products: 200

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 199 |
| no_metadata_found | 1 |
| fetch_error | 0 |
| rows with candidate allergens | 44 |
| rows with nutrition block | 147 |
| rows with storage text | 105 |
| rows with ingredients text | 186 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000118 | Trawa cytrynowa suszona w kawałkach 50g | - | - | no | https://kimchi.pl/product-pol-436.html |
| ADG-000193 | Sos Hoisin 455ml - Flying Goose | - | - | yes | https://kimchi.pl/product-pol-808.html |
| ADG-000211 | Ocet z brązowego ryżu 900ml - CJO Essential | - | - | no | https://kimchi.pl/product-pol-863.html |
| ADG-000219 | Mieszanka przypraw do zupy Pho - anyż, cynamon, kardamon 100g - Hiep Long | - | - | no | https://kimchi.pl/product-pol-901.html |
| ADG-000270 | Suszone liście limonki kaffir, liście papedy całe 25g - Thai Dancer | - | - | no | https://kimchi.pl/product-pol-1135.html |
| ADG-000372 | Sos sojowy o zmniejszonej zawartości soli 150ml - Kikkoman | - | AMBIENT | yes | https://kimchi.pl/product-pol-1541.html |
| ADG-000437 | Ocet ryżowy 1l - Asia Kitchen | - | - | no | https://kimchi.pl/product-pol-2254.html |
| ADG-000455 | Glutaminian sodu, Aji-no-Moto MSG 200g - Ajinomoto | - | - | no | https://kimchi.pl/product-pol-2329.html |
| ADG-000497 | Glutaminian sodu, Aji-no-Moto MSG 454g - Ajinomoto | - | - | no | https://kimchi.pl/product-pol-2518.html |
| ADG-001241 | Koreański sos rybny do kimchi Kanari Jeot 800g - YakMokCham | - | - | no | https://kimchi.pl/product-pol-4974.html |
| ADG-000054 | Pasta Curry Massaman 50g | - | AMBIENT | yes | https://kimchi.pl/product-pol-190.html |
| ADG-000055 | Pasta curry czerwona 50g | - | AMBIENT | yes | https://kimchi.pl/product-pol-191.html |
| ADG-000056 | Pasta curry zielona 50g Cock Brand | - | AMBIENT | yes | https://kimchi.pl/product-pol-192.html |
| ADG-000073 | Galangal w proszku 100g Cock Brand | - | AMBIENT | no | https://kimchi.pl/product-pol-269.html |
| ADG-000078 | Pasta z tamaryndowca 227g - Suree | - | - | yes | https://kimchi.pl/product-pol-279.html |
| ADG-000079 | Dhania, kolendra mielona 100g TRS | - | AMBIENT | no | https://kimchi.pl/product-pol-281.html |
| ADG-000085 | Pasta curry czerwona 400g | - | - | yes | https://kimchi.pl/product-pol-318.html |
| ADG-000091 | Cukier trzcinowy (brązowy) nierafinowany 500g - Mauritius Golden Cane | - | - | yes | https://kimchi.pl/product-pol-343.html |
| ADG-000092 | Syrop kukurydziany 100% 700g - CJO Essential | - | - | yes | https://kimchi.pl/product-pol-348.html |
| ADG-000097 | Słodko-pikantny sos chili do kurczaka 650ml - Cock Brand | - | - | yes | https://kimchi.pl/product-pol-357.html |
| ADG-000116 | Mąka ryżowa, bezglutenowa 400g - Cock Brand | - | - | yes | https://kimchi.pl/product-pol-426.html |
| ADG-000117 | Mąka ryżowa kleista 400g bezglutenowa - Cock Brand | - | - | yes | https://kimchi.pl/product-pol-427.html |
| ADG-000119 | Sos chili Sriracha, bardzo ostry (chili 70%) 200ml - Flying Goose | - | - | yes | https://kimchi.pl/product-pol-440.html |
| ADG-000125 | Tapioka, perełki małe 400g - Cock Brand | - | - | yes | https://kimchi.pl/product-pol-468.html |
| ADG-000128 | Tapioka, perełki duże 454g - Cock Brand | - | - | yes | https://kimchi.pl/product-pol-493.html |
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
| ADG-000209 | Sos chili Sambal Oelek (chili 86%) 750g - Windmill | - | AMBIENT | yes | https://kimchi.pl/product-pol-860.html |
| ADG-000213 | Pasta Inaka Aka Miso, ciemna 400g - Hikari Miso | - | CHILLED | yes | https://kimchi.pl/product-pol-874.html |
| ADG-000246 | Wino ryżowe do gotowania Mijak (Mirin) imbirowo-śliwkowe 410ml - CJO Essential | - | - | yes | https://kimchi.pl/product-pol-1026.html |
| ADG-000248 | Syrop ryżowy 100% 700g - CJO Essential | - | - | yes | https://kimchi.pl/product-pol-1032.html |
| ADG-000255 | Zaprawa do ryżu 500ml - Miyata | - | - | yes | https://kimchi.pl/product-pol-1065.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-priority-food-source-review-20260721.csv
