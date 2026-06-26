# Kimchi Allergen Split Audit

Generated: 2026-06-26T07:16:44.112Z

Read-only audit. No database or production data was changed.

## Summary

| Metric | Count |
| --- | ---: |
| rows inspected | 1563 |
| rows with old candidate allergens | 938 |
| rows with contains allergens | 992 |
| rows with may-contain allergens | 255 |
| old list mixes may-contain terms | 241 |
| old list has extra vs contains-only | 234 |
| contains missing from old list | 250 |
| may-contain missing from old list | 156 |

## Priority Samples

| SKU | Product | Old allergens | Contains | May contain | Notes |
| --- | --- | --- | --- | --- | --- |
| KIMCHI-1136 | Bibim Men, makaron w słodko-ostrym sosie 130g - Paldo | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans mustard sesame | crustaceans eggs fish peanuts milk nuts celery mustard sesame sulphites lupin molluscs | old extra: eggs peanuts milk nuts celery molluscs; old missing may: crustaceans fish sulphites lupin |
| KIMCHI-5078 | Jjajang Men, makaron z sosem z czarnej fasoli 4 x 200g - Paldo | cereals peanuts soybeans milk nuts celery sesame molluscs | cereals soybeans | crustaceans eggs fish peanuts milk nuts celery mustard sesame sulphites molluscs | old extra: peanuts milk nuts celery sesame molluscs; old missing may: crustaceans eggs fish mustard sulphites |
| KIMCHI-3467 | Sos Unagi Kabayaki no Tare 240g - Daisho | crustaceans eggs fish soybeans milk nuts sulphites molluscs | soybeans cereals | crustaceans eggs milk nuts celery mustard sesame sulphites molluscs | old extra: crustaceans eggs fish milk nuts sulphites molluscs; old missing contains: cereals; old missing may: celery mustard sesame |
| KIMCHI-4353 | Sos Yakisoba Vegan 300g - Otafuku | crustaceans eggs fish soybeans nuts sulphites molluscs | soybeans celery | crustaceans eggs milk nuts mustard sesame sulphites lupin molluscs | old extra: crustaceans eggs fish nuts sulphites molluscs; old missing contains: celery; old missing may: milk mustard sesame lupin |
| KIMCHI-5783 | Buldak Hot Sauce Carbonara Flavour - sos o smaku pikantnego kurczaka carbonara 165ml Samyang | cereals eggs peanuts soybeans milk nuts celery mustard | cereals soybeans celery | crustaceans eggs fish peanuts milk nuts mustard sesame molluscs | old extra: eggs peanuts milk nuts mustard; old missing may: crustaceans fish sesame molluscs |
| KIMCHI-5782 | Buldak Hot Sauce Extremely Spicy - sos o smaku ostrego kurczaka 2xSpicy 165ml Samyang | cereals eggs peanuts soybeans milk nuts celery mustard | cereals soybeans celery | crustaceans eggs fish peanuts milk nuts mustard sesame molluscs | old extra: eggs peanuts milk nuts mustard; old missing may: crustaceans fish sesame molluscs |
| KIMCHI-5781 | Buldak Hot Sauce Original - sos o smaku ostrego kurczaka 165ml Samyang | cereals eggs peanuts soybeans milk nuts celery mustard | cereals soybeans celery | crustaceans eggs fish peanuts milk nuts mustard sesame molluscs | old extra: eggs peanuts milk nuts mustard; old missing may: crustaceans fish sesame molluscs |
| KIMCHI-4906 | Danie Buldak o smaku ostrego kurczaka Cream Carbonara 140g - Samyang | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-4752 | Danie o smaku ostrego kurczaka Quattro Cheese Buldak 5 x 145g - Samyang Japan | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-4805 | Danie o smaku ostrego kurczaka Rose Buldak 5 x 140g - Samyang Japan | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-5465 | Danie Ramyun Volcano Carbonara, ogniście ostry 130g - Paldo | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-5467 | Danie Ramyun Volcano Carbonara, ogniście ostry 4 x 130g - Paldo | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-5466 | Danie Ramyun Volcano Carbonara, ogniście ostry micha 105g - Paldo | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-5251 | Green Tea Noodle, zupa makaronowa z aromatem zielonej herbaty 4 x 120g - Paldo | cereals crustaceans fish soybeans milk nuts sulphites molluscs | cereals soybeans | cereals crustaceans eggs milk nuts mustard sesame sulphites molluscs | old extra: crustaceans fish milk nuts sulphites molluscs; old missing may: eggs mustard sesame |
| KIMCHI-5790 | Ramyun Buldak o smaku ostrego kurczaka a la Carbonara, duża micha 105g - Samyang | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-1505 | Ramyun Buldak o smaku ostrego kurczaka a la Carbonara, ogniście ostry 130g - Samyang | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-4741 | Ramyun Buldak o smaku ostrego kurczaka a la Carbonara, ogniście ostry 5 x 130g - Samyang | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-2153 | Ramyun Buldak o smaku ostrego kurczaka a la Carbonara w kubku, ogniście ostry 80g - Samyang | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts soybeans milk nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-5806 | Sos, marynata do wieprzowiny Bulgogi Sauce Hot & Spicy ostra 500g - Bibigo | cereals crustaceans eggs fish soybeans milk nuts molluscs | cereals soybeans | crustaceans eggs milk nuts celery mustard sesame molluscs | old extra: crustaceans eggs fish milk nuts molluscs; old missing may: celery mustard sesame |
| KIMCHI-5805 | Sos, marynata do wołowiny Bulgogi Sauce Mild & Sweet łagodna 500g - Bibigo | cereals crustaceans eggs fish soybeans milk nuts molluscs | cereals soybeans | crustaceans eggs milk nuts celery mustard sesame molluscs | old extra: crustaceans eggs fish milk nuts molluscs; old missing may: celery mustard sesame |
| KIMCHI-5794 | Topokki Buldak o smaku ostrego kurczaka a la Carbonara 179g - Samyang | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-5795 | Topokki Buldak Rose o smaku ostrego różanego kurczaka 183,5g - Samyang | cereals eggs peanuts soybeans milk nuts celery mustard sesame molluscs | cereals soybeans milk | cereals crustaceans eggs fish peanuts nuts celery mustard sesame molluscs | old extra: eggs peanuts nuts celery mustard sesame molluscs; old missing may: crustaceans fish |
| KIMCHI-510 | Zupa instant Shin Ramyun, duża micha 114g - Nongshim | cereals eggs peanuts soybeans milk celery sesame | cereals soybeans | cereals crustaceans eggs fish peanuts milk celery mustard sesame molluscs | old extra: eggs peanuts milk celery sesame; old missing may: crustaceans fish mustard molluscs |
| KIMCHI-522 | Zupa makaronowa AnSungTangMyun, ostra 125g - Nongshim | cereals eggs peanuts soybeans milk mustard | cereals soybeans | cereals crustaceans eggs fish peanuts milk celery mustard sesame molluscs | old extra: eggs peanuts milk mustard; old missing may: crustaceans fish celery sesame molluscs |

## Recommended Interpretation

- `containsAllergens` should become the main product allergen list.
- `mayContainAllergens` should be displayed separately as trace/cross-contamination information.
- Existing `allergens` currently mixes both meanings for many products, so using it alone is ambiguous.

