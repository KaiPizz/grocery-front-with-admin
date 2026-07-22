#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_MANIFEST = 'docs/asiandeligo-search-keyword-contract-20260722.json';
const DEFAULT_DIRECT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_PROXY_ENDPOINT = 'https://asiandeligo.eshoper.pro/api/graphql';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BATCH_SIZE = 6;
const MAX_BATCH_SIZE = 6;

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    direct: DEFAULT_DIRECT_ENDPOINT,
    proxy: DEFAULT_PROXY_ENDPOINT,
    channel: null,
    first: null,
    output: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    batchSize: DEFAULT_BATCH_SIZE,
  };

  for (const argument of argv) {
    const [key, ...valueParts] = argument.split('=');
    const value = valueParts.join('=');

    if (key === '--manifest' && value) options.manifest = value;
    else if (key === '--direct' && value) options.direct = value;
    else if (key === '--proxy' && value) options.proxy = value;
    else if (key === '--channel' && value) options.channel = value;
    else if (key === '--first' && value) options.first = parseInteger(value, null);
    else if (key === '--output' && value) options.output = value;
    else if (key === '--timeout-ms' && value) options.timeoutMs = parseInteger(value, DEFAULT_TIMEOUT_MS);
    else if (key === '--batch-size' && value) options.batchSize = parseInteger(value, null);
    else throw new Error(`Unknown or incomplete argument: ${argument}`);
  }

  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > MAX_BATCH_SIZE) {
    throw new Error(`Batch size must be an integer from 1 to ${MAX_BATCH_SIZE}`);
  }

  return options;
}

function requireHttpEndpoint(value, label) {
  const endpoint = new URL(value);
  if (!['http:', 'https:'].includes(endpoint.protocol)) {
    throw new Error(`${label} must use http or https`);
  }
  return endpoint.toString();
}

function displayEndpoint(value) {
  const endpoint = new URL(value);
  return `${endpoint.origin}${endpoint.pathname}`;
}

