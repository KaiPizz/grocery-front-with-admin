# Kimchi Source Metadata Apply Plan

Generated: 2026-06-26T06:07:25.687Z
SQL: docs/kimchi-source-metadata-apply.sql
Backup table: kenmito_product_metadata_backup_20260626

This report is generated from the dry-run CSV. The SQL fills missing Kenmito product fields only and keeps existing values.

## Counts

| Metric | Count |
| --- | ---: |
| candidate rows | 1552 |
| with ingredients | 1547 |
| with nutrition facts | 1467 |
| with allergens | 938 |
| with storage zone | 1182 |
| skipped non-food candidates | 49 |

## Sample Updates

| SKU | Product | Category | Ingredients | Nutrition | Allergens | Storage |
| --- | --- | --- | ---: | ---: | ---: | --- |
| KIMCHI-5216 | 2 x Angel Hair Chocolate, zestaw czekolad z anielskim włosiem i pistacjami - biała i różowa 80g Mistachio | słodycze-przekąski | yes | yes | cereals soybeans milk nuts | AMBIENT |
| KIMCHI-5215 | 2 x Dubai Chocolate, zestaw czekolad dubajskich z kremem pistacjowym i ciastem kataifi - mleczna i biała 160g Q Chew | słodycze-przekąski | yes | yes | cereals soybeans milk nuts | AMBIENT |
| KIMCHI-5034 | Ajitsuke Menma, marynowane fermentowane pędy bambusa w plasterkach 100g - Momoya | pasty-smakowe | yes | yes | cereals soybeans sesame | AMBIENT |
| KIMCHI-1428 | Ajitsuke Shiitake, grzyby w słodkiej zalewie 500g - Asia Kitchen | grzyby-shiitake | yes | yes | cereals soybeans | AMBIENT |
| KIMCHI-14 | Algi nori do sushi, 6 listków - House of Asia | arkusze-nori-gim | yes | yes | - | AMBIENT |
| KIMCHI-2761 | Algi Sushi Nori Gold 50 szt. - Sen Soy | arkusze-nori-gim | yes | yes | - | - |
| KIMCHI-2505 | Algi Sushi Nori Premium Gold 10 szt - Asia Kitchen | arkusze-nori-gim | yes | yes | - | - |
| KIMCHI-2506 | Algi Sushi Nori Premium Gold 3 x 10 szt - Asia Kitchen | arkusze-nori-gim | yes | yes | - | - |
| KIMCHI-2507 | Algi Sushi Nori Premium Gold 5 x 10 szt - Asia Kitchen | arkusze-nori-gim | yes | yes | - | - |
| KIMCHI-5214 | Angel Hair White Chocolate, biała czekolada z pistacjami i anielskim włosiem 80g - Mistachio | słodycze-przekąski | yes | yes | cereals soybeans milk nuts | AMBIENT |
| KIMCHI-3440 | Anyż gwiaździsty, cały 50g - TRS | przyprawy-jednoskładnikowe | yes | no | cereals milk nuts | AMBIENT |
| KIMCHI-3795 | Bancha, zielona herbata z późnego zbioru 60g - Maruka | herbaty | yes | no | - | AMBIENT |
| KIMCHI-5722 | Baza do zupy hot pot, bardzo ostra 220g - HAIDILAO | buliony | yes | yes | cereals soybeans nuts | AMBIENT |
| KIMCHI-5721 | Baza do zupy hot pot, ostra (medium hot) 220g - HAIDILAO | buliony | yes | yes | cereals soybeans nuts | AMBIENT |
| KIMCHI-5720 | Baza do zupy hot pot w kostkach, ostra 4x90g (360g) - HAIDILAO | buliony | yes | yes | cereals soybeans | AMBIENT |
| KIMCHI-2004 | Baza do zupy, pasta do Hot Pot po syczuańsku 70g - Lee Kum Kee | pasty-smakowe | yes | yes | cereals soybeans | AMBIENT |
| KIMCHI-2578 | Baza do zupy Pho, łagodna 80g - Sen Soy | buliony | yes | yes | cereals fish peanuts soybeans nuts | - |
| KIMCHI-2579 | Baza do zupy Tom Yum, łagodna 80g - Sen Soy | buliony | yes | yes | fish peanuts soybeans nuts sesame | - |
| KIMCHI-4595 | BBQ Tteokbokki, kluski ryżowe w sosie barbecue 260g - O'Food | dania-gotowe | yes | yes | soybeans | - |
| KIMCHI-4437 | Bento Squid Snack Sweet & Spicy, przekąska z kałamarnicy słodko-ostra 20g - Bento & Co | dania-gotowe | yes | yes | cereals fish | AMBIENT |
| KIMCHI-1136 | Bibim Men, makaron w słodko-ostrym sosie 130g - Paldo | ramyun-ramen | yes | yes | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | - |
| KIMCHI-4620 | Big La Tiao przekąska Hot & Spicy 106g - Wei-Long | słodycze-przekąski | yes | yes | cereals soybeans mustard | AMBIENT |
| KIMCHI-5473 | Big La Tiao przekąska Hot & Spicy 400g - Wei-Long | słodycze-przekąski | yes | yes | cereals soybeans mustard | AMBIENT |
| KIMCHI-4670 | Boczek smażony, chipsy snacki mięsne, skórki wieprzowe BBQ barbecue 150g - Ok Snacks | słodycze-przekąski | yes | yes | - | AMBIENT |
| KIMCHI-4669 | Boczek smażony, chipsy snacki mięsne, skórki wieprzowe solone 150g - Ok Snacks | słodycze-przekąski | yes | yes | - | AMBIENT |
| KIMCHI-5158 | Bombonierka Alfort Mini Chocolate Rich Kyoto Uji Matcha, czekoladki z zieloną herbatą na herbatniku (12 sztuk) 60g - Bourbon | słodycze-przekąski | yes | yes | cereals soybeans milk | AMBIENT |
| KIMCHI-2685 | Bori-cha, herbata jęczmienna (30 x 10g) 300g - Sempio | herbaty | yes | yes | - | AMBIENT |
| KIMCHI-3593 | Buchim Garu, miks na koreańskie naleśniki 1kg - CJ Beksul | mąki-panierki-tapioka | yes | yes | cereals soybeans milk | AMBIENT |
| KIMCHI-5783 | Buldak Hot Sauce Carbonara Flavour - sos o smaku pikantnego kurczaka carbonara 165ml Samyang | ramyun-ramen | yes | yes | cereals eggs peanuts soybeans milk nuts celery mustard | AMBIENT |
| KIMCHI-5782 | Buldak Hot Sauce Extremely Spicy - sos o smaku ostrego kurczaka 2xSpicy 165ml Samyang | ramyun-ramen | yes | yes | cereals eggs peanuts soybeans milk nuts celery mustard | AMBIENT |
| KIMCHI-5781 | Buldak Hot Sauce Original - sos o smaku ostrego kurczaka 165ml Samyang | ramyun-ramen | yes | yes | cereals eggs peanuts soybeans milk nuts celery mustard | AMBIENT |
| KIMCHI-3154 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka 40 x 140g (cały karton) - Samyang | ramyun-ramen | yes | yes | cereals crustaceans eggs fish soybeans milk sesame | AMBIENT |
| KIMCHI-2640 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka 5 x 140g - Samyang | ramyun-ramen | yes | yes | cereals crustaceans eggs fish soybeans milk sesame | AMBIENT |
| KIMCHI-2472 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka, duża micha 105g - Samyang | ramyun-ramen | yes | yes | cereals crustaceans eggs fish soybeans milk sesame | AMBIENT |
| KIMCHI-2151 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka w kubku 70g - Samyang | ramyun-ramen | yes | yes | cereals crustaceans eggs fish soybeans milk sesame | AMBIENT |
| KIMCHI-1350 | Buldak Ramyun 2xSpicy makaron instant o smaku ostrego kurczaka, bombowo ostry 140g - Samyang | ramyun-ramen | yes | yes | cereals crustaceans eggs fish soybeans milk sesame | AMBIENT |
| KIMCHI-4225 | Buldak Ramyun Original makaron instant o smaku ogniście ostrego kurczaka w kubku 70g - Samyang | ramyun-ramen | yes | yes | cereals crustaceans eggs fish soybeans milk sesame | AMBIENT |
| KIMCHI-4754 | Buldak Ramyun Original makaron instant o smaku ogniście ostrego kurczaka w kubku 70g - Samyang Japan | ramyun-ramen | yes | yes | cereals crustaceans eggs fish soybeans milk sesame | AMBIENT |
| KIMCHI-1149 | Buldak Ramyun Original makaron instant o smaku ostrego kurczaka, ogniście ostry 140g - Samyang | ramyun-ramen | yes | yes | cereals soybeans sesame | AMBIENT |
| KIMCHI-2555 | Buldak Ramyun Original makaron instant o smaku ostrego kurczaka, ogniście ostry 5 x 140g - Samyang | ramyun-ramen | yes | yes | cereals soybeans sesame | AMBIENT |
| KIMCHI-1001 | Bulion Dashida o smaku  wołowym 1kg - CJ (Cheiljedang) | buliony | yes | yes | cereals crustaceans fish soybeans milk nuts | AMBIENT |
| KIMCHI-2808 | Bulion Dashida o smaku wołowym 300g - CJ (Cheiljedang) | buliony | yes | yes | cereals crustaceans fish soybeans milk nuts | AMBIENT |
| KIMCHI-5747 | Bulion dashi w stylu koreańskim granulowany bez MSG 130g - Youki | buliony | yes | yes | soybeans milk molluscs | AMBIENT |
| KIMCHI-5511 | Bulion do zupy Ramen Miso 440ml - ITA-SAN | ramyun-ramen | yes | yes | cereals soybeans sesame | AMBIENT |
| KIMCHI-5512 | Bulion do zupy Ramen Shoyu 440ml - ITA-SAN | ramyun-ramen | yes | yes | cereals soybeans celery sesame | AMBIENT |
| KIMCHI-5513 | Bulion do zupy Ramen Tonkotsu 440ml - ITA-SAN | ramyun-ramen | yes | yes | - | AMBIENT |
| KIMCHI-4682 | Bulion drobiowy w proszku 250g - Ajinomoto | buliony | yes | yes | cereals soybeans milk | AMBIENT |
| KIMCHI-4769 | Bulion Hondashi z dodatkiem tuńczyka bonito 40g - Ajinomoto | buliony | yes | yes | fish milk | AMBIENT |
| KIMCHI-5545 | Bulion, koncentrat Dashi no Moto z wodorostów kombu 1kg - Shimaya | buliony | yes | yes | - | AMBIENT |
| KIMCHI-5169 | Bulion rybny gotowy Bonito Somi Tsuyu 500ml - Somi Food | ramyun-ramen | yes | yes | fish soybeans | AMBIENT |
| KIMCHI-5170 | Bulion rybny gotowy Kyoto Wafu Dashi 500ml - Somi Food | sosy-marynaty | yes | yes | fish soybeans | AMBIENT |
| KIMCHI-5171 | Bulion rybny gotowy Somi Shiro Dashi 500ml - Somi Food | sosy-marynaty | yes | yes | fish soybeans | AMBIENT |
| KIMCHI-5507 | Bulion z kurczaka w proszku Tori-Gara bez MSG 130g - Youki | buliony | yes | yes | milk | AMBIENT |
| KIMCHI-5029 | Calpis Water, niegazowany napój mleczny 350ml - Asahi | napoje | yes | yes | soybeans milk | AMBIENT |
| KIMCHI-4539 | Century Eggs, stuletnie jajka kacze 6 sztuk 420g - Xu Ri | dania-gotowe | yes | yes | eggs | AMBIENT |
| KIMCHI-521 | Chapagetti, makaron z sosem z czarnej fasoli, łagodny 140g - Nongshim | ramyun-ramen | yes | yes | cereals eggs peanuts soybeans milk mustard sesame | - |
| KIMCHI-4076 | Chicharon Hot & Spicy, chrupki mięsne, skórki wieprzowe o smaku ostrego chili 50g - Pinoy Kitchen | słodycze-przekąski | yes | yes | - | AMBIENT |
| KIMCHI-4077 | Chicharon Salt & Vinegar, chrupki mięsne, skórki wieprzowe o smaku soli i octu 50g - Pinoy Kitchen | słodycze-przekąski | yes | yes | - | AMBIENT |
| KIMCHI-935 | Chińskie ciasteczka z wróżbą 100 szt. - Janeco | słodycze-przekąski | yes | yes | cereals eggs | AMBIENT |
| KIMCHI-1068 | Chińskie ciasteczka z wróżbą 280 szt. - Janeco | słodycze-przekąski | yes | yes | cereals eggs | AMBIENT |
