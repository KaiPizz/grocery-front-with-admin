# Kimchi Allergen Split Apply Plan

Generated: 2026-06-26T07:16:44.417Z
SQL: docs/kimchi-allergen-split-apply.sql
Backup table: kenmito_allergen_split_backup_20260626

This report is generated from the allergen split audit CSV. The SQL is Kenmito-only and only updates products whose current `allergens` still match the old imported list.

## Counts

| Metric | Count |
| --- | ---: |
| candidate rows | 1033 |
| rows changing allergens or may-contain | 479 |
| rows with may-contain allergens | 255 |

## Sample Changes

| SKU | Product | Old allergens | Contains | May contain |
| --- | --- | --- | --- | --- |
| KIMCHI-3440 | Anyż gwiaździsty, cały 50g - TRS | cereals milk nuts | - | cereals milk nuts celery mustard sesame |
| KIMCHI-2578 | Baza do zupy Pho, łagodna 80g - Sen Soy | cereals fish peanuts soybeans nuts | fish | cereals peanuts soybeans nuts |
| KIMCHI-2579 | Baza do zupy Tom Yum, łagodna 80g - Sen Soy | fish peanuts soybeans nuts sesame | crustaceans fish | peanuts soybeans nuts sesame |
| KIMCHI-4437 | Bento Squid Snack Sweet & Spicy, przekąska z kałamarnicy słodko-ostra 20g - Bento & Co | cereals fish | cereals fish molluscs | - |
| KIMCHI-1136 | Bibim Men, makaron w słodko-ostrym sosie 130g - Paldo | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans mustard sesame | crustaceans eggs fish peanuts milk nuts celery mustard sesame sulphites lupin molluscs |
| KIMCHI-2685 | Bori-cha, herbata jęczmienna (30 x 10g) 300g - Sempio | - | cereals | - |
| KIMCHI-3593 | Buchim Garu, miks na koreańskie naleśniki 1kg - CJ Beksul | cereals soybeans milk | cereals | soybeans milk |
| KIMCHI-5783 | Buldak Hot Sauce Carbonara Flavour - sos o smaku pikantnego kurczaka carbonara 165ml Samyang | cereals eggs peanuts soybeans milk nuts celery mustard | cereals soybeans celery | crustaceans eggs fish peanuts milk nuts mustard sesame molluscs |
| KIMCHI-5782 | Buldak Hot Sauce Extremely Spicy - sos o smaku ostrego kurczaka 2xSpicy 165ml Samyang | cereals eggs peanuts soybeans milk nuts celery mustard | cereals soybeans celery | crustaceans eggs fish peanuts milk nuts mustard sesame molluscs |
| KIMCHI-5781 | Buldak Hot Sauce Original - sos o smaku ostrego kurczaka 165ml Samyang | cereals eggs peanuts soybeans milk nuts celery mustard | cereals soybeans celery | crustaceans eggs fish peanuts milk nuts mustard sesame molluscs |
| KIMCHI-3154 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka 40 x 140g (cały karton) - Samyang | cereals crustaceans eggs fish soybeans milk sesame | cereals soybeans sesame | crustaceans eggs milk |
| KIMCHI-2640 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka 5 x 140g - Samyang | cereals crustaceans eggs fish soybeans milk sesame | cereals soybeans sesame | crustaceans eggs milk |
| KIMCHI-2472 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka, duża micha 105g - Samyang | cereals crustaceans eggs fish soybeans milk sesame | cereals soybeans sesame | crustaceans eggs milk |
| KIMCHI-2151 | Buldak Ramyun 2xSpicy makaron instant o smaku bombowo ostrego kurczaka w kubku 70g - Samyang | cereals crustaceans eggs fish soybeans milk sesame | cereals soybeans sesame | crustaceans eggs milk |
| KIMCHI-1350 | Buldak Ramyun 2xSpicy makaron instant o smaku ostrego kurczaka, bombowo ostry 140g - Samyang | cereals crustaceans eggs fish soybeans milk sesame | cereals soybeans sesame | crustaceans eggs milk |
| KIMCHI-4225 | Buldak Ramyun Original makaron instant o smaku ogniście ostrego kurczaka w kubku 70g - Samyang | cereals crustaceans eggs fish soybeans milk sesame | cereals soybeans sesame | crustaceans eggs milk |
| KIMCHI-4754 | Buldak Ramyun Original makaron instant o smaku ogniście ostrego kurczaka w kubku 70g - Samyang Japan | cereals crustaceans eggs fish soybeans milk sesame | cereals soybeans sesame | crustaceans eggs milk |
| KIMCHI-1001 | Bulion Dashida o smaku  wołowym 1kg - CJ (Cheiljedang) | cereals crustaceans fish soybeans milk nuts | cereals soybeans | crustaceans eggs milk nuts |
| KIMCHI-2808 | Bulion Dashida o smaku wołowym 300g - CJ (Cheiljedang) | cereals crustaceans fish soybeans milk nuts | cereals soybeans | crustaceans eggs milk nuts |
| KIMCHI-5747 | Bulion dashi w stylu koreańskim granulowany bez MSG 130g - Youki | soybeans milk molluscs | fish soybeans milk cereals molluscs | - |
| KIMCHI-5169 | Bulion rybny gotowy Bonito Somi Tsuyu 500ml - Somi Food | fish soybeans | fish soybeans cereals | - |
| KIMCHI-521 | Chapagetti, makaron z sosem z czarnej fasoli, łagodny 140g - Nongshim | cereals eggs peanuts soybeans milk mustard sesame | cereals crustaceans soybeans mustard sesame | cereals eggs fish peanuts milk celery molluscs |
| KIMCHI-1416 | Chipsy Hi Tempura, algi nori w tempurze 40g - Tao Kae Noi | cereals eggs | cereals eggs soybeans | - |
| KIMCHI-5453 | Chipsy Hi Tempura, algi nori w tempurze chili & lime 40g - Tao Kae Noi | cereals milk | cereals soybeans milk | - |
| KIMCHI-1448 | Chipsy Hi Tempura, algi nori w tempurze, pikantne 40g - Tao Kae Noi | cereals eggs | cereals eggs soybeans | - |
| KIMCHI-5351 | Chipsy Hi Tempura, algi nori w tempurze Smoked BBQ 40g - Tao Kae Noi | cereals celery | cereals soybeans celery | - |
| KIMCHI-554 | Chipsy Kimnori z alg morskich 40g - Kimnori | sesame | crustaceans sesame | - |
| KIMCHI-238 | Chipsy krewetkowe 75g - Nongshim | cereals | cereals crustaceans | - |
| KIMCHI-443 | Chipsy krewetkowe, pikantne 75g - Nongshim | cereals soybeans milk | cereals crustaceans soybeans milk | - |
| KIMCHI-3808 | Chipsy krewetkowe, prażynki do smażenia 1kg - Sa Giang | - | crustaceans | - |
| KIMCHI-3949 | Chipsy krewetkowe Sriracha Original 80g - Flying Goose | cereals mustard | cereals crustaceans mustard | - |
| KIMCHI-5013 | Chipsy Minecraft Spicy TNT pikantne 158g - Pringles | cereals milk | cereals milk soybeans | - |
| KIMCHI-5217 | Chipsy Octopus and Wasabi o smaku ośmiornicy z wasabi 70g - Lay's | milk | - | cereals crustaceans fish milk |
| KIMCHI-4542 | Chipsy, prażynki krewetkowe do smażenia 3x2cm Krupuk Udang Sidoarjo 250g - Finna | eggs | crustaceans eggs | - |
| KIMCHI-4543 | Chipsy, prażynki krewetkowe do smażenia 6x4cm Krupuk Udang Sidoarjo 250g - Finna | eggs | crustaceans eggs | - |
| KIMCHI-5525 | Chipsy Spicy Rose Tteokbokki 100g - Pringles | cereals soybeans milk | cereals milk soybeans | - |
| KIMCHI-5353 | Chipsy z wodorostów, chrupiące nori Jajangmyeon 32g - Tao Kae Noi | cereals soybeans sesame | cereals soybeans sesame eggs | - |
| KIMCHI-3753 | Choco Pie Banana, całe pudełko (12 x 28g) - Lotte | cereals peanuts soybeans milk nuts | cereals eggs peanuts soybeans milk nuts | - |
| KIMCHI-3751 | Choco Pie Green Tea, całe pudełko (12 x 28g) - Lotte | cereals peanuts soybeans milk nuts | cereals eggs peanuts soybeans milk nuts | - |
| KIMCHI-5115 | Chrupiące chili w oleju sojowym 327g - Chuannan | peanuts soybeans nuts | soybeans nuts peanuts | - |
| KIMCHI-4043 | Chrupki Zzaldduk o smaku ostrego kurczaka Buldak 2xSpicy, ostre 80g - Samyang | cereals soybeans milk | cereals soybeans | eggs milk |
| KIMCHI-2692 | Chrupki Zzaldduk o smaku ostrego kurczaka Buldak, lekko ostre 120g - Samyang | cereals soybeans milk | cereals soybeans | eggs milk |
| KIMCHI-5025 | Chrzan wasabi w proszku 1kg - House Foods | - | mustard | - |
| KIMCHI-796 | Chrzan wasabi w proszku S&B puszka 30g | - | mustard | - |
| KIMCHI-4380 | Ciasteczka Blueberry Ice Cream 119,6g - Oreo | cereals peanuts soybeans milk | cereals soybeans | peanuts milk |
| KIMCHI-4383 | Ciasteczka Matcha Ice Cream 97g - Oreo | cereals soybeans milk | cereals soybeans milk | cereals eggs milk sesame |
| KIMCHI-4384 | Ciasteczka Red Velvet 119,6g - Oreo | cereals peanuts soybeans milk | cereals soybeans milk | peanuts |
| KIMCHI-5284 | Ciasteczka Squid Game spicy potato biscuits Dalgona Challenge 80g Haitai - Netlfix | cereals | cereals soybeans | - |
| KIMCHI-4385 | Ciasteczka Strawberry Creme 119,6g - Oreo | cereals peanuts soybeans milk | cereals soybeans | peanuts milk |
| KIMCHI-4137 | Cukierki imbirowe Ginger Honey Lemon z cytryną i miodem 125g - Gingerbon | nuts | - | nuts |
| KIMCHI-4672 | Cukierki imbirowe Ginger Honey Lemon z cytryną i miodem 620g - Gingerbon | nuts | - | nuts |
| KIMCHI-4136 | Cukierki imbirowe Original Ginger 125g - Gingerbon | nuts | - | nuts |
| KIMCHI-5081 | Cukierki imbirowe Original Ginger 620g - Gingerbon | nuts | - | nuts |
| KIMCHI-3864 | Cukierki kawowe Cappuccino 120g - Kopiko | soybeans milk | soybeans milk sulphites | - |
| KIMCHI-3785 | Cukierki kawowe Original 120g - Kopiko | soybeans milk | soybeans milk sulphites | - |
| KIMCHI-3710 | Cukierki kawowe Original 175g - Kopiko | soybeans milk | soybeans milk sulphites | - |
| KIMCHI-3711 | Cukierki mleczno-kawowe Cappuccino 175g - Kopiko | soybeans milk | soybeans milk sulphites | - |
| KIMCHI-5111 | Cukierki o smaku lychee 115g - Kasugai | soybeans milk nuts | soybeans | cereals fish milk nuts |
| KIMCHI-3151 | Curry Medium Hot - curry instant w proszku 1kg - Ottogi | cereals crustaceans fish soybeans milk molluscs | cereals soybeans milk | crustaceans eggs molluscs |
| KIMCHI-1147 | Czerwona fasolka azuki 900g - Valle Del Sole | - | - | cereals |