export function normalizeSearchValue(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha256Text(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function validateManifest(manifest) {
  if (manifest?.version !== 1) throw new Error('Search keyword manifest version must be 1');
  if (typeof manifest.channel !== 'string' || !manifest.channel.trim()) {
    throw new Error('Search keyword manifest requires a channel');
  }
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    throw new Error('Search keyword manifest requires cases');
  }
  if (!Array.isArray(manifest.pairs)) throw new Error('Search keyword manifest pairs must be an array');
  if (manifest.first !== undefined && (!Number.isInteger(manifest.first) || manifest.first < 1 || manifest.first > 20)) {
    throw new Error('Search keyword manifest first must be an integer from 1 to 20');
  }

  const ids = manifest.cases.map((entry) => entry.id);
  if (ids.some((id) => typeof id !== 'string' || !id)) throw new Error('Every search case requires an id');
  if (new Set(ids).size !== ids.length) throw new Error('Search case ids must be unique');

  for (const entry of manifest.cases) {
    if (typeof entry.query !== 'string' || !entry.query.trim()) {
      throw new Error(`Search case ${entry.id} requires a query`);
    }
    if (!entry.expect || typeof entry.expect !== 'object') {
      throw new Error(`Search case ${entry.id} requires expectations`);
    }
    if (typeof entry.group !== 'string' || !entry.group.trim()) {
      throw new Error(`Search case ${entry.id} requires a group`);
    }

    const allowedExpectationKeys = new Set([
      'minTotal',
      'maxTotal',
      'topSku',
      'topNameIncludes',
      'topNameWordPrefixes',
      'topCategorySlugs',
      'minTopCategoryMatches',
    ]);
    const expectationKeys = Object.keys(entry.expect);
    const unknownKeys = expectationKeys.filter((key) => !allowedExpectationKeys.has(key));
    if (unknownKeys.length > 0) {
      throw new Error(`Search case ${entry.id} has unsupported expectations: ${unknownKeys.join(', ')}`);
    }
    if (expectationKeys.length === 0) {
      throw new Error(`Search case ${entry.id} requires at least one assertion`);
    }

    for (const key of ['minTotal', 'maxTotal']) {
      const value = entry.expect[key];
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new Error(`Search case ${entry.id} ${key} must be a non-negative integer`);
      }
    }
    if (
      entry.expect.minTotal !== undefined
      && entry.expect.maxTotal !== undefined
      && entry.expect.minTotal > entry.expect.maxTotal
    ) {
      throw new Error(`Search case ${entry.id} minTotal cannot exceed maxTotal`);
    }
    if (entry.expect.topSku !== undefined && (typeof entry.expect.topSku !== 'string' || !entry.expect.topSku.trim())) {
      throw new Error(`Search case ${entry.id} topSku must be a non-empty string`);
    }
    for (const key of ['topNameIncludes', 'topNameWordPrefixes', 'topCategorySlugs']) {
      const value = entry.expect[key];
      if (
        value !== undefined
        && (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || !item.trim()))
      ) {
        throw new Error(`Search case ${entry.id} ${key} must contain non-empty strings`);
      }
    }
    if (entry.expect.minTopCategoryMatches !== undefined) {
      if (!entry.expect.topCategorySlugs) {
        throw new Error(`Search case ${entry.id} minTopCategoryMatches requires topCategorySlugs`);
      }
      if (
        !Number.isInteger(entry.expect.minTopCategoryMatches)
        || entry.expect.minTopCategoryMatches < 1
        || entry.expect.minTopCategoryMatches > 5
      ) {
        throw new Error(`Search case ${entry.id} minTopCategoryMatches must be an integer from 1 to 5`);
      }
    }
  }

  const pairIds = manifest.pairs.map((pair) => pair.id);
  if (pairIds.some((id) => typeof id !== 'string' || !id)) throw new Error('Every search pair requires an id');
  if (new Set(pairIds).size !== pairIds.length) throw new Error('Search pair ids must be unique');
  for (const pair of manifest.pairs) {
    const allowedPairKeys = new Set([
      'id',
      'left',
      'right',
      'minOverlap',
      'window',
      'minResults',
      'topNameIncludes',
      'topCategorySlugs',
    ]);
    const unknownPairKeys = Object.keys(pair).filter((key) => !allowedPairKeys.has(key));
    if (unknownPairKeys.length > 0) {
      throw new Error(`Search pair ${pair.id} has unsupported fields: ${unknownPairKeys.join(', ')}`);
    }
    if (typeof pair.left !== 'string' || !pair.left.trim() || typeof pair.right !== 'string' || !pair.right.trim()) {
      throw new Error(`Search pair ${pair.id} requires left and right queries`);
    }
    if (pair.left === pair.right) throw new Error(`Search pair ${pair.id} requires distinct queries`);
    if (typeof pair.minOverlap !== 'number' || pair.minOverlap < 0 || pair.minOverlap > 1) {
      throw new Error(`Search pair ${pair.id} minOverlap must be from 0 to 1`);
    }
    if (pair.window !== undefined && (!Number.isInteger(pair.window) || pair.window < 1 || pair.window > 20)) {
      throw new Error(`Search pair ${pair.id} window must be an integer from 1 to 20`);
    }
    const pairWindow = pair.window ?? 5;
    if (
      pair.minResults !== undefined
      && (!Number.isInteger(pair.minResults) || pair.minResults < 1 || pair.minResults > pairWindow)
    ) {
      throw new Error(`Search pair ${pair.id} minResults must be an integer from 1 to its window`);
    }
    for (const key of ['topNameIncludes', 'topCategorySlugs']) {
      const value = pair[key];
      if (
        value !== undefined
        && (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || !item.trim()))
      ) {
        throw new Error(`Search pair ${pair.id} ${key} must contain non-empty strings`);
      }
    }
  }

  return manifest;
}

