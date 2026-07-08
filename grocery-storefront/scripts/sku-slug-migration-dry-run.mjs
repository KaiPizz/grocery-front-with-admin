#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-sku-slug-source-20260708.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-sku-slug-migration-dry-run-20260708.csv';
const DEFAULT_JSON = 'docs/asiandeligo-sku-slug-migration-dry-run-20260708.json';
const DEFAULT_REPORT = 'docs/asiandeligo-sku-slug-migration-dry-run-20260708.md';
const DEFAULT_PREFIX = 'ADG';
const DEFAULT_START = 1;
const DEFAULT_SLUG_LANGUAGE = 'pl';
const MAX_SLUG_LENGTH = 120;

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/sku-slug-migration-dry-run.mjs [options]');
  console.log('');
  console.log('Generates a dry-run mapping from legacy Kimchi slugs to Asia Deli Go product codes and SEO slugs.');
  console.log('It does not connect to the database or mutate data.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>          Source product JSON export (default: ${DEFAULT_INPUT})`);
  console.log(`  --output <path>         CSV mapping output (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --json <path>           JSON mapping output (default: ${DEFAULT_JSON})`);
  console.log(`  --report <path>         Markdown report output (default: ${DEFAULT_REPORT})`);
  console.log(`  --prefix <value>        New internal code prefix (default: ${DEFAULT_PREFIX})`);
  console.log(`  --start <number>        Starting sequence number (default: ${DEFAULT_START})`);
  console.log(`  --slug-language <pl|en> Source name for SEO slug (default: ${DEFAULT_SLUG_LANGUAGE})`);
  console.log('  --help                  Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    json: DEFAULT_JSON,
    report: DEFAULT_REPORT,
    prefix: DEFAULT_PREFIX,
    start: DEFAULT_START,
    slugLanguage: DEFAULT_SLUG_LANGUAGE,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (!arg.startsWith('--')) printUsage(1, `Unexpected argument "${arg}"`);

    const value = args[index + 1];
    if (value == null || value.startsWith('--')) {
      printUsage(1, `Missing value for "${arg}"`);
    }

    switch (arg.slice(2)) {
      case 'input':
        options.input = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'json':
        options.json = value;
        break;
      case 'report':
        options.report = value;
        break;
      case 'prefix':
        options.prefix = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        if (!options.prefix) printUsage(1, '--prefix must contain letters or numbers');
        break;
      case 'start':
        options.start = Number.parseInt(value, 10);
        if (!Number.isInteger(options.start) || options.start < 1) {
          printUsage(1, '--start must be a positive integer');
        }
        break;
      case 'slug-language':
        options.slugLanguage = value;
        if (!['pl', 'en'].includes(options.slugLanguage)) {
          printUsage(1, '--slug-language must be "pl" or "en"');
        }
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }

  return options;
}

function readRows(inputPath) {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`Input file not found: ${inputPath}`);
  const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`Input JSON must be an array: ${inputPath}`);
  return data;
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function extractLegacyNumber(slug) {
  const match = /^KIMCHI-(\d+)$/i.exec(String(slug ?? '').trim());
  return match ? Number.parseInt(match[1], 10) : null;
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    const leftNumber = extractLegacyNumber(left.current_slug);
    const rightNumber = extractLegacyNumber(right.current_slug);
    if (leftNumber != null && rightNumber != null && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
    if (leftNumber != null && rightNumber == null) return -1;
    if (leftNumber == null && rightNumber != null) return 1;
    return `${left.name_pl ?? left.name_en ?? left.id}`.localeCompare(
      `${right.name_pl ?? right.name_en ?? right.id}`,
      'pl',
      { sensitivity: 'base' },
    );
  });
}

function stripDiacritics(value) {
  const map = new Map([
    ['ą', 'a'],
    ['ć', 'c'],
    ['ę', 'e'],
    ['ł', 'l'],
    ['ń', 'n'],
    ['ó', 'o'],
    ['ś', 's'],
    ['ż', 'z'],
    ['ź', 'z'],
    ['Ą', 'a'],
    ['Ć', 'c'],
    ['Ę', 'e'],
    ['Ł', 'l'],
    ['Ń', 'n'],
    ['Ó', 'o'],
    ['Ś', 's'],
    ['Ż', 'z'],
    ['Ź', 'z'],
    ['ø', 'o'],
    ['Ø', 'o'],
    ['đ', 'd'],
    ['Đ', 'd'],
  ]);
  return [...value.normalize('NFKD')]
    .filter((char) => !/\p{Mark}/u.test(char))
    .map((char) => map.get(char) ?? char)
    .join('');
}

