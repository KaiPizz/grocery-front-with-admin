#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';

const OUTPUT = 'docs/asiandeligo-catalog-metadata-batch3-decisions-20260722.json';
const COHORT_SKUS = [
  'ADG-000104', 'ADG-000123', 'ADG-000250', 'ADG-000251', 'ADG-000280',
  'ADG-000346', 'ADG-000419', 'ADG-000547', 'ADG-000578', 'ADG-000581',
  'ADG-000640', 'ADG-000693', 'ADG-000781', 'ADG-000968', 'ADG-001008',
  'ADG-001021', 'ADG-001039', 'ADG-001285', 'ADG-001415', 'ADG-000002',
  'ADG-000013', 'ADG-000014', 'ADG-000015', 'ADG-000017', 'ADG-000037',
];
const MUTABLE_FIELDS = [
  'allergens', 'mayContainAllergens', 'storageZone', 'nutritionFacts',
  'countryOfOrigin', 'ingredients',
];
const EXPECTED_PRODUCT_STATUS = {
  isActive: true,
  isPublished: true,
  isVisible: true,
  status: 'active',
  deletedAt: null,
};
const EXPECTED_VARIANT_STATUS = {
  isActive: true,
  isPublished: false,
  isForSale: true,
  syncStatus: 'synced',
  availabilityStatus: 'IN_STOCK',
  deletedAt: null,
};