export function collectQueries(manifest) {
  const queries = [];
  const seen = new Set();
  const add = (value) => {
    const query = String(value).trim();
    if (!query || seen.has(query)) return;
    seen.add(query);
    queries.push(query);
  };

  manifest.cases.forEach((entry) => add(entry.query));
  manifest.pairs.forEach((pair) => {
    add(pair.left);
    add(pair.right);
  });
  return queries;
}

export function chunkQueries(queries, batchSize) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH_SIZE) {
    throw new Error(`Batch size must be an integer from 1 to ${MAX_BATCH_SIZE}`);
  }

  const chunks = [];
  for (let index = 0; index < queries.length; index += batchSize) {
    chunks.push(queries.slice(index, index + batchSize));
  }
  return chunks;
}

export function buildSearchQualityOperation(queries) {
  const definitions = ['$channel: String!', '$first: Int!'];
  const selections = [];
  const variables = {};

  queries.forEach((query, index) => {
    definitions.push(`$query${index}: String!`);
    variables[`query${index}`] = query;
    selections.push(`
      keyword${index}: products(
        channel: $channel
        first: $first
        filter: { search: $query${index} }
        sortBy: { field: RELEVANCE, direction: DESC }
      ) {
        totalCount
        edges {
          node {
            id
            name
            slug
            category { name slug }
            variants { sku }
          }
        }
      }
    `);
  });

  return {
    query: `query SearchKeywordQualityAudit(${definitions.join(', ')}) {${selections.join('')}\n}`,
    variables,
  };
}

async function requestSearchMatrix(endpoint, operation, channel, first, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: operation.query,
        variables: { ...operation.variables, channel, first },
      }),
      signal: controller.signal,
    });
    const payload = await response.json();

    if (!response.ok || payload.errors) {
      const messages = payload.errors?.map((error) => error.message).filter(Boolean) ?? [];
      throw new Error(`GraphQL ${response.status}: ${messages.join('; ') || 'request failed'}`);
    }

    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestSearchEndpoint(endpoint, queries, channel, first, timeoutMs, batchSize) {
  const results = new Map();

  // GraphQL may resolve aliased root fields concurrently. Keep each batch
  // deliberately small and finish one endpoint before starting the other so
  // the proxy and direct URL cannot double-load the same backend.
  for (const queryBatch of chunkQueries(queries, batchSize)) {
    const operation = buildSearchQualityOperation(queryBatch);
    const data = await requestSearchMatrix(endpoint, operation, channel, first, timeoutMs);
    for (const [query, result] of indexSearchResults(queryBatch, data)) {
      results.set(query, result);
    }
  }

  return results;
}

export function indexSearchResults(queries, data) {
  return new Map(queries.map((query, index) => [query, data?.[`keyword${index}`] ?? null]));
}

function getNodes(result) {
  return result?.edges?.map((edge) => edge.node).filter(Boolean) ?? [];
}

function topNodeHasSku(node, expectedSku) {
  return node?.variants?.some((variant) => variant?.sku === expectedSku) ?? false;
}

