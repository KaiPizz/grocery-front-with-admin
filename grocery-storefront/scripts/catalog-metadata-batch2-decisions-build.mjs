#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';

const OUTPUT = 'docs/asiandeligo-catalog-metadata-batch2-decisions-20260722.json';
const COHORT_SKUS = [
  'ADG-000155', 'ADG-000163', 'ADG-000168', 'ADG-000176', 'ADG-000177',
  'ADG-000191', 'ADG-000199', 'ADG-000200', 'ADG-000201', 'ADG-000206',
  'ADG-000209', 'ADG-000213', 'ADG-000246', 'ADG-000248', 'ADG-000255',
  'ADG-000154', 'ADG-000174', 'ADG-000301', 'ADG-000405', 'ADG-001154',
  'ADG-001210', 'ADG-001374', 'ADG-000047', 'ADG-000048', 'ADG-000059',
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
  'ADG-000155': {
    patch: {
      countryOfOrigin: 'Hiszpania',
    },
    reason: 'The manufacturer and exact historical Polish listing identify production in Spain; the disputed nutrition panel remains held rather than mixing market variants.',
    evidence: [
      ['https://www.wadakyueurope.com/product-page/k2008-itogaki-20g', 'manufacturer-label', 'Exact 20g barcode and Spain production.'],
      ['https://kimchi.pl/product-pol-639.html', 'supplier-label', 'Exact historical Polish product and Wadakyu Spain production statement.'],
      ['https://www.orientalmarket.es/shop/itogaki-virutas-de-bonito-de-vientre-rayado-seco-y-ahumado-wadakyu-20g.html', 'retailer-label', 'Independent exact Wadakyu 20g barcode and pack identity.'],
    ],
  },
  'ADG-000163': {
    patch: { countryOfOrigin: 'Tajlandia' },
    reason: 'Exact-GTIN product data and an independent exact-pack retailer identify Thailand as the origin; the current nutrition and allergen arrays remain unchanged.',
    evidence: [
      ['https://www.dabas.com/productsheet/08851613101385', 'gtin-product-sheet', 'Exact GTIN 8851613101385, 500ml formulation, and Thailand origin.'],
      ['https://www.gourmet-versand.com/en/article25204/coconut-milk-aroy-d-500-ml.html', 'retailer-label', 'Independent exact EAN and 500ml AROY-D product identity.'],
    ],
  },
  'ADG-000168': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact 135g listings specify shelf-stable dry ambient storage before opening; conflicting market nutrition panels are not changed.',
    evidence: [
      ['https://www.carrefour.fr/p/sauce-harissa-le-phare-du-cap-bon-6194049100013', 'retailer-label', 'Exact EAN 6194049100013, 135g formula, and storage guidance.'],
      ['https://edeka-foodservice.de/eigenmarken/produkte/594134002/le-phare-du-cap-bon-harissa-135g', 'foodservice-label', 'Independent exact 135g product and ambient storage before opening.'],
    ],
  },
  'ADG-000177': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Two exact-EAN Ourhome 500g listings specify room-temperature dry storage; possible duplication with another catalog row is left for a separate identity review.',
    evidence: [
      ['https://www.y-mart.de/ko/kategori/jangnyu-jomiryo/bunmal-jomiryo/awohom-gimchiyong-gochutgaru.9120027415166-1299446487.html', 'retailer-label', 'Exact EAN 9120027415166, Ourhome 500g identity, and room-temperature storage.'],
      ['https://k-shop.eu/ko/ol-gewurze/770-paprikapulver-grob-fur-kimchi-500g-x-30-9120027415166.html', 'retailer-label', 'Independent exact EAN and 500g kimchi pepper identity.'],
    ],
  },
  'ADG-000191': {
    patch: {
      storageZone: 'AMBIENT',
      nutritionFacts: {
        calories: 378,
        fat: 9.1,
        saturatedFat: 0.7,
        carbs: 50,
        sugar: 29,
        protein: 15,
        salt: 0.12,
        servingSize: '100g',
      },
    },
    reason: 'Exact JAN/EAN listings for the H&S EU label agree on the 30g nutrition panel and dry ambient storage; the existing mustard allergen remains unchanged.',
    evidence: [
      ['https://www.tasteofasia.cz/p/krenovy-wasabi-prasek-s-b-30-g', 'eu-importer-label', 'Exact JAN 49181173 with EU nutrition values and dry storage.'],
      ['https://www.foodland.sk/susi/sb-wasabi-prasok-30-g/', 'retailer-label', 'Independent exact 30g S&B label with the same EU nutrition panel and storage.'],
      ['https://www.sbfoods-worldwide.com/products/search/051.html', 'manufacturer-product', 'Manufacturer confirms exact product identity and mustard-containing formulation.'],
    ],
  },
  'ADG-000199': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'The exact-EAN 730ml extra-garlic product is shelf stable before opening; conflicting old and current formula/allergen panels are deliberately held.',
    evidence: [
      ['https://www.asia-in.de/Flying-Goose-Sriracha-Chilisauce-mit-extra-Knoblauch-brauner-Deckel-730-ml', 'retailer-label', 'Exact EAN 8853662056104 and ambient dry storage.'],
      ['https://www.flyinggoosebrand.com/product/sriracha-extra-garlic/', 'manufacturer-product', 'Manufacturer confirms the brown-cap extra-garlic product identity and current formula.'],
    ],
  },
  'ADG-000200': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'An exact-GTIN importer specification requires cool, dry ambient storage; the inconsistent product name and nutrition are held for physical-label review.',
    evidence: [
      ['https://storage.googleapis.com/service-file-documents-public-bucket-prod/attribute_file/b894816c-cc7e-4337-bca8-8ea805ac8194', 'importer-technical-sheet', 'Exact GTIN 8853662056029, 730ml product, storage, origin, and allergen matrix.'],
      ['https://kimchi.pl/product-pol-838.html', 'supplier-label', 'Exact historical Polish 61% chilli 730ml product and dry cool storage.'],
    ],
  },
  'ADG-000201': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Two exact-EAN sources identify the 2.45kg CJO corn syrup and specify room-temperature storage; other metadata remains unchanged.',
    evidence: [
      ['https://kocket.de/products/chung-jung-one-maissirup-2-45kg', 'retailer-label', 'Exact EAN 8801052451039, 2.45kg identity, and room-temperature storage.'],
      ['https://store.shopping.yahoo.co.jp/kankoku-ichiba/3017.html', 'retailer-label', 'Independent exact EAN and storage guidance.'],
    ],
  },
  'ADG-000206': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact 70g Harissa sources specify dry ambient storage before opening and refrigeration only after opening; allergen and nutrition data remain unchanged.',
    evidence: [
      ['https://www.tesco.ie/shop/en-IE/products/271614153', 'retailer-label', 'Exact 70g product, formulation, nutrition, and storage guidance.'],
      ['https://paleczkami.pl/product-pol-850-Pasta-Harissa-ostra-chili-87-70g-Le-Phare-Du-Cap-Bon.html', 'retailer-label', 'Exact EAN 6194049100044 and dry cool storage.'],
    ],
  },
  'ADG-000209': {
    patch: { countryOfOrigin: 'Holandia' },
    reason: 'The exact-GTIN manufacturer-fed specification and an independent exact-EAN retailer identify production in the Netherlands; existing storage and allergen arrays remain unchanged.',
    evidence: [
      ['https://www.solucious.be/tech-fiche/123258/pdf?_locale=nl', 'manufacturer-fed-specification', 'Exact EAN 8728200180033, 750g product, Netherlands production, storage, and allergen matrix.'],
      ['https://www.burgen-stern.shop/Windmill-Sambal-Oelek-750g/700000478', 'retailer-label', 'Independent exact EAN, formula, storage, and Netherlands origin.'],
    ],
  },
  'ADG-000213': {
    patch: {
      allergens: ['soybeans'],
      ingredients: 'Woda, soja, ryż, sól, alkohol.',
    },
    reason: 'Hikari specifies the exact 400g Inaka Miso ingredients and a positive soy allergen declaration, corroborated by exact-EAN retailers.',
    evidence: [
      ['https://hikarimiso.com/products/inaka-miso/', 'manufacturer-label', 'Exact Inaka Miso 400g ingredients and Contains Soybeans declaration.'],
      ['https://www.aasiamarket.fi/en/product/miso-inaka-red-miso-fi4702/', 'retailer-label', 'Independent exact EAN 4902663007531 and pack identity.'],
    ],
  },
  'ADG-000246': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Two exact 410ml CJO cooking-sauce listings require dry ambient storage; conflicting formulation and nutrition panels remain unchanged.',
    evidence: [
      ['https://jcook.pl/produkt/ryzowe-wino-do-gotowania-chung-jung-one-410ml/', 'retailer-label', 'Exact EAN 8801052135779 and product identity.'],
      ['https://www.tjinstoko.eu/en/chung-jung-one-koreaanse-kooksaus-410ml.html', 'retailer-label', 'Independent exact product/formula and dry storage.'],
    ],
  },
  'ADG-000248': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Exact 700g 100%-rice-starch product sources specify cool, dry ambient storage; unresolved EAN, nutrition, and wrong-size gallery image are held.',
    evidence: [
      ['https://www.tjinstoko.eu/en/rice-malt-syrup-700g.html', 'retailer-label', 'Exact 700g rice syrup formula and cool, dry storage.'],
      ['https://prod.danawa.com/info/?pcode=6953350', 'product-database', 'Independent Daesang 700g 100% rice product identity.'],
    ],
  },
  'ADG-000255': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Independent exact 500ml Miyata seasoned-vinegar listings specify shelf-stable storage before opening; conflicting EAN generations are not changed.',
    evidence: [
      ['https://www.cocowoods.cz/en/miyata-sushi-vinegar-500ml/', 'retailer-label', 'Exact 500ml formula and storage guidance.'],
      ['https://www.kuchnieorientu.pl/zaprawa-do-sushi-miyata-500ml/', 'retailer-label', 'Independent exact Miyata 500ml product and ambient storage.'],
    ],
  },
  'ADG-000154': {
    patch: { storageZone: 'AMBIENT', countryOfOrigin: 'USA' },
    reason: 'The Polish distributor and an independent exact-EAN listing identify California/USA-grown Calrose rice and dry ambient storage; conflicting calorie labels are held.',
    evidence: [
      ['https://panasiapolska.abstore.pl/ryz-do-sushi-ryz-kimpo-4-5kg%2Cc52%2Cp116%2Co1%2Cs1001%2Cpl.html', 'distributor-label', 'Exact Kimpo 4.5kg product, California USA origin, and storage.'],
      ['https://sklepsoasian.com/en/products/kimpo-sushi-rice-4-5-kg-2123.html', 'retailer-label', 'Exact EAN 9120027410741, USA-grown rice, and dry storage.'],
    ],
  },
  'ADG-000174': {
    patch: {
      storageZone: 'AMBIENT',
      nutritionFacts: {
        calories: 350,
        fat: 0.01,
        saturatedFat: 0,
        carbs: 78,
        protein: 5,
        servingSize: '100g',
      },
    },
    reason: 'The exact-EAN Polish importer provides the 7mm/500g nutrition panel and dry storage, independently corroborated; disputed salt and threshold-only sugar values are omitted rather than guessed.',
    evidence: [
      ['https://asiafoods.pl/pl/product/2618%2Cmakaron-ryz-czerwony-7mm-500g-20opk-krt', 'importer-label', 'Exact EAN 8936005950403, 7mm/500g identity, nutrition, Vietnam origin, and dry storage.'],
      ['https://www.smakiorientu.waw.pl/products-2/product/makaron-ry%C5%BCowy-7mm-500g.html', 'retailer-label', 'Independent exact EAN and substantially matching nutrition/storage data.'],
    ],
  },
  'ADG-000301': {
    patch: {
      storageZone: 'AMBIENT',
      nutritionFacts: {
        calories: 350,
        fat: 1.5,
        saturatedFat: 0.5,
        carbs: 72,
        sugar: 0,
        protein: 8.8,
        salt: 0.08,
        servingSize: '100g',
      },
    },
    reason: 'Three current exact-GTIN listings agree on the MAMA 200g brown-rice formula, nutrition panel, and dry ambient storage; no allergen-free declaration is inferred.',
    evidence: [
      ['https://www.foodland-express.com/rice-noodles/whole-grain-rice-vermicelli-mama-200-g/', 'retailer-label', 'Exact brown-rice 200g product, GTIN, nutrition, and dry storage.'],
      ['https://comenzi.farmaciatei.ro/dieta-si-wellness/paine-si-paste/paste/taitei-vermicelli-orez-brun-integral-mama-200-g-econatur-p393977', 'retailer-label', 'Independent exact-GTIN product with matching nutrition panel.'],
      ['https://www.piccantino.es/mama-platos-asiaticos-y-fideos-instantaneos/fideos-de-arroz-integral-vermicelli', 'retailer-label', 'Third exact product listing corroborating the panel and pack.'],
    ],
  },
  'ADG-000405': {
    patch: {
      allergens: ['cereals', 'soybeans'],
      mayContainAllergens: [
        'fish', 'crustaceans', 'molluscs', 'milk', 'eggs', 'nuts', 'peanuts',
        'celery', 'mustard', 'sesame', 'sulphites',
      ],
      storageZone: 'AMBIENT',
      nutritionFacts: {
        calories: 286,
        fat: 10,
        saturatedFat: 2.7,
        carbs: 44,
        sugar: 4,
        protein: 6.6,
        salt: 2.04,
        servingSize: '100g',
      },
    },
    transformTarget(target) {
      target.ingredients = target.ingredients
        .replace(/^strong>/, '')
        .replace('olej rzepakowy Sos:', 'olej rzepakowy. Sos:');
    },
    reason: 'The exact 200g EU label and Paldo identify wheat/soy allergens, the trace declaration, nutrition, and ambient storage; the malformed leading HTML fragment and missing section separator are repaired without rewriting the formula.',
    evidence: [
      ['https://paldofood.com/en/sub/product/list.php?idx=25&mode=view', 'manufacturer-label', 'Paldo confirms soy, wheat, and gluten allergens for Jjajang Men.'],
      ['https://paleczkami.pl/product-pol-2170-Jjajang-Men-makaron-z-sosem-z-czarnej-fasoli-lagodny-200g-Paldo.html', 'eu-retailer-label', 'Exact 200g EU product, nutrition, positive allergens, trace warning, and storage.'],
      ['https://rozetka.com.ua/ua/paldo-648436100590/p499405499/', 'retailer-label', 'Independent exact UPC 648436100590 and label data.'],
    ],
  },
  'ADG-001154': {
    patch: {
      allergens: ['cereals', 'soybeans', 'sesame'],
      mayContainAllergens: ['milk', 'eggs', 'fish', 'crustaceans'],
      storageZone: 'AMBIENT',
    },
    reason: 'Exact 104g EU animal-free variant listings match the current ingredients and declare wheat, soy, sesame, and listed traces; conflicting nutrition and EAN revisions are held.',
    evidence: [
      ['https://kimchi.pl/product-pol-4777-Ramen-Kumamoto-Mokkosu-o-smaku-tonkotsu-104g-Itsuki.html', 'supplier-label', 'Exact Polish 104g listing with ingredients, positive allergens, trace warning, and storage.'],
      ['https://www.nikankitchen.com/en/products/567/itsuki-kumamoto-mokkosu-ramen-104g', 'retailer-label', 'Independent exact 104g animal-free variant and allergen/storage data.'],
      ['https://longdan.co.uk/zh-hant/products/itsuki-kumamoto-mokkosu-animal-free-ramen-104g', 'retailer-label', 'Third exact 104g variant corroborating identity and storage.'],
    ],
  },
  'ADG-001210': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'The manufacturer and an independent exact-pack listing specify cool, dry storage away from sunlight; nutrition and allergen declarations remain held.',
    evidence: [
      ['https://www.indiagatefoods.com/our-range/india-gate-everyday-rice/', 'manufacturer-label', 'Official Everyday Basmati pack, India origin, and cool dry storage.'],
      ['https://dookan.com/products/india-gate-everyday-basmati-rice-1kg', 'retailer-label', 'Independent exact India Gate Everyday 1kg identity and storage.'],
    ],
  },
  'ADG-001374': {
    patch: { allergens: ['cereals', 'soybeans', 'milk'], storageZone: 'AMBIENT' },
    reason: 'Exact-GTIN export labels match the current wheat/soy/milk formulation and dry ambient storage; conflicting nutrition and trace panels are not changed.',
    evidence: [
      ['https://shop.pxgo.com.tw/hourArrive/goods/241828-07010229-8801045009209', 'retailer-label', 'Exact GTIN 8801045009209, 120g formula, and allergen identity.'],
      ['https://kurogami.com/en/product/cheese-stir-fry-instant-noodles-ramen-ottogi-120-g', 'retailer-label', 'Independent exact product with wheat, soy, milk ingredients and dry storage.'],
    ],
  },
  'ADG-000047': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'The current exact-EAN fact sheet and an independent historical exact listing specify dry room-temperature storage; conflicting formula percentages remain unchanged.',
    evidence: [
      ['https://cdn.metro-group.com/rs/rs_fir_379550001001_sr.pdf', 'retailer-fact-sheet', 'Exact EAN 4316734763668 and room-temperature dry storage.'],
      ['https://zakupy.auchan.pl/products/makaron-ry%C5%BCowy-3mm-kk-400-g/00219340', 'retailer-label', 'Independent exact 3mm/400g identity and cool dry storage.'],
    ],
  },
  'ADG-000048': {
    patch: { storageZone: 'AMBIENT' },
    reason: 'Two exact-EAN 5mm/400g listings specify dry ambient storage; conflicting nutrition/formula data remains unchanged.',
    evidence: [
      ['https://cdn.metro-group.com/de/de_fir_305842001001_de.pdf', 'retailer-fact-sheet', 'Exact EAN 4316734763675 and dry storage.'],
      ['https://www.frisco.pl/pid%2C149794/n%2Cfarmer-makaron-ryzowy-%285-mm%29/stn%2Cproduct', 'retailer-label', 'Independent exact-EAN 5mm/400g product and storage.'],
    ],
  },
  'ADG-000059': {
    patch: { countryOfOrigin: 'USA' },
    reason: 'The exact-EAN Polish distributor and an independent exact-EAN retailer identify USA-grown Calrose rice; existing nutrition and storage remain unchanged.',
    evidence: [
      ['https://b2b.kuchnieswiata.com.pl/calrose-rice-kimpo-9.07-kg', 'distributor-label', 'Exact EAN 9120027410031, 9.07kg pack, USA origin, and storage.'],
      ['https://momokoshop.hu/en/kimpo-premium-sushi-rice-9kg/', 'retailer-label', 'Independent exact EAN and USA origin.'],
    ],
  },
};

