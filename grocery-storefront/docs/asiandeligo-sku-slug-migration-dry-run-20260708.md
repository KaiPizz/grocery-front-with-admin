# Asia Deli Go SKU / Slug Migration Dry Run

Generated: 2026-07-08T12:02:53.741Z
Products inspected: 1784

## Policy

- This is a dry-run only. It does not write to the database.
- Public product code uses a new Asia Deli Go sequence: `ADG-000001`, `ADG-000002`, ...
- Public slug is generated from the product name, not from the legacy Kimchi ID.
- If multiple products produce the same SEO slug, each duplicate gets its `ADG` code appended.
- The old `KIMCHI-*` value should be kept only in private legacy metadata for rollback/audit.

## Summary

- Legacy Kimchi slugs: 1784 / 1784
- Products with existing product_code: 0
- Products with EAN in products.ean_standard: 0
- New code duplicates: 0
- New slug duplicates after suffixing: 0
- Raw slug collision groups before suffixing: 6
- Slugs needing ADG suffix: 12
- Rows needing manual review: 0

## Proposed DB Scope For Apply Phase

- `products.slug` -> `new_slug`
- `products.product_code` -> `new_code`
- `products.product_code_base` -> `new_code`
- `product_translations.slug` for PL/EN -> `new_slug` or language-specific slug after review
- `products.private_metadata` should store `{ "legacy_kimchi_slug": "...", "legacy_source": "kimchi.pl scrape" }`

## Collision Samples

| raw slug base | count | sample current slugs |
| --- | --- | --- |
| mleko-kokosowe-70-wyciagu-z-kokosa-1l-w-kartonie-aroy-d | 2 | KIMCHI-126, KIMCHI-5311 |
| zestaw-do-herbaty-matcha-zielony-4-elementy-edo-japan | 2 | KIMCHI-2940, KIMCHI-5131 |
| danie-o-smaku-ostrego-kurczaka-quattro-cheese-buldak-145g-samyang | 2 | KIMCHI-5054, KIMCHI-5796 |
| kaki-no-tane-przyprawione-krakersy-ryzowe-arare-z-orzeszkami-180g-6-x-30g-kameda | 2 | KIMCHI-5161, KIMCHI-5337 |
| sos-rybny-myeolchi-aekjeot-z-anchois-870ml-hansung | 2 | KIMCHI-5396, KIMCHI-5576 |
| ryz-jasminowy-fragrant-jasmine-rice-1kg-tilda | 2 | KIMCHI-5765, KIMCHI-5831 |

## First 30 Mappings

