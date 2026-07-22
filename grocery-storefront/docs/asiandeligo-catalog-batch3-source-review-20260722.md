# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T09:11:15.178Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Cohort offset: 50
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 25 |
| no_metadata_found | 0 |
| fetch_error | 0 |
| rows with candidate allergens | 3 |
| rows with nutrition block | 23 |
| rows with storage text | 15 |
| rows with ingredients text | 24 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000104 | Makaron ryżowy 10mm 400g - Farmer | - | AMBIENT | yes | https://kimchi.pl/product-pol-387.html |
| ADG-000123 | Makaron sojowy Vermicelli 500g, pakowane po 5x100g - LongKou | - | - | yes | https://kimchi.pl/product-pol-457.html |
| ADG-000250 | Makaron ryżowy 1mm 400g - Farmer | - | AMBIENT | yes | https://kimchi.pl/product-pol-1055.html |
| ADG-000251 | Makaron Shirataki Konjac, nitki 400g - City Aroma | - | - | yes | https://kimchi.pl/product-pol-1057.html |
| ADG-000280 | Makaron sojowy vermicelli LongKou 1kg, porcjowany 20 x 50g | - | - | yes | https://kimchi.pl/product-pol-1153.html |
| ADG-000346 | Ryż czarny kleisty (Ketan Itam) 400g - North South | - | - | yes | https://kimchi.pl/product-pol-1437.html |
| ADG-000419 | Zupa Kimchi ramen Hot & Spicy z prawdziwym kimchi 122g - Jongga | cereals|fish|soybeans|milk | - | yes | https://kimchi.pl/product-pol-2212.html |
| ADG-000547 | Ryż do sushi Tsuru 1kg - Curtiriso | - | AMBIENT | yes | https://kimchi.pl/product-pol-2670.html |
| ADG-000578 | Kluski ryżowe do Tteokbokki, małe słupki 600g (3 x 200g) - Matamun | - | - | yes | https://kimchi.pl/product-pol-2845.html |
| ADG-000581 | Kluski ryżowe do Tteokguk, małe plasterki 600g (3 x 200g) - Matamun | - | - | yes | https://kimchi.pl/product-pol-2858.html |
| ADG-000640 | Zupa makaronowa Demae Ramen o smaku kaczki 100g - Nissin | cereals|soybeans|milk|mustard|sesame | - | yes | https://kimchi.pl/product-pol-3071.html |
| ADG-000693 | Zupa makaronowa Demae Ramen o smaku miso 100g - Nissin | cereals|crustaceans|fish|soybeans|milk|sesame|molluscs | - | yes | https://kimchi.pl/product-pol-3267.html |
| ADG-000781 | Ryż jaśminowy Premium Quality Orange 5kg - Royal Umbrella | - | AMBIENT | no | https://kimchi.pl/product-pol-3742.html |
| ADG-000968 | Makaron ryżowy Vermicelli Bun Gao 400g - ICV | - | - | yes | https://kimchi.pl/product-pol-4334.html |
| ADG-001008 | Kluski ryżowe do tteokbokki krojone, małe słupki A+ 500g - HoSan | - | - | yes | https://kimchi.pl/product-pol-4428.html |
| ADG-001021 | Ryż Basmati Original 1kg - Swad | - | - | yes | https://kimchi.pl/product-pol-4455.html |
| ADG-001039 | Ryż jaśminowy Thai Hom Mali Rice 1kg - Aroy-D | - | - | yes | https://kimchi.pl/product-pol-4518.html |
| ADG-001285 | Ryż kleisty tajski 1kg - Better Brand STC | - | AMBIENT | no | https://kimchi.pl/product-pol-5057.html |
| ADG-001415 | Ryż Basmati Premium Quality 1kg - Royal Tiger | - | - | yes | https://kimchi.pl/product-pol-5260.html |
| ADG-000002 | Ryż jaśminowy Premium Thai Hom Mali 1kg Smart Chef | - | AMBIENT | yes | https://kimchi.pl/product-pol-10.html |
| ADG-000013 | Makaron ryżowy LaMi M do Pho 500g Hiep Long | - | AMBIENT | yes | https://kimchi.pl/product-pol-38.html |
| ADG-000014 | Makaron ryżowy Vermicelli, nitki 454g Farmer | - | AMBIENT | yes | https://kimchi.pl/product-pol-39.html |
| ADG-000015 | Makaron ryżowy do dania Bun Cha 500g Hiep Long | - | AMBIENT | yes | https://kimchi.pl/product-pol-40.html |
| ADG-000017 | Makaron sojowy Vermicelli 100g LongKou | - | AMBIENT | yes | https://kimchi.pl/product-pol-42.html |
| ADG-000037 | Ryż do sushi 500g House of Asia | - | AMBIENT | yes | https://kimchi.pl/product-pol-134.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch3-source-review-20260722.csv
