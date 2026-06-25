#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'kenmito';
const DEFAULT_LIMIT = 300;
const PAGE_SIZE = 100;
const KIMCHI_SOURCE_BASE = 'https://kimchi.pl/product-pol-';
const SOURCE_CONCURRENCY = 6;
const execFileAsync = promisify(execFile);

const QUERY = `
  query CountryOriginDryRun($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        node {
          id
          name
          slug
          countryOfOrigin
          category { name slug }
          variants { sku }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

const COUNTRY_ALIASES = new Map([
  ['belgia', 'Belgia'],
  ['belgii', 'Belgia'],
  ['brazylia', 'Brazylia'],
  ['brazylii', 'Brazylia'],
  ['chiny', 'Chiny'],
  ['chinach', 'Chiny'],
  ['dania', 'Dania'],
  ['danii', 'Dania'],
  ['filipiny', 'Filipiny'],
  ['filipinach', 'Filipiny'],
  ['francja', 'Francja'],
  ['francji', 'Francja'],
  ['hiszpania', 'Hiszpania'],
  ['hiszpanii', 'Hiszpania'],
  ['holandia', 'Holandia'],
  ['holandii', 'Holandia'],
  ['hong kong', 'Hong Kong'],
  ['indie', 'Indie'],
  ['indiach', 'Indie'],
  ['indonezja', 'Indonezja'],
  ['indonezji', 'Indonezja'],
  ['japonia', 'Japonia'],
  ['japonii', 'Japonia'],
  ['kambodża', 'Kambodża'],
  ['kambodży', 'Kambodża'],
  ['kanada', 'Kanada'],
  ['kanadzie', 'Kanada'],
  ['korea południowa', 'Korea Południowa'],
  ['korei południowej', 'Korea Południowa'],
  ['mauritius', 'Mauritius'],
  ['malezja', 'Malezja'],
  ['malezji', 'Malezja'],
  ['niemcy', 'Niemcy'],
  ['niemczech', 'Niemcy'],
  ['pakistan', 'Pakistan'],
  ['pakistanie', 'Pakistan'],
  ['paragwaj', 'Paragwaj'],
  ['paragwaju', 'Paragwaj'],
  ['polska', 'Polska'],
  ['polsce', 'Polska'],
  ['singapur', 'Singapur'],
  ['singapurze', 'Singapur'],
  ['sri lanka', 'Sri Lanka'],
  ['tajlandia', 'Tajlandia'],
  ['tajlandii', 'Tajlandia'],
  ['tajwan', 'Tajwan'],
  ['tajwanie', 'Tajwan'],
  ['tunezja', 'Tunezja'],
  ['tunezji', 'Tunezja'],
  ['turcja', 'Turcja'],
  ['turcji', 'Turcja'],
  ['unia europejska', 'Unia Europejska'],
  ['usa', 'USA'],
  ['wielka brytania', 'Wielka Brytania'],
  ['wielkiej brytanii', 'Wielka Brytania'],
  ['wietnam', 'Wietnam'],
  ['wietnamie', 'Wietnam'],
  ['włochy', 'Włochy'],
  ['włoszech', 'Włochy'],
  ['zjednoczone emiraty arabskie', 'Zjednoczone Emiraty Arabskie'],
  ['zjednoczonych emiratach arabskich', 'Zjednoczone Emiraty Arabskie'],
]);

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvValue(key) {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const candidateKey = trimmed.slice(0, separatorIndex).trim();
      if (candidateKey === key) {
        return unquoteEnvValue(trimmed.slice(separatorIndex + 1));
      }
    }
  }

  return null;
}

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/country-origin-backfill-dry-run.mjs [options]');
  console.log('');
  console.log('Dry-run only. Finds missing countryOfOrigin from deterministic kimchi.pl product traits.');
  console.log('');
  console.log('Options:');
  console.log('  --endpoint <url>       GraphQL endpoint');
  console.log('  --channel <slug>       Storefront channel slug');
  console.log(`  --limit <n>            Max products to inspect (default: ${DEFAULT_LIMIT})`);
  console.log('  --all                  Inspect all products returned by the API');
  console.log('  --output <path>        Markdown report path');
  console.log('  --csv <path>           CSV candidate report path');
  console.log('  --help                 Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    endpoint: process.env.NEXT_PUBLIC_GRAPHQL_URL
      || loadEnvValue('NEXT_PUBLIC_GRAPHQL_URL')
      || DEFAULT_ENDPOINT,
    channel: process.env.NEXT_PUBLIC_CHANNEL
      || loadEnvValue('NEXT_PUBLIC_CHANNEL')
      || DEFAULT_CHANNEL,
    limit: DEFAULT_LIMIT,
    output: 'docs/country-origin-backfill-dry-run.md',
    csv: 'docs/country-origin-backfill-dry-run.csv',
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (arg === '--all') {
      options.limit = null;
      continue;
    }

    if (!arg.startsWith('--')) {
      printUsage(1, `Unexpected argument "${arg}"`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (value == null || value.startsWith('--')) {
      printUsage(1, `Missing value for "${arg}"`);
    }

    switch (key) {
      case 'endpoint':
        options.endpoint = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'limit': {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1) {
          printUsage(1, `Invalid --limit "${value}"`);
        }
        options.limit = parsed;
        break;
      }
      case 'output':
        options.output = value;
        break;
      case 'csv':
        options.csv = value;
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }

  return options;
}

async function requestGraphql(endpoint, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    const preview = responseText.replace(/\s+/g, ' ').slice(0, 240);
    throw new Error(`GraphQL returned non-JSON response with status ${response.status}: ${preview}`);
  }

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(' - ');
    throw new Error(message || `GraphQL request failed with status ${response.status}`);
  }

  return payload.data.products;
}

async function fetchProducts(options) {
  const products = [];
  let after = null;
  let totalCount = null;

  while (true) {
    const remaining = options.limit == null ? PAGE_SIZE : options.limit - products.length;
    if (remaining <= 0) break;

    const first = Math.min(PAGE_SIZE, remaining);
    const page = await requestGraphql(options.endpoint, {
      channel: options.channel,
      first,
      after,
    });

    totalCount = page.totalCount;
    for (const edge of page.edges ?? []) products.push(edge.node);

    if (!page.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
    after = page.pageInfo.endCursor;
  }

  return { products, totalCount };
}

function firstSku(product) {
  return product.variants?.find((variant) => variant?.sku?.trim())?.sku?.trim() ?? '';
}

function kimchiNumericId(product) {
  const sku = firstSku(product);
  const fromSku = sku.match(/^KIMCHI-(\d+)$/i)?.[1];
  if (fromSku) return fromSku;

  return product.slug?.match(/^KIMCHI-(\d+)$/i)?.[1] ?? null;
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&oacute;/g, 'ó')
    .replace(/&Oacute;/g, 'Ó');
}

function stripTags(text) {
  return decodeHtml(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function normalizeCountry(rawValue) {
  const normalized = stripTags(rawValue)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

  return COUNTRY_ALIASES.get(normalized.toLocaleLowerCase('pl-PL')) ?? null;
}

function findCountryInText(rawValue) {
  const normalized = stripTags(rawValue)
    .toLocaleLowerCase('pl-PL')
    .replace(/\s+/g, ' ')
    .trim();

  const sortedAliases = [...COUNTRY_ALIASES.entries()]
    .sort((left, right) => right[0].length - left[0].length);
  for (const [alias, country] of sortedAliases) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\p{L}])${escapedAlias}([^\\p{L}]|$)`, 'iu').test(normalized)) {
      return country;
    }
  }

  return null;
}

