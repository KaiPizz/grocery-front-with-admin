# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T11:59:05.598Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Cohort offset: 125
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 23 |
| no_metadata_found | 2 |
| fetch_error | 0 |
| rows with candidate allergens | 10 |
| rows with nutrition block | 14 |
| rows with storage text | 17 |
| rows with ingredients text | 23 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000485 | Kawa mielona Trung Nguyen Che Phin 4 - 500g | - | AMBIENT | no | https://kimchi.pl/product-pol-2480.html |
| ADG-000658 | Kawa mielona Trung Nguyen Sang Tao 3 - 340g | - | AMBIENT | no | https://kimchi.pl/product-pol-3149.html |
| ADG-000759 | Matcha Uji-cha, sproszkowana zielona herbata 50g - Maruka | - | AMBIENT | no | https://kimchi.pl/product-pol-3692.html |
| ADG-000804 | Matcha Iri Genmaicha, zielona herbata z prażonym ryżem i matchą 70g - Maruka | - | AMBIENT | no | https://kimchi.pl/product-pol-3794.html |
| ADG-000805 | Bancha, zielona herbata z późnego zbioru 60g - Maruka | - | AMBIENT | no | https://kimchi.pl/product-pol-3795.html |
| ADG-000806 | Shizuoka Sencha, zielona herbata 50g - Maruka | - | AMBIENT | no | https://kimchi.pl/product-pol-3796.html |
| ADG-000807 | Hojicha, prażona zielona herbata 50g - Maruka | - | AMBIENT | no | https://kimchi.pl/product-pol-3797.html |
| ADG-000854 | Herbata z żeń-szenia instant (10 x 2g) 20g - Meridian | - | AMBIENT | no | https://kimchi.pl/product-pol-3935.html |
| ADG-000859 | Sok z limonki 250ml - Golden Turtle | - | AMBIENT | no | https://kimchi.pl/product-pol-3950.html |
| ADG-000526 | Mielonka wieprzowa Luncheon Meat 340g - Chung Jung One | milk | - | yes | https://kimchi.pl/product-pol-2625.html |
| ADG-000655 | Garlic Tteokbokki, kluski ryżowe w sosie czosnkowo-paprykowym 260g - O'Food | - | - | yes | https://kimchi.pl/product-pol-3134.html |
| ADG-000656 | Original Tteokbokki, kluski ryżowe w sosie gochujang 260g - O'Food | - | - | yes | https://kimchi.pl/product-pol-3135.html |
| ADG-000876 | Pocket Onigiri Kombu, kulka ryżowa instant z duszonymi algami 42g - Onisi | - | AMBIENT | yes | https://kimchi.pl/product-pol-4013.html |
| ADG-000901 | Danie instant Tteokbokki, kluski ryżowe w pikantnym sosie 160g - Sempio | cereals|soybeans | - | yes | https://kimchi.pl/product-pol-4098.html |
| ADG-000902 | Danie instant Tteokbokki, kluski ryżowe w słodko-pikantnym sosie 160g - Sempio | cereals|soybeans | - | yes | https://kimchi.pl/product-pol-4099.html |
| ADG-000914 | Wołowina konserwowa Corned Beef 340g - Hereford | - | AMBIENT | yes | https://kimchi.pl/product-pol-4142.html |
| ADG-000943 | Makaron stir-fry instant o smaku solonego jajka 85g - MAMA Oriental Kitchen | cereals|crustaceans|eggs|soybeans|milk|molluscs | - | yes | https://kimchi.pl/product-pol-4258.html |
| ADG-001068 | BBQ Tteokbokki, kluski ryżowe w sosie barbecue 260g - O'Food | soybeans | - | yes | https://kimchi.pl/product-pol-4595.html |
| ADG-001120 | Danie makaron carbonara o smaku bekonu 85g - MAMA Oriental Kitchen | cereals|crustaceans|eggs|fish|soybeans|milk|molluscs | - | yes | https://kimchi.pl/product-pol-4715.html |
| ADG-001121 | Zupa makaron Mala o smaku wołowiny 85g - MAMA Oriental Kitchen | cereals|crustaceans|eggs|fish|milk|molluscs | - | yes | https://kimchi.pl/product-pol-4716.html |
| ADG-001129 | Danie makaron udon Sesame Teriyaki Bowl 240g - Obento | cereals|soybeans|sesame | - | yes | https://kimchi.pl/product-pol-4737.html |
| ADG-001130 | Danie makaron udon Spicy Kung Pao Bowl 240g - Obento | cereals|peanuts|soybeans|nuts|sesame | - | yes | https://kimchi.pl/product-pol-4738.html |
| ADG-001205 | Danie makaron Tom Yum z krewetkami 85g - MAMA Oriental Kitchen | cereals|crustaceans|fish|soybeans|molluscs | - | yes | https://kimchi.pl/product-pol-4903.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch6-source-review-20260722.csv