const REVIEW = {
  'ADG-000104': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'The production EAN and two exact-pack Farmer listings specify shelf-stable dry, cool storage; conflicting nutrition revisions remain unchanged.',
    evidence: [
      ['https://kimchi.pl/product-pol-387.html', 'supplier-label', 'Exact historical EAN 8850521950375, 10mm/400g identity, and dry cool storage.'],
      ['https://www.ethnicfoods.gr/en/rice-sticks-10mm-400g-farmer-2430', 'retailer-label', 'Independent exact Farmer 10mm 400g pack and storage guidance.'],
      ['https://www.eastasianfood.com/farmer-br-rice-stick-10-mm.html', 'retailer-label', 'Independent exact-size product corroboration.'],
    ],
  },
  'ADG-000123': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Two exact-EAN LongKou 5x100g listings support unopened ambient dry storage; conflicting nutrition panels and trace declarations are held.',
    evidence: [
      ['https://kimchi.pl/product-pol-457.html', 'supplier-label', 'Exact historical 5x100g product and production EAN 8717703638554.'],
      ['https://heuschenschroufforder.com/lungkow-vermicelli-500-gr', 'distributor-label', 'Exact-EAN 500g case specification and dry storage.'],
      ['https://www.asiafood.cz/sklenene-nudle-vermicelli-500-g/', 'retailer-label', 'Independent exact 500g pack and storage guidance.'],
    ],
  },
  'ADG-000250': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'The exact historical source and independent Farmer 1mm/400g listings require dry, cool ambient storage; malformed and conflicting energy values are not copied.',
    evidence: [
      ['https://kimchi.pl/product-pol-1055.html', 'supplier-label', 'Exact historical 1mm/400g product and dry cool storage.'],
      ['https://www.aasiamarket.fi/en/product/farmer-rice-noodle-1mm/', 'retailer-label', 'Independent exact Farmer 1mm pack and storage guidance.'],
      ['https://www.east-asia-mart.eu/en/products/rice-noodles-ja-flour/farmer-rice-noodle-1mm-400g', 'retailer-label', 'Independent exact pack corroboration.'],
    ],
  },
  'ADG-000251': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact mapped and independent City Aroma 400g listings specify unopened shelf-stable storage at or below room temperature; ambiguous noodle naming and EAN are not changed.',
    evidence: [
      ['https://kimchi.pl/product-pol-1057.html', 'supplier-label', 'Exact historical City Aroma 400g product identity.'],
      ['https://www.jumbo.com/producten/city-aroma-shirataki-400-g-381560ZK', 'retailer-label', 'Independent exact 400g product with unopened storage guidance.'],
      ['https://orientalmarket.pl/produkt/makaron-shirataki-konjac-udon-city-aroma-400-g/', 'retailer-label', 'Independent exact brand/pack listing and dry storage.'],
    ],
  },
  'ADG-000280': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'The exact mapped 20x50g product and independent pack listings support dry ambient storage; conflicting formulas, nutrition, traces, and candidate EAN remain untouched.',
    evidence: [
      ['https://kimchi.pl/product-pol-1153.html', 'supplier-label', 'Exact historical 1kg/20x50g product identity.'],
      ['https://paleczkami.pl/product-pol-1153-Makaron-sojowy-cienki-1kg-porcjowany-20-x-50g.html', 'retailer-label', 'Independent exact 20x50g pack and storage guidance.'],
      ['https://allegro.pl/oferta/oryginalny-makaron-sojowy-vermicelli-1kg-20x50g-12452265713', 'retailer-label', 'Independent exact pack corroboration and dry storage.'],
    ],
  },
  'ADG-000346': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact North South 400g sources support dry, cool ambient storage; Singapore-versus-Indonesia origin evidence is conflicting and remains unchanged.',
    evidence: [
      ['https://kimchi.pl/product-pol-1437.html', 'supplier-label', 'Exact historical North South 400g product identity.'],
      ['https://www.asiafood.cz/lepkava-neloupana-ryze-400-g/', 'retailer-label', 'Exact-EAN 8888123600312 product and storage guidance.'],
      ['https://heuschenschroufforder.com/black-glutinous-rice-400-gr', 'distributor-label', 'Independent exact pack specification and ambient storage.'],
    ],
  },
  'ADG-000419': {
    patch: { storageZone: 'AMBIENT', countryOfOrigin: 'Korea Południowa' },
    reason: 'Exact-pack Jongga sources agree on South Korean production and dry ambient storage; market-specific milk declarations and formulas are left unchanged.',
    evidence: [
      ['https://kimchi.pl/product-pol-2212.html', 'supplier-label', 'Exact historical 122g product and current Polish label data.'],
      ['https://www.y-mart.de/de/kategorie/ramen-nudeln/jongga-kimchi-ramen.8801052053233-1248597988.html', 'retailer-label', 'Exact EAN 8801052053233, 122g identity, origin, and storage.'],
      ['https://daesang.com.vn/upload/photos/shares/V%C4%83n%20b%E1%BA%A3n%20c%C3%B4ng%20b%E1%BB%91/H%C3%A0ng%20nh%E1%BA%ADp%20kh%E1%BA%A9u/TCB%20M%C3%AC%20kim%20chi%20g%C3%B3i%20122g.pdf', 'manufacturer-specification', 'Daesang exact 122g specification corroborates Korean production and pack identity.'],
    ],
  },
  'ADG-000547': {
    patch: { countryOfOrigin: 'Włochy' },
    reason: 'The manufacturer and an exact-EAN specification identify Tsuru rice as produced and packed in Italy; ambiguous retailer references to Japan are rejected.',
    evidence: [
      ['https://curtiriso.it/en/prodotti/tsuru/', 'manufacturer-product', 'Manufacturer identifies the Tsuru sushi-rice product.'],
      ['https://www.elmvalley.co.uk/uploads/productpdf/RIC033.pdf', 'distributor-specification', 'Exact EAN 8017759647013 and Italy production/packing.'],
      ['https://kimchi.pl/product-pol-2670.html', 'supplier-label', 'Exact historical Polish product, pack, nutrition, and Italy origin.'],
    ],
  },
  'ADG-000578': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact-EAN Matamun 3x200g sources specify unopened dry ambient storage; conflicting nutrition revisions remain unchanged.',
    evidence: [
      ['https://kimchi.pl/product-pol-2845-Kluski-ryzowe-do-Tteokbokki-male-slupki-600g-3-x-200g-Matamun.html', 'supplier-label', 'Exact historical 3x200g product identity.'],
      ['https://b2b.kuchnieswiata.com.pl/gluten-free', 'distributor-label', 'Distributor listing binds EAN 8809054401489 to the exact Matamun pack.'],
      ['https://sklep.kuchnieswiata.com.pl/product-pol-3072-Kluski-ryzowe-Tteokbokki-slupki-600g-Matamun.html', 'retailer-label', 'Independent exact pack and unopened storage guidance.'],
    ],
  },
  'ADG-000581': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact-EAN Matamun sliced 3x200g sources specify unopened dry ambient storage; irreconcilable exact-pack nutrition panels are held.',
    evidence: [
      ['https://kimchi.pl/product-pol-2858-Kluski-ryzowe-do-Tteokguk-male-plasterki-600g-3-x-200g-Matamun.html', 'supplier-label', 'Exact historical sliced 3x200g product identity.'],
      ['https://b2b.kuchnieswiata.com.pl/kluski-ryzowe-tteokbokki-plastry-600g/12-matamun', 'distributor-label', 'Exact EAN 8809054401496 and current distributor storage guidance.'],
      ['https://www.masala.com.pl/p12459%2Ckluski-ryzowe-tteokbokki-plasterki-tteokguk-matamun-600g.html', 'retailer-label', 'Independent exact pack corroboration.'],
    ],
  },
  'ADG-000640': {
    patch: {
      storageZone: 'AMBIENT',
      countryOfOrigin: 'Węgry',
    },
    reason: 'The mapped Polish label and exact-EAN distributor specification agree on Hungarian production and dry ambient storage; conflicting label generations keep the current allergens, trace split, and nutrition unchanged.',
    evidence: [
      ['https://kimchi.pl/product-pol-3071.html', 'supplier-label', 'Exact mapped 100g product explicitly made in Hungary and its historical allergen declaration.'],
      ['https://heuschenschroufforder.com/demae-ramen-instant-duck-noodles-100-gr/', 'distributor-specification', 'Exact EAN 8712429380909, Hungary origin, and ambient storage.'],
      ['https://www.nissin-foods.eu/products/nissin-demae-ramen-duck', 'manufacturer-label', 'Current EU product confirms dry ambient storage but demonstrates a newer label generation.'],
    ],
  },
  'ADG-000693': {
    patch: {
      storageZone: 'AMBIENT',
      nutritionFacts: {
        calories: 90,
        fat: 3.7,
        saturatedFat: 2,
        carbs: 11.6,
        sugar: 0.8,
        protein: 2,
        salt: 0.97,
        servingSize: '100 ml gotowego produktu',
      },
      countryOfOrigin: 'Węgry',
    },
    reason: 'The manufacturer and exact-GTIN EU specifications agree on Hungarian production, ambient storage, and the existing values as a per-100ml prepared panel; the serving basis is corrected explicitly.',
    evidence: [
      ['https://www.nissin-foods.eu/products/nissin-demae-ramen-miso', 'manufacturer-label', 'Current EU formulation, allergens, prepared nutrition basis, and storage.'],
      ['https://www.kespro.com/tuotteet/nissin-100g-demae-ramen-misonmakuinen-ramen-pikanuudelikeitto-5997523335410', 'retailer-label', 'Exact GTIN 5997523335410 and 100g product identity.'],
      ['https://www.gerig.ch/en/news/hello-its-lunchtime-time-for-a-little-break-with-nissin-demae-ramen/?action=generate-factsheet&product-id=47483', 'distributor-fact-sheet', 'Independent current EU fact sheet corroborates the panel and storage.'],
    ],
  },
  'ADG-000781': {
    patch: {
      nutritionFacts: {
        calories: 353,
        fat: 0.6,
        saturatedFat: 0.3,
        carbs: 79,
        sugar: 0,
        protein: 7.6,
        salt: 0,
        servingSize: '100g',
      },
      countryOfOrigin: 'Kambodża',
    },
    reason: 'Exact EAN 8847102341219 identifies the orange Royal Umbrella bag as Cambodian rice and two exact-pack sources agree on the nutrition panel; Thai red-bag data is excluded.',
    evidence: [
      ['https://sklep.nasushi.pl/product-pol-3742-Ryz-jasminowy-Premium-Quality-Orange-5kg-Royal-Umbrella.html', 'supplier-label', 'Exact historical orange 5kg product and pack identity.'],
      ['https://lafamilleatable.com/en/products/p-riz-long-parfume-premium-cambodge-royal-umbrella-8847102341219', 'retailer-label', 'Exact EAN, Cambodia origin, and nutrition.'],
      ['https://www.auchan.fr/royal-umbrella-riz-long-parfume/pr-C1352815', 'retailer-label', 'Independent exact EAN 8847102341219 with Cambodia origin and matching nutrition.'],
      ['https://paleczkami.pl/product-pol-3742-Ryz-jasminowy-Premium-5kg-Royal-Umbrella.html', 'retailer-label', 'Independent exact orange 5kg product corroboration.'],
    ],
  },
  'ADG-000968': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact and independent ICV Bun Gao 400g listings specify unopened cool, dry ambient storage; existing matching formula, nutrition, and origin are preserved.',
    evidence: [
      ['https://kimchi.pl/product-pol-4334-Makaron-ryzowy-Vermicelli-Bun-Gao-400g-ICV.html', 'supplier-label', 'Exact historical EAN 8847100980366 product and metadata.'],
      ['https://paleczkami.pl/product-pol-4334-Makaron-Vermicelli-ryzowy-Bun-Gao-400G-ICV.html', 'retailer-label', 'Independent exact pack and dry storage.'],
      ['https://www.yoaxia.de/lebensmittel/nudeln/reisnudeln/400g-icv-reisfadennudeln-rice-vermicelli-feine-reisnudeln-bun-gao_7865_3323', 'retailer-label', 'Independent exact 400g ICV pack corroboration.'],
    ],
  },
  'ADG-001008': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact-EAN HoSan 500g sources specify shelf-stable dry storage before opening; conflicting market trace declarations remain unchanged.',
    evidence: [
      ['https://kimchi.pl/product-pol-4428.html', 'supplier-label', 'Exact historical 500g product identity and formula.'],
      ['https://www.momogo.de/produkt/a-hosan-chopped-tteokbokki-rice-cake-500g', 'retailer-label', 'Exact EAN 8809059295328 and unopened storage guidance.'],
      ['https://www.asianfood.ro/rice-cake/rice-cake-tub-a-hosan-500g-1707.html', 'retailer-label', 'Independent exact pack and storage corroboration.'],
    ],
  },
  'ADG-001021': {
    patch: { storageZone: 'AMBIENT', countryOfOrigin: 'Indie' },
    reason: 'The exact-EAN manufacturer-fed specification and independent exact product identify India origin and dry ambient storage; stale Pakistan and conflicting nutrition copies are rejected.',
    evidence: [
      ['https://heuschenschroufforder.com/product/1131/basmati-rice', 'distributor-specification', 'Exact EAN 8904304501787, India origin, formula, and storage.'],
      ['https://www.aasiamarket.fi/en/product/basmati-rice-1kg-swad/', 'retailer-label', 'Independent exact EAN 8904304501787 and India origin.'],
      ['https://lafamilleatable.com/en/products/p-riz-basmati-swad-8904304501787', 'retailer-label', 'Independent exact-EAN 1kg Swad product identity.'],
      ['https://pinoymarket.pl/en/products/original-basmati-rice-1000-g-swad-587.html', 'retailer-label', 'Independent exact Swad 1kg product and dry storage.'],
    ],
  },
  'ADG-001039': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'An exact-pack manufacturer-fed specification and independent Aroy-D 1kg listing specify cool, dry ambient storage; existing matching metadata is preserved.',
    evidence: [
      ['https://psinfoodservice.com/en/product/1343860-thai-hom-mali-rijst-1kg/', 'manufacturer-fed-specification', 'Exact pack identity, EU14 declaration, formula, origin, and storage.'],
      ['https://www.knuspr.de/en-DE/96139-aroy-d-thai-rice-hom-mali', 'retailer-label', 'Independent exact Aroy-D 1kg pack and dry storage.'],
      ['https://kimchi.pl/product-pol-4518.html', 'supplier-label', 'Exact historical product with matching formula and nutrition.'],
    ],
  },
  'ADG-001415': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact-EAN Royal Tiger sources specify sealed dry, cool ambient storage; conflicting market origin and nutrition copies remain unchanged.',
    evidence: [
      ['https://heuschenschroufforder.com/product/1134/basmati-rice', 'distributor-specification', 'Exact EAN 8720301111787 and Royal Tiger 1kg product identity.'],
      ['https://allegro.pl/produkt/royal-tiger-ryz-basmati-naturalny-premium-rice-1kg-c23873a9-52f5-4f07-8887-e7f48fc1b52d?offerId=17307624784', 'retailer-label', 'Exact-EAN listing with dry, cool sealed-pack storage.'],
      ['https://kimchi.pl/product-pol-5260.html', 'supplier-label', 'Exact historical product and matching current nutrition/origin.'],
    ],
  },
};