function slugify(value) {
  return stripDiacritics(normalizeText(value))
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function trimSlug(value, maxLength = MAX_SLUG_LENGTH) {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).replace(/-[^-]*$/, '').replace(/^-+|-+$/g, '');
}

function makeCsvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(outputPath, rows) {
  const headers = [
    'id',
    'current_slug',
    'new_code',
    'new_slug',
    'name_pl',
    'name_en',
    'category_name',
    'primary_category_name',
    'ean_standard',
    'slug_collision_group',
    'notes',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => makeCsvValue(row[header])).join(',')),
  ];
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
}

function writeJson(jsonPath, payload) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function tableRow(values) {
  return `| ${values.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`;
}

function writeReport(reportPath, summary, rows, collisionGroups) {
  const collisionSamples = collisionGroups
    .filter((group) => group.rows.length > 1)
    .slice(0, 20);
  const sampleRows = rows.slice(0, 30);

  const lines = [
    '# Asia Deli Go SKU / Slug Migration Dry Run',
    '',
    `Generated: ${summary.generatedAt}`,
    `Products inspected: ${summary.totalProducts}`,
    '',
    '## Policy',
    '',
    '- This is a dry-run only. It does not write to the database.',
    '- Public product code uses a new Asia Deli Go sequence: `ADG-000001`, `ADG-000002`, ...',
    '- Public slug is generated from the product name, not from the legacy Kimchi ID.',
    '- If multiple products produce the same SEO slug, each duplicate gets its `ADG` code appended.',
    '- The old `KIMCHI-*` value should be kept only in private legacy metadata for rollback/audit.',
    '',
    '## Summary',
    '',
    `- Legacy Kimchi slugs: ${summary.legacyKimchiSlugs} / ${summary.totalProducts}`,
    `- Products with existing product_code: ${summary.existingProductCodes}`,
    `- Products with EAN in products.ean_standard: ${summary.productsWithEan}`,
    `- New code duplicates: ${summary.duplicateNewCodes}`,
    `- New slug duplicates after suffixing: ${summary.duplicateNewSlugs}`,
    `- Raw slug collision groups before suffixing: ${summary.rawSlugCollisionGroups}`,
    `- Slugs needing ADG suffix: ${summary.rowsWithCollisionSuffix}`,
    `- Rows needing manual review: ${summary.rowsNeedingReview}`,
    '',
    '## Proposed DB Scope For Apply Phase',
    '',
    '- `products.slug` -> `new_slug`',
    '- `products.product_code` -> `new_code`',
    '- `products.product_code_base` -> `new_code`',
    '- `product_translations.slug` for PL/EN -> `new_slug` or language-specific slug after review',
    '- `products.private_metadata` should store `{ "legacy_kimchi_slug": "...", "legacy_source": "kimchi.pl scrape" }`',
    '',
    '## Collision Samples',
    '',
  ];

  if (collisionSamples.length === 0) {
    lines.push('No raw slug collisions detected.');
  } else {
    lines.push(tableRow(['raw slug base', 'count', 'sample current slugs']));
    lines.push(tableRow(['---', '---', '---']));
    for (const group of collisionSamples) {
      lines.push(
        tableRow([
          group.base,
          group.rows.length,
          group.rows
            .slice(0, 5)
            .map((row) => row.current_slug)
            .join(', '),
        ]),
      );
    }
  }

  lines.push('', '## First 30 Mappings', '');
  lines.push(tableRow(['current slug', 'new code', 'new slug', 'name']));
  lines.push(tableRow(['---', '---', '---', '---']));
  for (const row of sampleRows) {
    lines.push(tableRow([row.current_slug, row.new_code, row.new_slug, row.name_pl || row.name_en]));
  }

  lines.push(
    '',
    '## Review Notes',
    '',
    '- Apply should be done in a transaction with a backup table.',
    '- Storefront product routes and admin product links must be tested after apply.',
    '- If the site already has indexed URLs, add redirects from old `KIMCHI-*` slugs to new slugs.',
    '- This does not solve image/text licensing by itself; it only removes the most visible Kimchi SKU/URL trace.',
    '',
  );

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join('\n'));
}