const HOLD = {
  sku: 'ADG-000176',
  reason: 'Hold: production EAN 8809054400086 does not match the exact Ourhome 500g evidence EAN 9120027415166, which is already assigned to ADG-000177; a physical-label duplicate/identity review is required before mutation.',
  evidence: [
    {
      url: 'https://www.y-mart.de/ko/kategori/jangnyu-jomiryo/bunmal-jomiryo/awohom-gimchiyong-gochutgaru.9120027415166-1299446487.html',
      kind: 'retailer-label',
      supports: 'Binds the proposed metadata to EAN 9120027415166 rather than the production EAN on this held row.',
    },
  ],
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
  raw = raw.trim();
  const snapshots = JSON.parse(raw);
  if (!Array.isArray(snapshots) || snapshots.length !== 25) {
    throw new Error(`Expected exactly 25 production snapshots, got ${snapshots?.length ?? 'invalid input'}`);
  }
  const bySku = new Map(snapshots.map((row) => [row.sku, row]));
  if (bySku.size !== 25 || COHORT_SKUS.some((sku) => !bySku.has(sku))) {
    throw new Error('Production snapshot does not match the exact batch-2 cohort');
  }

  const products = [];
  for (const sku of COHORT_SKUS) {
    if (sku === HOLD.sku) continue;
    const row = bySku.get(sku);
    const review = REVIEW[sku];
    if (!review) throw new Error(`Missing review for ${sku}`);
    if (
      !isDeepStrictEqual(row.status?.product, EXPECTED_PRODUCT_STATUS)
      || !isDeepStrictEqual(row.status?.variant, EXPECTED_VARIANT_STATUS)
    ) {
      throw new Error(`Unexpected production status for ${sku}`);
    }
    const target = structuredClone(row.expected);
    Object.assign(target, review.patch);
    review.transformTarget?.(target);
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
    batch: 'asiandeligo-catalog-metadata-batch2-20260722-v1',
    channel: 'asiandeligo',
    salonId: 'e73271a9-53e3-4a20-a02e-791726b452aa',
    preparedAt: '2026-07-22T08:36:49Z',
    cohortSkus: COHORT_SKUS,
    products,
    holds: [{ ...HOLD, evidence: [...HOLD.evidence, publicEvidence(bySku.get(HOLD.sku))] }],
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify(decisions, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT}: ${products.length} transitions + 1 hold.`);
}

try {
  await build();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
