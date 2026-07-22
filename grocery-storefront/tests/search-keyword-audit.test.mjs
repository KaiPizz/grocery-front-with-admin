import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  buildSearchQualityOperation,
  chunkQueries,
  collectQueries,
  compareEndpointParity,
  evaluateCase,
  evaluatePair,
  normalizeSearchValue,
  sha256Text,
  validateManifest,
} from '../scripts/search-keyword-audit.mjs';

const execFileAsync = promisify(execFile);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const storefrontDirectory = dirname(testDirectory);
const auditScript = join(storefrontDirectory, 'scripts/search-keyword-audit.mjs');

const manifest = validateManifest(JSON.parse(await readFile(
  new URL('../docs/asiandeligo-search-keyword-contract-20260722.json', import.meta.url),
  'utf8',
)));

function result(totalCount, nodes = []) {
  return {
    totalCount,
    edges: nodes.map((node) => ({ node })),
  };
}

function product({
  name,
  slug,
  sku = 'ADG-TEST',
  categorySlug = 'ramyun-ramen',
}) {
  return {
    id: `product:${slug}`,
    name,
    slug,
    category: { name: categorySlug, slug: categorySlug },
    variants: [{ sku }],
  };
}

test('manifest covers identifiers, products, brands, categories, accents, typos, translations and negatives', () => {
  const groups = new Set(manifest.cases.map((entry) => entry.group));
  const ids = manifest.cases.map((entry) => entry.id);

  assert.ok(manifest.cases.length >= 30);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    [...groups].sort(),
    ['accent', 'brand', 'category', 'identifier', 'multi-token', 'negative', 'product', 'short-token', 'translation', 'typo'],
  );
  assert.ok(manifest.cases.some((entry) => entry.query === 'ADG-001593'));
  assert.ok(manifest.cases.some((entry) => entry.query === 'adg001593'));
  assert.ok(manifest.cases.some((entry) => entry.query === '5907599956228'));
  assert.ok(manifest.pairs.length >= 3);
});

test('manifest validation rejects empty, misspelled and malformed quality assertions', () => {
  const caseManifest = (expect) => ({
    version: 1,
    channel: 'asiandeligo',
    first: 10,
    cases: [{ id: 'invalid', group: 'test', query: 'ramen', expect }],
    pairs: [],
  });

  assert.throws(
    () => validateManifest(caseManifest({})),
    /at least one assertion/,
  );
  assert.throws(
    () => validateManifest(caseManifest({ minimumTotal: 1 })),
    /unsupported expectations: minimumTotal/,
  );
  assert.throws(
    () => validateManifest(caseManifest({ minTotal: -1 })),
    /non-negative integer/,
  );
  assert.throws(
    () => validateManifest({
      ...caseManifest({ minTotal: 1 }),
      pairs: [{ id: 'bad-pair', left: 'ryż', right: 'ryz', minOverlap: 2 }],
    }),
    /minOverlap must be from 0 to 1/,
  );
  assert.throws(
    () => validateManifest({
      ...caseManifest({ minTotal: 1 }),
      pairs: [{ id: 'sparse-pair', left: 'ryż', right: 'ryz', minOverlap: 1, window: 5, minResults: 6 }],
    }),
    /minResults must be an integer from 1 to its window/,
  );
});

test('operation keeps user queries in variables and requests relevance-ranked results', () => {
  const queries = ['ramen', 'Lee Kum Kee', 'ryż'];
  const operation = buildSearchQualityOperation(queries);

  assert.match(operation.query, /filter: \{ search: \$query0 \}/);
  assert.match(operation.query, /field: RELEVANCE/);
  assert.doesNotMatch(operation.query, /Lee Kum Kee/);
  assert.deepEqual(operation.variables, {
    query0: 'ramen',
    query1: 'Lee Kum Kee',
    query2: 'ryż',
  });
});

test('query batching caps aliased root searches without losing order', () => {
  const queries = Array.from({ length: 14 }, (_, index) => `query-${index}`);
  const chunks = chunkQueries(queries, 6);

  assert.deepEqual(chunks.map((chunk) => chunk.length), [6, 6, 2]);
  assert.deepEqual(chunks.flat(), queries);
  assert.throws(() => chunkQueries(queries, 7), /Batch size must be an integer from 1 to 6/);
});