export function evaluateCase(entry, result) {
  const failures = [];
  const totalCount = result?.totalCount ?? 0;
  const nodes = getNodes(result);
  const topNode = nodes[0] ?? null;
  const expectation = entry.expect;

  if (expectation.minTotal !== undefined && totalCount < expectation.minTotal) {
    failures.push(`totalCount ${totalCount} is below ${expectation.minTotal}`);
  }
  if (expectation.maxTotal !== undefined && totalCount > expectation.maxTotal) {
    failures.push(`totalCount ${totalCount} is above ${expectation.maxTotal}`);
  }
  if (expectation.topSku && !topNodeHasSku(topNode, expectation.topSku)) {
    failures.push(`top result does not contain SKU ${expectation.topSku}`);
  }
  if (expectation.topNameIncludes?.length) {
    const normalizedName = normalizeSearchValue(topNode?.name ?? '');
    for (const fragment of expectation.topNameIncludes) {
      const normalizedFragment = normalizeSearchValue(fragment);
      if (!normalizedName.includes(normalizedFragment)) {
        failures.push(`top name does not include ${fragment}`);
      }
    }
  }
  if (expectation.topNameWordPrefixes?.length) {
    const normalizedWords = normalizeSearchValue(topNode?.name ?? '').split(' ').filter(Boolean);
    for (const prefix of expectation.topNameWordPrefixes) {
      const normalizedPrefix = normalizeSearchValue(prefix);
      if (!normalizedWords.some((word) => word.startsWith(normalizedPrefix))) {
        failures.push(`no top-name word starts with ${prefix}`);
      }
    }
  }
  if (expectation.topCategorySlugs?.length) {
    const window = nodes.slice(0, 5);
    const matches = window.filter((node) => expectation.topCategorySlugs.includes(node.category?.slug)).length;
    const minimum = expectation.minTopCategoryMatches ?? 1;
    if (matches < minimum) {
      failures.push(`only ${matches}/5 top results belong to expected categories (minimum ${minimum})`);
    }
  }

  return {
    id: entry.id,
    group: entry.group,
    query: entry.query,
    passed: failures.length === 0,
    failures,
    totalCount,
    top: nodes.slice(0, 5).map((node) => ({
      name: node.name,
      slug: node.slug,
      categorySlug: node.category?.slug ?? null,
      skus: node.variants?.map((variant) => variant.sku).filter(Boolean) ?? [],
    })),
  };
}

function overlapRatio(leftValues, rightValues, window) {
  if (leftValues.length === 0 || rightValues.length === 0) return 0;
  const rightSet = new Set(rightValues);
  const intersection = new Set(leftValues.filter((value) => rightSet.has(value)));
  return intersection.size / window;
}

export function evaluatePair(pair, resultsByQuery) {
  const window = pair.window ?? 5;
  const leftResult = resultsByQuery.get(pair.left);
  const rightResult = resultsByQuery.get(pair.right);
  const leftSlugs = getNodes(leftResult).slice(0, window).map((node) => node.slug);
  const rightSlugs = getNodes(rightResult).slice(0, window).map((node) => node.slug);
  const overlap = overlapRatio(leftSlugs, rightSlugs, window);
  const failures = [];
  const minimumResults = pair.minResults ?? window;

  if (leftSlugs.length < minimumResults || rightSlugs.length < minimumResults) {
    failures.push(
      `pair returned ${leftSlugs.length}/${rightSlugs.length} results; minimum is ${minimumResults} per side`,
    );
  }

  if (pair.topNameIncludes?.length) {
    const leftName = normalizeSearchValue(getNodes(leftResult)[0]?.name ?? '');
    const rightName = normalizeSearchValue(getNodes(rightResult)[0]?.name ?? '');
    for (const fragment of pair.topNameIncludes) {
      const normalizedFragment = normalizeSearchValue(fragment);
      if (!leftName.includes(normalizedFragment) || !rightName.includes(normalizedFragment)) {
        failures.push(`both top names must include ${fragment}`);
      }
    }
  }

  if (pair.topCategorySlugs?.length) {
    const leftCategory = getNodes(leftResult)[0]?.category?.slug ?? null;
    const rightCategory = getNodes(rightResult)[0]?.category?.slug ?? null;
    if (!pair.topCategorySlugs.includes(leftCategory) || !pair.topCategorySlugs.includes(rightCategory)) {
      failures.push('both top results must belong to an expected category');
    }
  }

  if (overlap < pair.minOverlap) {
    failures.push(`top-${window} overlap ${overlap.toFixed(2)} is below ${pair.minOverlap.toFixed(2)}`);
  }

  return {
    id: pair.id,
    left: pair.left,
    right: pair.right,
    passed: failures.length === 0,
    failures,
    overlap,
    leftTotal: leftResult?.totalCount ?? 0,
    rightTotal: rightResult?.totalCount ?? 0,
    leftSlugs,
    rightSlugs,
  };
}

