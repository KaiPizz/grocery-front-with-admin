# Kimchi Source Metadata Dry Run

Generated: 2026-07-22T12:39:24.074Z
Channel: asiandeligo
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Historical source mapping: docs/asiandeligo-sku-slug-source-20260708.json (1784 exact product IDs)
Cohort filter: docs/asiandeligo-priority-food-cohort-20260721.json (200 requested IDs)
Cohort offset: 150
Catalog total: 1779
Inspected products: 25

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 24 |
| no_metadata_found | 1 |
| fetch_error | 0 |
| rows with candidate allergens | 4 |
| rows with nutrition block | 23 |
| rows with storage text | 11 |
| rows with ingredients text | 23 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| ADG-001234 | Sweet Chili Tteokbokki, kluski ryżowe w sosie słodkie chili 290g - O'Food | soybeans | - | yes | https://kimchi.pl/product-pol-4958.html |
| ADG-001387 | Danie instant z ziemniaczanym makaronem Japchae Cup 82g - Sempio | cereals|soybeans|sesame | - | yes | https://kimchi.pl/product-pol-5223.html |
| ADG-001460 | Zupa Samgyetang z całym kurczakiem, ryżem, warzywami i jujube 800g Harim | - | AMBIENT | yes | https://kimchi.pl/product-pol-5330.html |
| ADG-001492 | Danie makaron świeży udon Korean Style Tteokbokki Chilli 187g - Bibigo | cereals|soybeans|sesame | - | yes | https://kimchi.pl/product-pol-5370.html |
| ADG-001493 | Danie makaron świeży udon Korean Style BBQ 187g - Bibigo | cereals|soybeans|sesame | - | yes | https://kimchi.pl/product-pol-5371.html |
| ADG-000074 | Mango, plastry w syropie lekko słodzonym 425g Diamond | - | - | yes | https://kimchi.pl/product-pol-270.html |
| ADG-000182 | Mango, przecier bez cukru 500g Philippine Brand | - | - | yes | https://kimchi.pl/product-pol-761.html |
| ADG-000217 | Rzodkiew Oshinko (Takuan) marynowana, pocięta 350g - Asia Kitchen | - | - | yes | https://kimchi.pl/product-pol-882.html |
| ADG-000605 | Napa kimchi, koreańska kiszona kapustka 80g - Jongga | - | - | yes | https://kimchi.pl/product-pol-2919.html |
| ADG-000793 | Fasola edamame, ziarna soi w zalewie 400g - ITA-SAN | - | - | yes | https://kimchi.pl/product-pol-3762.html |
| ADG-000998 | Pędy bambusa nitki 227g - Royal Orient | - | - | yes | https://kimchi.pl/product-pol-4405.html |
| ADG-001105 | Shiso-dzuke umeboshi, śliwki marynowane z shiso (12% soli) 100g - King of Plum | - | AMBIENT | yes | https://kimchi.pl/product-pol-4684.html |
| ADG-001166 | Rzodkiew Oshinko (Takuan) marynowana, pocięta 400g - Sakura | - | - | yes | https://kimchi.pl/product-pol-4796.html |
| ADG-001215 | Pędy bambusa plastry 227g - Royal Orient | - | - | yes | https://kimchi.pl/product-pol-4921.html |
| ADG-001571 | Fasola edamame, ziarna soi w zalewie 400g - House of Asia | - | - | yes | https://kimchi.pl/product-pol-5472.html |
| ADG-000020 | Pędy bambusa, paseczki 225g House of Asia | - | AMBIENT | yes | https://kimchi.pl/product-pol-65.html |
| ADG-000035 | Młody imbir marynowany różowy 190g - House of Asia | - | AMBIENT | yes | https://kimchi.pl/product-pol-132.html |
| ADG-000080 | Kiełki fasoli mung 330g Diamond | - | CHILLED | yes | https://kimchi.pl/product-pol-286.html |
| ADG-000276 | Zielony jackfruit w słonej zalewie 540g - Twin Elephants & Earth Brand | - | CHILLED | yes | https://kimchi.pl/product-pol-1145.html |
| ADG-000110 | Papier ryżowy okrągły 22cm, 500g - Hiep Long | - | - | no | https://kimchi.pl/product-pol-413.html |
| ADG-000535 | Wakame, suszone wodorosty 300g (3 x 100g) Nobi | - | AMBIENT | yes | https://kimchi.pl/product-pol-2645.html |
| ADG-000265 | Glony do sushi Yaki Nori GOLD 50 szt. - KC | - | - | yes | https://kimchi.pl/product-pol-1093.html |
| ADG-000453 | Glony Yaki Sushi Nori Gold, 50 szt. - Nobi | - | - | yes | https://kimchi.pl/product-pol-2326.html |
| ADG-000491 | Algi Sushi Nori Premium Gold 10 szt - Asia Kitchen | - | - | yes | https://kimchi.pl/product-pol-2505.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- ADG SKUs resolve a legacy source only through an exact live product ID match in the historical mapping JSON.
- A cohort filter restricts inspection by exact product ID; it is not a sales or bestseller signal.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/asiandeligo-catalog-batch7-source-review-20260722.csv
