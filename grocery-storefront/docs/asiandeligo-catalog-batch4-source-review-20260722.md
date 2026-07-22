# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T10:02:20.849Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Cohort offset: 75
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 25 |
| no_metadata_found | 0 |
| fetch_error | 0 |
| rows with candidate allergens | 15 |
| rows with nutrition block | 19 |
| rows with storage text | 14 |
| rows with ingredients text | 21 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-000040 | Ryż do sushi 1kg Kimpo | - | AMBIENT | yes | https://kimchi.pl/product-pol-146.html |
| ADG-000087 | Zupa makaronowa Neoguri Ramyun z owocami morza, ostra 120g - Nongshim | cereals|eggs|fish|peanuts|soybeans|milk|mustard|molluscs | - | yes | https://kimchi.pl/product-pol-324.html |
| ADG-000096 | Zupa instant Shin Kimchi Ramyun, ostra 120g Nongshim | cereals|eggs|peanuts|soybeans|milk|celery|mustard|sesame | - | yes | https://kimchi.pl/product-pol-355.html |
| ADG-000107 | Zupa Soon Veggie Ramyun, lekko pikantna 112g - Nongshim | cereals|eggs|peanuts|soybeans|milk|nuts|celery|sesame | - | yes | https://kimchi.pl/product-pol-404.html |
| ADG-000133 | Zupa instant Shin Ramyun, duża micha 114g - Nongshim | cereals|eggs|peanuts|soybeans|milk|celery|sesame | - | yes | https://kimchi.pl/product-pol-510.html |
| ADG-000274 | Larwy jedwabnika w zalewie 130g - Yoo Dong | - | - | no | https://kimchi.pl/product-pol-1140.html |
| ADG-000816 | Mochi, ryżowe ciasteczka w 3 smakach 250g - Royal Family | - | - | no | https://kimchi.pl/product-pol-3811.html |
| ADG-001046 | Chipsy ziemniaczane Chili Spicy Crayfish o smaku raka 104g - Lay's | - | - | no | https://kimchi.pl/product-pol-4531.html |
| ADG-001217 | Wafelki z nadzieniem Cream Collon Assari Milk 81g - Glico | - | - | no | https://kimchi.pl/product-pol-4923.html |
| ADG-000262 | Paluszki Pepero Migdały i Czekolada 32g - Lotte | cereals|eggs|soybeans|milk|nuts | - | no | https://kimchi.pl/product-pol-1090.html |
| ADG-000263 | Paluszki Pepero Czekoladowe Original 47g - Lotte | cereals|eggs|soybeans|milk | - | no | https://kimchi.pl/product-pol-1091.html |
| ADG-000286 | Jelly Belly Bean Boozled Spinner - Fasolki wszystkich smaków 100g | - | - | yes | https://kimchi.pl/product-pol-1176.html |
| ADG-000298 | Paluszki Pocky Cookies & Cream 40g - Glico | cereals|soybeans|milk|nuts | - | yes | https://kimchi.pl/product-pol-1196.html |
| ADG-000347 | Choco Pie, ciastka biszkoptowe z pianką, pudełko (12 szt. x 28g) - Lotte | cereals|eggs|soybeans|milk | - | yes | https://kimchi.pl/product-pol-1439.html |
| ADG-000396 | Chipsy z wodorostów, chrupiące nori 32g - Tao Kae Noi | - | - | yes | https://kimchi.pl/product-pol-2131.html |
| ADG-000575 | Chipsy ziemniaczane Potechi Wasabi Nori 100g - Koikeya | - | AMBIENT | yes | https://kimchi.pl/product-pol-2839.html |
| ADG-000965 | Hokkaido Yude Azuki, gotowana słodka czerwona fasola cała 200g - Imuraya | - | - | yes | https://kimchi.pl/product-pol-4316.html |
| ADG-000066 | Chipsy krewetkowe 75g - Nongshim | cereals | AMBIENT | yes | https://kimchi.pl/product-pol-238.html |
| ADG-000120 | Chipsy krewetkowe, pikantne 75g - Nongshim | cereals|soybeans|milk | - | yes | https://kimchi.pl/product-pol-443.html |
| ADG-000129 | Chipsy z jackfruita (dżakfruta) 250g - Vinamit | - | AMBIENT | yes | https://kimchi.pl/product-pol-494.html |
| ADG-000172 | Mochi, ryżowe ciasteczka z pastą z fasolki azuki 210g -  Yuki & Love | soybeans|nuts | - | yes | https://kimchi.pl/product-pol-737.html |
| ADG-000220 | Paluszki Pocky Czekoladowe Original 47g - Glico | cereals|soybeans|milk|nuts|sesame | AMBIENT | yes | https://kimchi.pl/product-pol-902.html |
| ADG-000221 | Pocky Double Choco, kakaowe paluszki z kremem czekoladowym 39g - Glico | cereals|soybeans|milk|nuts | AMBIENT | yes | https://kimchi.pl/product-pol-903.html |
| ADG-000222 | Paluszki Pocky Truskawkowe 45g - Glico | cereals|soybeans|milk|nuts | - | yes | https://kimchi.pl/product-pol-904.html |
| ADG-000227 | Orzeszki ziemne w skorupce kokosowej 185g - Khao Shong | cereals|crustaceans|fish|peanuts|milk|nuts | - | yes | https://kimchi.pl/product-pol-936.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch4-source-review-20260722.csv