| current slug | new code | new slug | name |
| --- | --- | --- | --- |
| KIMCHI-7 | ADG-000001 | zaprawa-do-sushi-200ml-house-of-asia | Zaprawa do sushi 200ml House of Asia |
| KIMCHI-10 | ADG-000002 | ryz-jasminowy-premium-thai-hom-mali-1kg-smart-chef | Ryż jaśminowy Premium Thai Hom Mali 1kg Smart Chef |
| KIMCHI-12 | ADG-000003 | ocet-z-brazowego-ryzu-500ml-ottogi | Ocet z brązowego ryżu 500ml Ottogi |
| KIMCHI-14 | ADG-000004 | algi-nori-do-sushi-6-listkow-house-of-asia | Algi nori do sushi, 6 listków - House of Asia |
| KIMCHI-15 | ADG-000005 | papier-ryzowy-okragly-100g-house-of-asia | Papier ryżowy okrągły 100g - House of Asia |
| KIMCHI-20 | ADG-000006 | wasabi-w-proszku-1kg-inaka | Wasabi w proszku 1kg Inaka |
| KIMCHI-22 | ADG-000007 | sos-sojowy-koikuchi-naturalnie-warzony-500ml-yamasa | Sos sojowy Koikuchi, naturalnie warzony 500ml Yamasa |
| KIMCHI-24 | ADG-000008 | sos-sojowy-koikuchi-dyspenser-150ml-yamasa | Sos sojowy Koikuchi, dyspenser 150ml Yamasa |
| KIMCHI-27 | ADG-000009 | pasta-wasabi-w-tubce-43g-s-and-b | Pasta wasabi w tubce 43g S&B |
| KIMCHI-29 | ADG-000010 | paleczki-bambusowe-21cm-w-kopertach-50-par | Pałeczki bambusowe 21cm w kopertach - 50 par |
| KIMCHI-31 | ADG-000011 | paleczki-bambusowe-21cm-w-kopertach-100-par | Pałeczki bambusowe 21cm w kopertach 100 par |
| KIMCHI-35 | ADG-000012 | sos-marynata-teriyaki-300ml-yamasa | Sos, marynata Teriyaki 300ml - Yamasa |
| KIMCHI-38 | ADG-000013 | makaron-ryzowy-lami-m-do-pho-500g-hiep-long | Makaron ryżowy LaMi M do Pho 500g Hiep Long |
| KIMCHI-39 | ADG-000014 | makaron-ryzowy-vermicelli-nitki-454g-farmer | Makaron ryżowy Vermicelli, nitki 454g Farmer |
| KIMCHI-40 | ADG-000015 | makaron-ryzowy-do-dania-bun-cha-500g-hiep-long | Makaron ryżowy do dania Bun Cha 500g Hiep Long |
| KIMCHI-41 | ADG-000016 | makaron-pszenny-chow-mien-200g-bali-kitchen | Makaron pszenny Chow Mien 200g Bali Kitchen |
| KIMCHI-42 | ADG-000017 | makaron-sojowy-vermicelli-100g-longkou | Makaron sojowy Vermicelli 100g LongKou |
| KIMCHI-50 | ADG-000018 | wakame-suszone-wodorosty-100g-nobi | Wakame, suszone wodorosty 100g Nobi |
| KIMCHI-59 | ADG-000019 | matcha-sproszkowana-zielona-herbata-w-puszce-80g-tian-hu-shan | Matcha, sproszkowana zielona herbata w puszce 80g Tian Hu Shan |
| KIMCHI-65 | ADG-000020 | pedy-bambusa-paseczki-225g-house-of-asia | Pędy bambusa, paseczki 225g House of Asia |
| KIMCHI-68 | ADG-000021 | tempura-miks-do-smazenia-1kg-ottogi | Tempura, miks do smażenia 1kg Ottogi |
| KIMCHI-70 | ADG-000022 | wasabi-w-proszku-100g-asia-kitchen | Wasabi w proszku 100g Asia Kitchen |
| KIMCHI-72 | ADG-000023 | rzodkiew-oshinko-takuan-marynowana-cala-500g | Rzodkiew Oshinko / Takuan marynowana, cała 500g |
| KIMCHI-77 | ADG-000024 | pasta-shinshu-shiro-miso-jasna-400g-hikari-miso | Pasta Shinshu Shiro Miso, jasna 400g Hikari Miso |
| KIMCHI-78 | ADG-000025 | wodorosty-kombu-100g-asia-kitchen | Wodorosty kombu 100g Asia Kitchen |
| KIMCHI-82 | ADG-000026 | sezam-bialy-prazony-do-sushi-500g | Sezam biały prażony do sushi 500g |
| KIMCHI-83 | ADG-000027 | sezam-czarny-do-sushi-500g | Sezam czarny do sushi 500g |
| KIMCHI-84 | ADG-000028 | rzodkiew-oshinko-takuan-marynowana-w-zalewie-1kg | Rzodkiew Oshinko (Takuan) marynowana w zalewie 1kg |
| KIMCHI-85 | ADG-000029 | grzyby-shiitake-suszone-50g-asia-kitchen | Grzyby shiitake suszone 50g Asia Kitchen |
| KIMCHI-92 | ADG-000030 | olej-sezamowy-z-prazonych-ziaren-150ml-oh-aik-guan | Olej sezamowy z prażonych ziaren 150ml Oh Aik Guan |

## Review Notes

- Apply should be done in a transaction with a backup table.
- Storefront product routes and admin product links must be tested after apply.
- If the site already has indexed URLs, add redirects from old `KIMCHI-*` slugs to new slugs.
- This does not solve image/text licensing by itself; it only removes the most visible Kimchi SKU/URL trace.