function extractCountryValues(html) {
  const producedMatch = html.match(/Wyprodukowano\s+w\s+([^\n.]{2,120})/i);
  const producedCountry = producedMatch ? findCountryInText(producedMatch[1]) : null;
  if (producedCountry) return [producedCountry];

  const traitMatch = html.match(/Kraj pochodzenia:\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i);
  if (!traitMatch) {
    const markdownMatch = html.match(/^Kraj pochodzenia:\s*(.+)$/im);
    if (!markdownMatch) return [];

    const markdownValues = [...markdownMatch[1].matchAll(/\[([^\]]+)\]/g)]
      .map((match) => normalizeCountry(match[1]))
      .filter(Boolean);

    return [...new Set(markdownValues)];
  }

  const anchors = [...traitMatch[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => normalizeCountry(match[1]))
    .filter(Boolean);

  return [...new Set(anchors)];
}

async function fetchKimchiOrigins(id) {
  const sourceUrl = `${KIMCHI_SOURCE_BASE}${id}.html`;
  const readerUrl = `https://r.jina.ai/${sourceUrl}`;
  try {
    const { stdout } = await execFileAsync('curl', [
      '--silent',
      '--show-error',
      '--location',
      '--max-time',
      '6',
      '--retry',
      '1',
      '--retry-delay',
      '1',
      '--user-agent',
      'Kenmito metadata audit (+https://kenmito.enail.pro)',
      readerUrl,
    ], {
      maxBuffer: 4 * 1024 * 1024,
    });

    return { sourceUrl, status: 200, origins: extractCountryValues(stdout) };
  } catch (error) {
    return {
      sourceUrl,
      status: `fetch_error:${error?.message ?? 'unknown'}`,
      origins: [],
      fetchError: true,
    };
  }
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(filePath, rows) {
  const header = [
    'id',
    'slug',
    'name',
    'category',
    'firstSku',
    'sourceUrl',
    'sourceStatus',
    'candidateCountryOfOrigin',
    'allSourceCountries',
    'decision',
  ];

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [header, ...rows.map((row) => header.map((key) => row[key] ?? ''))]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n') + '\n',
  );
}

