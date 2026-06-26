# Kimchi Source Metadata Dry Run

Generated: 2026-06-25T19:48:11.927Z
Channel: kenmito
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html via r.jina.ai
Catalog total: 1784
Inspected products: 20

This is a read-only scrape report. It does not mutate product data.

## Summary

| Metric | Count |
| --- | ---: |
| review_candidate | 20 |
| no_metadata_found | 0 |
| fetch_error | 0 |
| rows with candidate allergens | 7 |
| rows with nutrition block | 11 |
| rows with storage text | 9 |
| rows with ingredients text | 20 |

## Sample Candidates

| SKU | Product | Allergens | Storage | Nutrition | Source |
| --- | --- | --- | --- | --- | --- |
| KIMCHI-5216 | 2 x Angel Hair Chocolate, zestaw czekolad z anielskim włosiem i pistacjami - biała i różowa 80g Mistachio | cereals|soybeans|milk|nuts | AMBIENT | yes | https://kimchi.pl/product-pol-5216.html |
| KIMCHI-5215 | 2 x Dubai Chocolate, zestaw czekolad dubajskich z kremem pistacjowym i ciastem kataifi - mleczna i biała 160g Q Chew | cereals|soybeans|milk|nuts | AMBIENT | yes | https://kimchi.pl/product-pol-5215.html |
| KIMCHI-5034 | Ajitsuke Menma, marynowane fermentowane pędy bambusa w plasterkach 100g - Momoya | cereals|soybeans|sesame | AMBIENT | yes | https://kimchi.pl/product-pol-5034.html |
| KIMCHI-1428 | Ajitsuke Shiitake, grzyby w słodkiej zalewie 500g - Asia Kitchen | cereals|soybeans | AMBIENT | yes | https://kimchi.pl/product-pol-1428.html |
| KIMCHI-14 | Algi nori do sushi, 6 listków - House of Asia | - | AMBIENT | yes | https://kimchi.pl/product-pol-14.html |
| KIMCHI-2761 | Algi Sushi Nori Gold 50 szt. - Sen Soy | - | - | yes | https://kimchi.pl/product-pol-2761.html |
| KIMCHI-2505 | Algi Sushi Nori Premium Gold 10 szt - Asia Kitchen | - | - | yes | https://kimchi.pl/product-pol-2505.html |
| KIMCHI-2506 | Algi Sushi Nori Premium Gold 3 x 10 szt - Asia Kitchen | - | - | yes | https://kimchi.pl/product-pol-2506.html |
| KIMCHI-2507 | Algi Sushi Nori Premium Gold 5 x 10 szt - Asia Kitchen | - | - | yes | https://kimchi.pl/product-pol-2507.html |
| KIMCHI-5450 | Aloe 97% Soothing Gel Lotion Intensive Moisturizing 240ml - intensywnie nawilżający aloesowy balsam do ciała - Holika Holika | - | - | no | https://kimchi.pl/product-pol-5450.html |
| KIMCHI-5449 | Aloe 99% Soothing Gel 250ml - wielofunkcyjny żel aloesowy do twarzy, ciała i włosów - Holika Holika | - | - | no | https://kimchi.pl/product-pol-5449.html |
| KIMCHI-5452 | Aloe CICA Waterproof Sunscreen SPF 50+ PA++++ Wodoodporny żel przeciwsłoneczny o działaniu kojącym i nawilżającym 100ml Holika Holika | - | - | no | https://kimchi.pl/product-pol-5452.html |
| KIMCHI-5451 | Aloe Facial Cleansing Foam Pianka do oczyszczania twarzy z ekstraktem z aloesu 150ml Holika Holika | - | - | no | https://kimchi.pl/product-pol-5451.html |
| KIMCHI-5454 | Aloe Soothing Jelly Mask Fresh 23ml - Aloesowa maseczka do twarzy w płachcie - Holika Holika | - | - | no | https://kimchi.pl/product-pol-5454.html |
| KIMCHI-5214 | Angel Hair White Chocolate, biała czekolada z pistacjami i anielskim włosiem 80g - Mistachio | cereals|soybeans|milk|nuts | AMBIENT | yes | https://kimchi.pl/product-pol-5214.html |
| KIMCHI-3440 | Anyż gwiaździsty, cały 50g - TRS | cereals|milk|nuts | AMBIENT | no | https://kimchi.pl/product-pol-3440.html |
| KIMCHI-5463 | Aqua Petit BB 30ml - lekki krem BB z ekstraktem z zielonej herbaty - Holika Holika | - | - | no | https://kimchi.pl/product-pol-5463.html |
| KIMCHI-5832 | Aqua Petit Jelly BB SPF20 40ml - lekki krem BB + gąbeczka - Holika Holika | - | - | no | https://kimchi.pl/product-pol-5832.html |
| KIMCHI-3795 | Bancha, zielona herbata z późnego zbioru 60g - Maruka | - | AMBIENT | no | https://kimchi.pl/product-pol-3795.html |
| KIMCHI-5722 | Baza do zupy hot pot, bardzo ostra 220g - HAIDILAO | cereals|soybeans|nuts | AMBIENT | yes | https://kimchi.pl/product-pol-5722.html |

## Review Notes

- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.
- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.
- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.
- Cosmetic/non-food rows should be excluded before any legal food metadata apply.

CSV detail report: docs/kimchi-source-metadata-sample.csv