const HOLDS = {
  'ADG-001285': {
    reason: 'No-op hold: current ingredients, Thailand origin, and AMBIENT storage are already complete; exact-EAN nutrition panels conflict, so there is no safe missing-field transition.',
    evidence: [
      ['https://heuschenschroufforder.com/glutinous-rice-1000-gr', 'distributor-specification', 'Exact product identity, ingredients, origin, and storage.'],
      ['https://hotandspicy.fi/en/p46066/better-brand-thai-glutinous-rice-1-kg', 'retailer-label', 'Exact-EAN nutrition panel that conflicts with another exact-EAN listing.'],
    ],
  },
  'ADG-000002': {
    reason: 'No-op hold: exact production-EAN sources corroborate the already complete formula, origin, storage, and nutrition; the empty direct-allergen array is already the stored value.',
    evidence: [
      ['https://zakupy.auchan.pl/products/ry%C5%BC-ja%C5%9Bminowy-tajski-smart-chef-1-kg/00642251', 'retailer-label', 'Exact EAN 850164000503 and negative EU14 declaration.'],
      ['https://kimchi.pl/product-pol-10.html', 'supplier-label', 'Exact historical product and current matching metadata.'],
    ],
  },
  'ADG-000013': {
    reason: 'Hold: exact production-EAN sources conflict on sulphites/bleaching agent, formula, and nutrition; the current EU physical label is required before any allergen mutation.',
    evidence: [
      ['https://allied-thai.co.jp/products/lami_ricenoodles_4mm_ws', 'official-distributor-label', 'Exact EAN 8936005950045 declares a sulphite bleaching agent.'],
      ['https://arena.pl/oferta/makaron-ryzowy-lami-m-do-pho-500g-hiep-long-48045759', 'retailer-label', 'Exact-EAN Polish listing omits sulphites, demonstrating the market conflict.'],
    ],
  },
  'ADG-000014': {
    reason: 'No-op hold: exact production-EAN sources support current Thailand origin and AMBIENT storage, while nutrition varies by label revision; no safe actual transition remains.',
    evidence: [
      ['https://kkpolska.pl/product/66/makaron_ryzowy_vermicelli.html', 'distributor-label', 'Exact EAN 4316734763637 and product metadata.'],
      ['https://edeka-foodservice.de/eigenmarken/produkte/891543000/farmer-reisnudeln-vermicelli-454g', 'foodservice-label', 'Independent exact EAN with a differing current nutrition panel.'],
    ],
  },
  'ADG-000015': {
    reason: 'Hold: exact production-EAN sources conflict on sulphites/bleaching agent, formula, and nutrition; the current EU physical label is required before any allergen mutation.',
    evidence: [
      ['https://allied-thai.co.jp/products/lami_ricenoodles_1-2mm_ws', 'official-distributor-label', 'Exact EAN 8936005950052 declares a sulphite bleaching agent.'],
      ['https://www.cesars.lv/en/product/rice-noodles-vermicelli-size-m-1-2mm-500g', 'retailer-label', 'Exact-EAN EU listing omits sulphites and carries a conflicting nutrition panel.'],
    ],
  },
  'ADG-000017': {
    reason: 'Hold: production EAN 9310432160168 cannot be corroborated and differs from known exact-pack LongKou EANs with variant formulas; physical-pack identity must be reconciled first.',
    evidence: [
      ['https://heuschenschroufforder.com/lungkow-vermicelli-100-gr', 'distributor-label', 'Known exact 100g LongKou pack uses EAN 8717703638608, not the production EAN.'],
      ['https://allegro.pl/oferta/makaron-sojowy-vermicelli-longkou-100g-13421610262', 'retailer-label', 'Polish 100g variant uses another EAN and formulation.'],
    ],
  },
  'ADG-000037': {
    reason: 'No-op hold: current ingredients, AMBIENT storage, nutrition, and broad EU origin are already populated; exact-EAN label generations conflict on nutrition and country, so no actual safe transition remains.',
    evidence: [
      ['https://houseofasia.pl/en/produkt/ryz-do-sushi-500-g/', 'manufacturer-product', 'Official exact product identity and ingredients.'],
      ['https://www.frisco.pl/pid%2C6918/n%2Chouse-of-asia-ryz-do-sushi/stn%2Cproduct', 'retailer-label', 'Exact EAN 5907599956235 with a conflicting current nutrition/origin revision.'],
    ],
  },
};

