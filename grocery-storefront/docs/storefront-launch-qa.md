# Asia Deli Go Storefront Launch QA

Generated: 2026-07-08T09:52:00Z
Environment: production storefront, `https://asiandeligo.eshoper.pro`
Browser path: Playwright fallback; Browser plugin was not available in this session.

## Summary

- No frontend blocker found in category browsing, product listing sort/search, mobile filters, or product detail add-to-cart.
- No code patch was needed from this QA pass.
- Product data still needs manual food-claim confirmation before adding more dietary tags.

## Products Requiring Manual Confirmation

Do not auto-tag these as vegetarian from name text only. Confirm the ingredient label or supplier data first.

| SKU | Product | Category | Why confirm |
| --- | --- | --- | --- |
| KIMCHI-2579 | Baza do zupy Tom Yum, lagodna 80g - Sen Soy | Buliony | Soup base may contain seafood/fish extract. |
| KIMCHI-791 | Sos ostrygowy Mae Krua 300ml | Sosy, marynaty | Oyster sauce is normally not vegetarian. |
| KIMCHI-2635 | Sos ostrygowy Premium 255g - Lee Kum Kee | Sosy, marynaty | Oyster sauce is normally not vegetarian. |
| KIMCHI-3834 | Zupa instant o smaku warzywnym z makaronem ryzowym 55g - MAMA | Ramyun / Ramen | Vegetable flavour can still include animal-derived seasoning. |
| KIMCHI-355 | Zupa instant Shin Kimchi Ramyun, ostra 120g Nongshim | Ramyun / Ramen | Kimchi ramen often needs ingredient verification. |
| KIMCHI-2553 | Zupa instant Shin Kimchi Ramyun, ostra - 5-pak (5 x 120g) Nongshim | Ramyun / Ramen | Same product family as KIMCHI-355; verify pack label. |
| KIMCHI-4795 | Zupa makaronowa instant o smaku warzywnym 40 x 75g - Indomie | Ramyun / Ramen | Vegetable flavour can still include animal-derived seasoning. |
| KIMCHI-4850 | Zupa makaronowa instant o smaku warzywnym 5 x 75g - Indomie | Ramyun / Ramen | Same product family as KIMCHI-4795; verify pack label. |
| KIMCHI-4908 | Zupa makaronowa Shin Kimchi Ramyun, ostra 20 x 120g (caly karton) - Nongshim | Ramyun / Ramen | Same product family as KIMCHI-355; verify carton label. |

## Out Of Stock Status

The storefront already disables add-to-cart and shows out-of-stock copy. Review these in admin/POS before launch rather than hiding them automatically.

- KIMCHI-5452
- KIMCHI-4043
- KIMCHI-3151
- KIMCHI-5546
- KIMCHI-4546
- KIMCHI-3552
- KIMCHI-599
- KIMCHI-5777
- KIMCHI-2230
- KIMCHI-3061
- KIMCHI-5594
- KIMCHI-3088
- KIMCHI-4267
- KIMCHI-839
- KIMCHI-5109
- KIMCHI-4029
- KIMCHI-5272

## QA Checks

| Flow | Viewport | Result |
| --- | --- | --- |
| Category hub search | 1280x900 | Pass: `Szukaj kategorii` narrowed public categories from 10 to 1 for `sushi`; no console errors. |
| Product listing search + sort | 1280x900 | Pass: `/products?search=ramen&sort=price_asc` rendered 24 visible product links after load; no empty state. |
| Mobile category sort sheet | 390x844 | Pass: sort sheet opened, `price_asc` applied, hidden sort state updated. |
| Mobile category filter sheet | 390x844 | Pass: filter sheet opened, filter applied, listing narrowed from 24 visible links to 1. |
| Mobile product detail add-to-cart | 390x844 | Pass: PDP purchase panel visible, add-to-cart enabled, local cart action succeeded. |

Common checks across these flows:

- HTTP status: 200.
- Blank page: no.
- Framework overlay: no.
- Broken visible images: none observed.
- Console/page errors: 0 observed during QA run.

## Next Work Order

1. Ask the manager/store owner to confirm the 9 dietary candidates above from package labels.
2. In admin/POS, restock or intentionally keep visible the 17 out-of-stock SKUs.
3. After confirmation, batch-update dietary tags and rerun `npm run audit:catalog-quality`.
4. Then do one final production smoke across home, products, categories, PDP, cart, and mobile nav.
