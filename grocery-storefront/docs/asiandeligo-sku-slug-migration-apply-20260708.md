# Asia Deli Go SKU / Slug Migration SQL Plan

Generated: 2026-07-08T12:11:19.070Z
Channel: asiandeligo
Batch: asiandeligo-sku-slug-20260708
Expected rows: 1784

## Validation

- Mapping validation: OK
- Rows in mapping: 1784
- Duplicate new codes in source: 0
- Duplicate new slugs in source: 0

## SQL Safety

- SQL creates backup tables before updates.
- SQL aborts if source rows, matched product rows, new slug conflicts, or non-Kimchi current slugs do not match expectations.
- SQL scopes updates through active `channels.slug = asiandeligo` and product `salon_id`.
- Preview by replacing final `COMMIT;` with `ROLLBACK;`.

## First 20 Mappings

| current slug | new code | new slug |
| --- | --- | --- |
| KIMCHI-7 | ADG-000001 | zaprawa-do-sushi-200ml-house-of-asia |
| KIMCHI-10 | ADG-000002 | ryz-jasminowy-premium-thai-hom-mali-1kg-smart-chef |
| KIMCHI-12 | ADG-000003 | ocet-z-brazowego-ryzu-500ml-ottogi |
| KIMCHI-14 | ADG-000004 | algi-nori-do-sushi-6-listkow-house-of-asia |
| KIMCHI-15 | ADG-000005 | papier-ryzowy-okragly-100g-house-of-asia |
| KIMCHI-20 | ADG-000006 | wasabi-w-proszku-1kg-inaka |
| KIMCHI-22 | ADG-000007 | sos-sojowy-koikuchi-naturalnie-warzony-500ml-yamasa |
| KIMCHI-24 | ADG-000008 | sos-sojowy-koikuchi-dyspenser-150ml-yamasa |
| KIMCHI-27 | ADG-000009 | pasta-wasabi-w-tubce-43g-s-and-b |
| KIMCHI-29 | ADG-000010 | paleczki-bambusowe-21cm-w-kopertach-50-par |
| KIMCHI-31 | ADG-000011 | paleczki-bambusowe-21cm-w-kopertach-100-par |
| KIMCHI-35 | ADG-000012 | sos-marynata-teriyaki-300ml-yamasa |
| KIMCHI-38 | ADG-000013 | makaron-ryzowy-lami-m-do-pho-500g-hiep-long |
| KIMCHI-39 | ADG-000014 | makaron-ryzowy-vermicelli-nitki-454g-farmer |
| KIMCHI-40 | ADG-000015 | makaron-ryzowy-do-dania-bun-cha-500g-hiep-long |
| KIMCHI-41 | ADG-000016 | makaron-pszenny-chow-mien-200g-bali-kitchen |
| KIMCHI-42 | ADG-000017 | makaron-sojowy-vermicelli-100g-longkou |
| KIMCHI-50 | ADG-000018 | wakame-suszone-wodorosty-100g-nobi |
| KIMCHI-59 | ADG-000019 | matcha-sproszkowana-zielona-herbata-w-puszce-80g-tian-hu-shan |
| KIMCHI-65 | ADG-000020 | pedy-bambusa-paseczki-225g-house-of-asia |