function publicEvidence(row) {
  return {
    url: `https://asiandeligo.eshoper.pro/products/${row.slug}`,
    kind: 'public-pdp',
    supports: 'Confirms the current public product identity and pack description.',
  };
}

async function build() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  const snapshots = JSON.parse(raw.trim());
  if (!Array.isArray(snapshots) || snapshots.length !== 25) {
    throw new Error(`Expected exactly 25 production snapshots, got ${snapshots?.length ?? 'invalid input'}`);
  }
  const bySku = new Map(snapshots.map((row) => [row.sku, row]));
  if (bySku.size !== 25 || COHORT_SKUS.some((sku) => !bySku.has(sku))) {
    throw new Error('Production snapshot does not match the exact batch-3 cohort');
  }

  const products = [];
  const holds = [];
  for (const sku of COHORT_SKUS) {
    const row = bySku.get(sku);
    const hold = HOLDS[sku];
    if (hold) {
      holds.push({
        sku,
        reason: hold.reason,
        evidence: [
          ...hold.evidence.map(([url, kind, supports]) => ({ url, kind, supports })),
          publicEvidence(row),
        ],
      });
      continue;
    }
    const review = REVIEW[sku];
    if (!review) throw new Error(`Missing review or hold for ${sku}`);
    if (
      !isDeepStrictEqual(row.status?.product, EXPECTED_PRODUCT_STATUS)
      || !isDeepStrictEqual(row.status?.variant, EXPECTED_VARIANT_STATUS)
    ) {
      throw new Error(`Unexpected production status for ${sku}`);
    }
    const target = structuredClone(row.expected);
    Object.assign(target, review.patch);
    const changedFields = MUTABLE_FIELDS.filter(
      (field) => !isDeepStrictEqual(row.expected[field], target[field]),
    );
    if (changedFields.length === 0) throw new Error(`No transition for ${sku}`);
    products.push({
      sku,
      productId: row.productId,
      variantId: row.variantId,
      name: row.name,
      slug: row.slug,
      expectedUpdatedAt: row.expectedUpdatedAt.replace(/\+00$/, '+00:00'),
      status: {
        product: EXPECTED_PRODUCT_STATUS,
        variant: EXPECTED_VARIANT_STATUS,
      },
      expected: row.expected,
      target,
      changedFields,
      confidence: 'high',
      reason: review.reason,
      evidence: [
        ...review.evidence.map(([url, kind, supports]) => ({ url, kind, supports })),
        publicEvidence(row),
      ],
    });
  }

  const decisions = {
    version: 1,
    batch: 'asiandeligo-catalog-metadata-batch3-20260722-v1',
    channel: 'asiandeligo',
    salonId: 'e73271a9-53e3-4a20-a02e-791726b452aa',
    preparedAt: '2026-07-22T09:17:35Z',
    cohortSkus: COHORT_SKUS,
    products,
    holds,
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify(decisions, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT}: ${products.length} transitions + ${holds.length} holds.`);
}

try {
  await build();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