function buildMapping(sourceRows, options) {
  const rows = sortRows(sourceRows);
  const staged = rows.map((row, index) => {
    const namePl = normalizeText(row.name_pl);
    const nameEn = normalizeText(row.name_en);
    const slugName = options.slugLanguage === 'en' ? nameEn || namePl : namePl || nameEn;
    const newCode = `${options.prefix}-${String(options.start + index).padStart(6, '0')}`;
    const baseSlug = trimSlug(slugify(slugName) || newCode.toLowerCase().replace(/-/g, ''));
    return {
      id: row.id,
      current_slug: normalizeText(row.current_slug),
      new_code: newCode,
      raw_slug_base: baseSlug,
      name_pl: namePl,
      name_en: nameEn,
      category_name: normalizeText(row.category_name),
      primary_category_name: normalizeText(row.primary_category_name),
      ean_standard: normalizeText(row.ean_standard),
      created_at: row.created_at,
      notes: [],
    };
  });

  const groupsByBase = new Map();
  for (const row of staged) {
    if (!groupsByBase.has(row.raw_slug_base)) groupsByBase.set(row.raw_slug_base, []);
    groupsByBase.get(row.raw_slug_base).push(row);
  }

  const mappedRows = staged.map((row) => {
    const group = groupsByBase.get(row.raw_slug_base) ?? [];
    const needsSuffix = group.length > 1;
    const suffix = row.new_code.toLowerCase().replace(/-/g, '');
    const newSlug = needsSuffix
      ? trimSlug(`${trimSlug(row.raw_slug_base, MAX_SLUG_LENGTH - suffix.length - 1)}-${suffix}`)
      : row.raw_slug_base;
    const notes = [...row.notes];
    if (!/^KIMCHI-/i.test(row.current_slug)) notes.push('current_slug_not_kimchi');
    if (!row.name_pl && !row.name_en) notes.push('missing_product_name');
    if (needsSuffix) notes.push('raw_slug_collision_suffix_added');
    if (!row.ean_standard) notes.push('missing_ean_standard');
    return {
      ...row,
      new_slug: newSlug,
      slug_collision_group: needsSuffix ? row.raw_slug_base : '',
      notes: notes.join('|'),
    };
  });

  return {
    rows: mappedRows,
    collisionGroups: [...groupsByBase.entries()].map(([base, groupRows]) => ({
      base,
      rows: groupRows,
    })),
  };
}

function countDuplicates(rows, key) {
  const counts = new Map();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1).length;
}

function main() {
  const options = parseArgs();
  const sourceRows = readRows(options.input);
  const { rows, collisionGroups } = buildMapping(sourceRows, options);
  const summary = {
    generatedAt: new Date().toISOString(),
    input: options.input,
    prefix: options.prefix,
    start: options.start,
    slugLanguage: options.slugLanguage,
    totalProducts: rows.length,
    legacyKimchiSlugs: rows.filter((row) => /^KIMCHI-/i.test(row.current_slug)).length,
    existingProductCodes: sourceRows.filter((row) => normalizeText(row.product_code)).length,
    productsWithEan: rows.filter((row) => row.ean_standard).length,
    duplicateNewCodes: countDuplicates(rows, 'new_code'),
    duplicateNewSlugs: countDuplicates(rows, 'new_slug'),
    rawSlugCollisionGroups: collisionGroups.filter((group) => group.rows.length > 1).length,
    rowsWithCollisionSuffix: rows.filter((row) => row.slug_collision_group).length,
    rowsNeedingReview: rows.filter((row) =>
      row.notes
        .split('|')
        .filter(Boolean)
        .some((note) => note !== 'missing_ean_standard' && note !== 'raw_slug_collision_suffix_added'),
    ).length,
  };

  const payload = { summary, rows };
  writeCsv(options.output, rows);
  writeJson(options.json, payload);
  writeReport(options.report, summary, rows, collisionGroups);

  console.log(`Products inspected: ${summary.totalProducts}`);
  console.log(`Legacy Kimchi slugs: ${summary.legacyKimchiSlugs}`);
  console.log(`Raw slug collision groups: ${summary.rawSlugCollisionGroups}`);
  console.log(`Rows with collision suffix: ${summary.rowsWithCollisionSuffix}`);
  console.log(`Duplicate new codes: ${summary.duplicateNewCodes}`);
  console.log(`Duplicate new slugs: ${summary.duplicateNewSlugs}`);
  console.log(`Rows needing review: ${summary.rowsNeedingReview}`);
  console.log(`Wrote CSV: ${options.output}`);
  console.log(`Wrote JSON: ${options.json}`);
  console.log(`Wrote report: ${options.report}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