test('CLI audits direct then proxy in bounded batches and fingerprints its manifest', async () => {
  const requestPaths = [];
  const requestSizes = [];
  let activeRequests = 0;
  let maxActiveRequests = 0;
  const server = createServer(async (request, response) => {
    activeRequests += 1;
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
    requestPaths.push(request.url);

    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const queryVariables = Object.keys(payload.variables).filter((key) => /^query\d+$/.test(key));
    requestSizes.push(queryVariables.length);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const data = Object.fromEntries(queryVariables.map((_, index) => [
      `keyword${index}`,
      { totalCount: 0, edges: [] },
    ]));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ data }));
    activeRequests -= 1;
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'search-audit-test-'));
  try {
    const port = server.address().port;
    const manifestPath = join(temporaryDirectory, 'contract.json');
    const outputPath = join(temporaryDirectory, 'report.json');
    const executableManifest = {
      version: 1,
      channel: 'test-channel',
      first: 5,
      cases: Array.from({ length: 7 }, (_, index) => ({
        id: `negative-${index}`,
        group: 'negative',
        query: `not-found-${index}`,
        expect: { maxTotal: 0 },
      })),
      pairs: [],
    };
    const manifestSource = `${JSON.stringify(executableManifest, null, 2)}\n`;
    await writeFile(manifestPath, manifestSource, 'utf8');

    await execFileAsync(process.execPath, [
      auditScript,
      `--manifest=${manifestPath}`,
      `--direct=http://127.0.0.1:${port}/direct`,
      `--proxy=http://127.0.0.1:${port}/proxy`,
      '--batch-size=3',
      '--timeout-ms=5000',
      `--output=${outputPath}`,
    ], { cwd: storefrontDirectory });

    const report = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(report.passed, true);
    assert.deepEqual(requestPaths, [
      '/direct', '/direct', '/direct',
      '/proxy', '/proxy', '/proxy',
    ]);
    assert.deepEqual(requestSizes, [3, 3, 1, 3, 3, 1]);
    assert.equal(maxActiveRequests, 1);
    assert.deepEqual(report.manifest, {
      file: 'contract.json',
      sha256: sha256Text(manifestSource),
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('case evaluation checks top SKU, normalized name and category precision', () => {
  const ramen = product({
    name: 'Nissin Ramen Kurczak 100 g',
    slug: 'nissin-ramen',
    sku: 'ADG-001593',
  });
  const passing = evaluateCase({
    id: 'quality',
    group: 'product',
    query: 'ramen',
    expect: {
      minTotal: 1,
      topSku: 'ADG-001593',
      topNameIncludes: ['ramen'],
      topCategorySlugs: ['ramyun-ramen'],
    },
  }, result(1, [ramen]));

  assert.equal(passing.passed, true);
  assert.equal(evaluateCase({
    id: 'wrong-result',
    group: 'product',
    query: 'ramen',
    expect: { topNameIncludes: ['kimchi'] },
  }, result(1, [ramen])).passed, false);
  assert.equal(normalizeSearchValue('Ryż i słodycze'), 'ryz i slodycze');
});

test('word-prefix expectations reject an incidental short-query substring', () => {
  const expectation = {
    id: 'short-go',
    group: 'short-token',
    query: 'go',
    expect: { minTotal: 1, maxTotal: 400, topNameWordPrefixes: ['go'] },
  };

  assert.equal(evaluateCase(
    expectation,
    result(400, [product({ name: 'Mango drink', slug: 'mango-drink' })]),
  ).passed, false);
  assert.equal(evaluateCase(
    expectation,
    result(20, [product({ name: 'Gochujang hot paste', slug: 'gochujang' })]),
  ).passed, true);
});

test('accent-pair and endpoint parity checks compare stable top-result windows', () => {
  const shared = product({ name: 'Ryż sushi', slug: 'ryz-sushi' });
  const second = product({ name: 'Ryż jaśminowy', slug: 'ryz-jasminowy' });
  const left = result(2, [shared, second]);
  const right = result(2, [shared, second]);
  const results = new Map([['ryż', left], ['ryz', right]]);

  assert.equal(evaluatePair({
    id: 'rice',
    left: 'ryż',
    right: 'ryz',
    window: 2,
    minOverlap: 1,
  }, results).passed, true);
  assert.deepEqual(compareEndpointParity(['ryż', 'ryz'], results, results), []);

  const changed = new Map(results);
  changed.set('ryz', result(1, [shared]));
  assert.equal(compareEndpointParity(['ryż', 'ryz'], results, changed).length, 1);

  const sparse = new Map([
    ['ryż', result(1, [shared])],
    ['ryz', result(1, [shared])],
  ]);
  assert.equal(evaluatePair({
    id: 'sparse-rice',
    left: 'ryż',
    right: 'ryz',
    window: 5,
    minResults: 5,
    minOverlap: 0.8,
    topNameIncludes: ['ryz'],
  }, sparse).passed, false);
});

test('query collection de-duplicates case and accent-pair inputs without changing order', () => {
  const queries = collectQueries({
    cases: [{ query: 'ramen' }, { query: 'ryz' }],
    pairs: [{ left: 'ryż', right: 'ryz' }],
  });

  assert.deepEqual(queries, ['ramen', 'ryz', 'ryż']);
});
