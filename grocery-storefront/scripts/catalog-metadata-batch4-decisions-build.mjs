#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';

const REVIEW_PATH = 'docs/asiandeligo-catalog-metadata-batch4-reviewed-actions-20260722.json';
const OUTPUT_PATH = 'docs/asiandeligo-catalog-metadata-batch4-decisions-20260722.json';
const EXPECTED_BATCH = 'asiandeligo-catalog-metadata-batch4-20260722-v1';
const EXPECTED_CHANNEL = 'asiandeligo';
const EXPECTED_SALON_ID = 'e73271a9-53e3-4a20-a02e-791726b452aa';
const COHORT_SKUS = [
  'ADG-000040', 'ADG-000087', 'ADG-000096', 'ADG-000107', 'ADG-000133',
  'ADG-000274', 'ADG-000816', 'ADG-001046', 'ADG-001217', 'ADG-000262',
  'ADG-000263', 'ADG-000286', 'ADG-000298', 'ADG-000347', 'ADG-000396',
  'ADG-000575', 'ADG-000965', 'ADG-000066', 'ADG-000120', 'ADG-000129',
  'ADG-000172', 'ADG-000220', 'ADG-000221', 'ADG-000222', 'ADG-000227',
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

function assertEvidence(evidence, label) {
  if (!Array.isArray(evidence) || evidence.length < 2) {
    throw new Error(`${label} must have at least two evidence items`);
  }
  for (const item of evidence) {
    if (!item?.url?.startsWith('https://') || !item.kind || !item.supports) {
      throw new Error(`${label} evidence must include https URL, kind, and supports`);
    }
  }
}

function publicEvidence(row) {
  return {
    url: `https://asiandeligo.eshoper.pro/products/${row.slug}`,
    kind: 'public-pdp',
    supports: 'Confirms the current public product identity and pack description.',
  };
}

function validateReview(review) {
  if (
    review?.version !== 1
    || review.batch !== EXPECTED_BATCH
    || review.channel !== EXPECTED_CHANNEL
    || review.salonId !== EXPECTED_SALON_ID
    || !isDeepStrictEqual(review.cohortSkus, COHORT_SKUS)
  ) {
    throw new Error('Reviewed actions do not match the exact batch-4 identity and cohort');
  }
  if (!review.preparedAt || Number.isNaN(Date.parse(review.preparedAt))) {
    throw new Error('Reviewed actions require a valid preparedAt timestamp');
  }
  if (!review.actions || typeof review.actions !== 'object' || Array.isArray(review.actions)) {
    throw new Error('Reviewed actions must be an object keyed by SKU');
  }
  const actionSkus = Object.keys(review.actions);
  if (!isDeepStrictEqual(actionSkus.sort(), [...COHORT_SKUS].sort())) {
    throw new Error('Reviewed actions must cover all 25 cohort SKUs exactly once');
  }
  for (const sku of COHORT_SKUS) {
    const action = review.actions[sku];
    if (!action?.reason) throw new Error(`Missing reason for ${sku}`);
    assertEvidence(action.evidence, sku);
    if (action.hold === true) {
      if (action.patch != null) throw new Error(`Hold ${sku} must not include a patch`);
      continue;
    }
    if (!action.patch || typeof action.patch !== 'object' || Array.isArray(action.patch)) {
      throw new Error(`Transition ${sku} requires a patch`);
    }
    const patchFields = Object.keys(action.patch);
    if (
      patchFields.length === 0
      || patchFields.some((field) => !MUTABLE_FIELDS.includes(field))
    ) {
      throw new Error(`Transition ${sku} contains an empty or out-of-scope patch`);
    }
  }
  return review;
}

async function readStdin() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

async function build() {
  const review = validateReview(JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8')));
  const snapshots = JSON.parse((await readStdin()).trim());
  if (!Array.isArray(snapshots) || snapshots.length !== 25) {
    throw new Error(`Expected exactly 25 production snapshots, got ${snapshots?.length ?? 'invalid input'}`);
  }
  const bySku = new Map(snapshots.map((row) => [row.sku, row]));
  if (bySku.size !== 25 || COHORT_SKUS.some((sku) => !bySku.has(sku))) {
    throw new Error('Production snapshot does not match the exact batch-4 cohort');
  }

  const products = [];
  const holds = [];
  for (const sku of COHORT_SKUS) {
    const row = bySku.get(sku);
    const action = review.actions[sku];
    if (action.hold === true) {
      holds.push({
        sku,
        reason: action.reason,
        evidence: [...action.evidence, publicEvidence(row)],
      });
      continue;
    }
    if (
      !isDeepStrictEqual(row.status?.product, EXPECTED_PRODUCT_STATUS)
      || !isDeepStrictEqual(row.status?.variant, EXPECTED_VARIANT_STATUS)
    ) {
      throw new Error(`Unexpected production status for ${sku}`);
    }
    const target = structuredClone(row.expected);
    Object.assign(target, action.patch);
    const changedFields = MUTABLE_FIELDS.filter(
      (field) => !isDeepStrictEqual(row.expected[field], target[field]),
    );
    if (changedFields.length === 0) throw new Error(`No actual transition for ${sku}`);
    if (!isDeepStrictEqual([...changedFields].sort(), Object.keys(action.patch).sort())) {
      throw new Error(`Patch for ${sku} contains a field that does not change production`);
    }
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
      reason: action.reason,
      evidence: [...action.evidence, publicEvidence(row)],
    });
  }

  const decisions = {
    version: 1,
    batch: EXPECTED_BATCH,
    channel: EXPECTED_CHANNEL,
    salonId: EXPECTED_SALON_ID,
    preparedAt: review.preparedAt,
    cohortSkus: COHORT_SKUS,
    products,
    holds,
  };
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(decisions, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT_PATH}: ${products.length} transitions + ${holds.length} holds.`);
}

try {
  await build();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