export function compareEndpointParity(queries, leftResults, rightResults, window = 5) {
  const failures = [];

  for (const query of queries) {
    const left = leftResults.get(query);
    const right = rightResults.get(query);
    const leftTotal = left?.totalCount ?? 0;
    const rightTotal = right?.totalCount ?? 0;
    const leftSlugs = getNodes(left).slice(0, window).map((node) => node.slug);
    const rightSlugs = getNodes(right).slice(0, window).map((node) => node.slug);

    if (leftTotal !== rightTotal || JSON.stringify(leftSlugs) !== JSON.stringify(rightSlugs)) {
      failures.push({ query, leftTotal, rightTotal, leftSlugs, rightSlugs });
    }
  }

  return failures;
}

export function evaluateSearchQuality(manifest, queries, endpointResults) {
  const evaluations = {};

  for (const [label, resultsByQuery] of Object.entries(endpointResults)) {
    const cases = manifest.cases.map((entry) => evaluateCase(entry, resultsByQuery.get(entry.query)));
    const pairs = manifest.pairs.map((pair) => evaluatePair(pair, resultsByQuery));
    evaluations[label] = {
      passed: cases.every((entry) => entry.passed) && pairs.every((entry) => entry.passed),
      cases,
      pairs,
    };
  }

  const parityFailures = endpointResults.direct && endpointResults.proxy
    ? compareEndpointParity(queries, endpointResults.direct, endpointResults.proxy)
    : [];
  const passed = Object.values(evaluations).every((evaluation) => evaluation.passed)
    && parityFailures.length === 0;

  return { passed, evaluations, parityFailures };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = resolve(options.manifest);
  const manifestSource = await readFile(manifestPath, 'utf8');
  const manifest = validateManifest(JSON.parse(manifestSource));
  const channel = options.channel ?? manifest.channel;
  const first = Math.min(20, Math.max(1, options.first ?? manifest.first ?? 10));
  const directEndpoint = requireHttpEndpoint(options.direct, 'Direct endpoint');
  const proxyEndpoint = requireHttpEndpoint(options.proxy, 'Proxy endpoint');
  const queries = collectQueries(manifest);
  const directResults = await requestSearchEndpoint(
    directEndpoint,
    queries,
    channel,
    first,
    options.timeoutMs,
    options.batchSize,
  );
  const proxyResults = await requestSearchEndpoint(
    proxyEndpoint,
    queries,
    channel,
    first,
    options.timeoutMs,
    options.batchSize,
  );
  const endpointResults = {
    direct: directResults,
    proxy: proxyResults,
  };
  const evaluation = evaluateSearchQuality(manifest, queries, endpointResults);
  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    manifest: {
      file: basename(manifestPath),
      sha256: sha256Text(manifestSource),
    },
    channel,
    first,
    batchSize: options.batchSize,
    endpoints: {
      direct: displayEndpoint(directEndpoint),
      proxy: displayEndpoint(proxyEndpoint),
    },
    queryCount: queries.length,
    caseCount: manifest.cases.length,
    pairCount: manifest.pairs.length,
    ...evaluation,
  };

  if (options.output) {
    await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  const failedChecks = Object.entries(report.evaluations)
    .flatMap(([endpoint, evaluation]) => (
      [...evaluation.cases, ...evaluation.pairs].map((entry) => ({ endpoint, ...entry }))
    ))
    .filter((entry) => !entry.passed);
  console.log(JSON.stringify({
    passed: report.passed,
    queryCount: report.queryCount,
    caseCount: report.caseCount,
    pairCount: report.pairCount,
    batchSize: report.batchSize,
    failedChecks: failedChecks.map((entry) => ({
      endpoint: entry.endpoint,
      id: entry.id,
      failures: entry.failures,
    })),
    parityFailures: report.parityFailures.length,
    output: options.output,
  }, null, 2));

  if (!report.passed) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