function writeMarkdown(filePath, options, totalCount, rows, csvPath) {
  const counts = rows.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] ?? 0) + 1;
    return acc;
  }, {});

  const lines = [
    '# Country Origin Backfill Dry Run',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Channel: ${options.channel}`,
    `Endpoint: ${options.endpoint}`,
    `Source: ${KIMCHI_SOURCE_BASE}{id}.html`,
    `Catalog total: ${totalCount ?? 'unknown'}`,
    `Missing countryOfOrigin inspected: ${rows.length}`,
    '',
    'This is a read-only dry-run report. It does not mutate production data.',
    '',
    '## Summary',
    '',
    '| Decision | Count |',
    '| --- | ---: |',
    `| update_candidate | ${counts.update_candidate ?? 0} |`,
    `| skip_missing_source_country | ${counts.skip_missing_source_country ?? 0} |`,
    `| skip_multi_country | ${counts.skip_multi_country ?? 0} |`,
    `| skip_no_kimchi_id | ${counts.skip_no_kimchi_id ?? 0} |`,
    `| skip_fetch_error | ${counts.skip_fetch_error ?? 0} |`,
    '',
    '## Update Candidates',
    '',
    '| SKU | Product | Candidate | Source |',
    '| --- | --- | --- | --- |',
  ];

  for (const row of rows.filter((candidate) => candidate.decision === 'update_candidate').slice(0, 80)) {
    lines.push(`| ${row.firstSku} | ${row.name} | ${row.candidateCountryOfOrigin} | ${row.sourceUrl} |`);
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- Only exact `Kraj pochodzenia` trait values from kimchi.pl are used.',
    '- Non-country source tags such as WNP are ignored.',
    '- Products with multiple remaining country values are left for manual review.',
    '',
    `CSV detail report: ${csvPath}`,
    '',
  );

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function main() {
  const options = parseArgs();
  const { products, totalCount } = await fetchProducts(options);
  const missing = products.filter((product) => !product.countryOfOrigin?.trim());
  const rows = await mapWithConcurrency(missing, SOURCE_CONCURRENCY, async (product) => {
    const id = kimchiNumericId(product);
    const baseRow = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category?.slug ?? '',
      firstSku: firstSku(product),
      sourceUrl: id ? `${KIMCHI_SOURCE_BASE}${id}.html` : '',
      sourceStatus: '',
      candidateCountryOfOrigin: '',
      allSourceCountries: '',
      decision: '',
    };

    if (!id) {
      return { ...baseRow, decision: 'skip_no_kimchi_id' };
    }

    const source = await fetchKimchiOrigins(id);
    const origins = source.origins;
    const row = {
      ...baseRow,
      sourceUrl: source.sourceUrl,
      sourceStatus: source.status,
      allSourceCountries: origins.join('|'),
    };

    if (source.fetchError) {
      return { ...row, decision: 'skip_fetch_error' };
    }
    if (origins.length === 0) {
      return { ...row, decision: 'skip_missing_source_country' };
    }
    if (origins.length > 1) {
      return { ...row, decision: 'skip_multi_country' };
    }
    return {
        ...row,
        candidateCountryOfOrigin: origins[0],
        decision: 'update_candidate',
      };
  });

  writeCsv(options.csv, rows);
  writeMarkdown(options.output, options, totalCount, rows, options.csv);

  const counts = rows.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Inspected missing countryOfOrigin products: ${rows.length}`);
  for (const [decision, count] of Object.entries(counts)) {
    console.log(`${decision}: ${count}`);
  }
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.csv}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
