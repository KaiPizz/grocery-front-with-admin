# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T07:25:46.263Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 24 |
| no_metadata_found | 1 |
| fetch_error | 0 |
| rows with candidate allergens | 0 |
| rows with nutrition block | 15 |
| rows with storage text | 7 |
| rows with ingredients text | 21 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000118 | Trawa cytrynowa suszona w kawałkach 50g | - | - | no | https://kimchi.pl/product-pol-436.html |
| ADG-000193 | Sos Hoisin 455ml - Flying Goose | - | - | yes | https://kimchi.pl/product-pol-808.html |
| ADG-000211 | Ocet z brązowego ryżu 900ml - CJO Essential | - | - | no | https://kimchi.pl/product-pol-863.html |
| ADG-000219 | Mieszanka przypraw do zupy Pho - anyż, cynamon, kardamon 100g - Hiep Long | - | - | no | https://kimchi.pl/product-pol-901.html |
| ADG-000372 | Sos sojowy o zmniejszonej zawartości soli 150ml - Kikkoman | - | - | yes | https://kimchi.pl/product-pol-1541.html |
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

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch25-source-review-20260722.csv
