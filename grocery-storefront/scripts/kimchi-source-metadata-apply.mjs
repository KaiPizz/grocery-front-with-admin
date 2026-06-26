#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/kimchi-source-metadata-dry-run.csv';
const DEFAULT_OUTPUT = 'docs/kimchi-source-metadata-apply.sql';
const DEFAULT_REPORT = 'docs/kimchi-source-metadata-apply.md';
const DEFAULT_CHANNEL = 'kenmito';

const NON_FOOD_CATEGORIES = new Set([
  'koreańskie-kosmetyki',
  'komplety-do-sushi-i-herbaty',
  'pałeczki-i-sztućce',
  'noże',
  'patelnie-wok-grill',
  'miski',
  'parowary-bambusowe',
  'patelnie-tamago',
  'koty-szczęścia-i-inne-gadżety',
  'maty-do-zwijania',
  'foremki',
  'moździerze',
  'zaparzacze-do-kawy',
  'naczynia',
  'prezenty',
  'zestawy-do-sushi',
]);

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }
  console.log('Usage: node scripts/kimchi-source-metadata-apply.mjs [options]');
  console.log('');
  console.log('Generates safe SQL to fill missing Kenmito food metadata from the kimchi.pl dry-run CSV.');
  console.log('It does not connect to the database or mutate data.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>     Source CSV (default: ${DEFAULT_INPUT})`);
  console.log(`  --output <path>    SQL output path (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --report <path>    Markdown report path (default: ${DEFAULT_REPORT})`);
  console.log(`  --channel <slug>   Storefront channel slug (default: ${DEFAULT_CHANNEL})`);
  console.log('  --help             Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    report: DEFAULT_REPORT,
    channel: DEFAULT_CHANNEL,
  };
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (!arg.startsWith('--')) printUsage(1, `Unexpected argument "${arg}"`);
    const value = args[index + 1];
    if (value == null || value.startsWith('--')) printUsage(1, `Missing value for "${arg}"`);
    switch (arg.slice(2)) {
      case 'input':
        options.input = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'report':
        options.report = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }
  return options;
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    records.push(row);
  }
  return records;
}

function readCsv(filePath) {
  const records = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const header = records.shift();
  if (!header?.length) throw new Error(`CSV header missing in ${filePath}`);
  return records
    .map((record) => Object.fromEntries(header.map((key, index) => [key, record[index] ?? ''])))
    .filter((row) => row.id && row.firstSku);
}

function sqlString(value) {
  if (value == null || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value == null) return 'NULL';
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function compactText(value, maxLength = 4000) {
  const text = String(value ?? '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function parseNumber(value) {
  if (value === '') return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildNutrition(row) {
  const nutrition = {};
  const map = [
    ['nutritionCaloriesKcal', 'calories'],
    ['nutritionFat', 'fat'],
    ['nutritionSaturatedFat', 'saturatedFat'],
    ['nutritionCarbs', 'carbs'],
    ['nutritionSugar', 'sugar'],
    ['nutritionFiber', 'fiber'],
    ['nutritionProtein', 'protein'],
    ['nutritionSalt', 'salt'],
  ];
  for (const [csvKey, outKey] of map) {
    const value = parseNumber(row[csvKey]);
    if (value !== null) nutrition[outKey] = value;
  }
  if (row.nutritionServingSize?.trim()) nutrition.servingSize = row.nutritionServingSize.trim();
  return Object.keys(nutrition).length > 0 ? nutrition : null;
}

function buildCandidate(row) {
  if (row.decision !== 'review_candidate') return null;
  if (row.sourceStatus !== '200') return null;
  if (NON_FOOD_CATEGORIES.has(row.category)) return null;

  const allergens = row.candidateAllergens
    ? row.candidateAllergens.split('|').map((value) => value.trim()).filter(Boolean)
    : null;
  const nutrition = row.nutritionRaw ? buildNutrition(row) : null;
  const storageZone = ['AMBIENT', 'CHILLED', 'FROZEN'].includes(row.candidateStorageZone)
    ? row.candidateStorageZone
    : null;
  const ingredients = row.rawIngredients ? compactText(row.rawIngredients) : null;

  if (!allergens?.length && !nutrition && !storageZone && !ingredients) return null;

  return {
    sku: row.firstSku,
    productId: row.id,
    name: row.name,
    category: row.category,
    sourceUrl: row.sourceUrl,
    allergens: allergens?.length ? allergens : null,
    nutrition,
    storageZone,
    ingredients,
  };
}

function writeSql(filePath, options, candidates) {
  const backupTable = `kenmito_product_metadata_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const values = candidates.map((candidate) => [
    sqlString(candidate.sku),
    sqlString(candidate.productId),
    sqlString(candidate.sourceUrl),
    sqlString(candidate.ingredients),
    sqlJson(candidate.nutrition),
    sqlJson(candidate.allergens),
    sqlString(candidate.storageZone),
  ].join(', '));

  const sql = [
    '-- Generated by scripts/kimchi-source-metadata-apply.mjs',
    '-- Safe behavior: Kenmito channel only; fills missing fields only; keeps existing product data.',
    'BEGIN;',
    '',
    `CREATE TABLE IF NOT EXISTS ${backupTable} (LIKE products INCLUDING ALL);`,
    '',
    'WITH source(sku, product_id, source_url, ingredients, nutrition_facts, allergens, storage_zone) AS (',
    `  VALUES\n  (${values.join('),\n  (')})`,
    '), matched AS (',
    '  SELECT DISTINCT p.*',
    '  FROM source s',
    '  JOIN channels ch ON ch.slug = ' + sqlString(options.channel) + ' AND ch.is_active = true',
    '  JOIN product_variants v ON v.sku = s.sku AND v.salon_id = ch.salon_id',
    '  JOIN products p ON p.id = v.template_id AND p.salon_id = ch.salon_id',
    '  WHERE p.deleted_at IS NULL',
    '), backup_insert AS (',
    `  INSERT INTO ${backupTable}`,
    '  SELECT m.* FROM matched m',
    `  WHERE NOT EXISTS (SELECT 1 FROM ${backupTable} b WHERE b.id = m.id)`,
    '  RETURNING id',
    '), updated AS (',
    '  UPDATE products p',
    '  SET',
    "    ingredients = CASE WHEN NULLIF(p.ingredients, '') IS NULL AND s.ingredients IS NOT NULL THEN s.ingredients ELSE p.ingredients END,",
    '    nutrition_facts = CASE WHEN p.nutrition_facts IS NULL AND s.nutrition_facts IS NOT NULL THEN s.nutrition_facts ELSE p.nutrition_facts END,',
    "    storage_zone = CASE WHEN NULLIF(p.storage_zone, '') IS NULL AND s.storage_zone IS NOT NULL THEN s.storage_zone ELSE p.storage_zone END,",
    "    allergens = CASE WHEN (p.allergens IS NULL OR p.allergens = '[]'::jsonb) AND s.allergens IS NOT NULL THEN s.allergens ELSE p.allergens END,",
    '    updated_at = NOW()',
    '  FROM source s',
    '  JOIN channels ch ON ch.slug = ' + sqlString(options.channel) + ' AND ch.is_active = true',
    '  JOIN product_variants v ON v.sku = s.sku AND v.salon_id = ch.salon_id',
    '  WHERE p.id = v.template_id',
    '    AND p.salon_id = ch.salon_id',
    '    AND p.deleted_at IS NULL',
    '    AND (',
    "      (NULLIF(p.ingredients, '') IS NULL AND s.ingredients IS NOT NULL)",
    '      OR (p.nutrition_facts IS NULL AND s.nutrition_facts IS NOT NULL)',
    "      OR (NULLIF(p.storage_zone, '') IS NULL AND s.storage_zone IS NOT NULL)",
    "      OR ((p.allergens IS NULL OR p.allergens = '[]'::jsonb) AND s.allergens IS NOT NULL)",
    '    )',
    '  RETURNING p.id, p.name',
    ')',
    'SELECT',
    '  (SELECT COUNT(*) FROM source) AS source_rows,',
    '  (SELECT COUNT(*) FROM matched) AS matched_products,',
    '  (SELECT COUNT(*) FROM backup_insert) AS backed_up_products,',
    '  (SELECT COUNT(*) FROM updated) AS updated_products;',
    '',
    'COMMIT;',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sql);
  return backupTable;
}

function writeReport(filePath, rows, candidates, backupTable, sqlPath) {
  const skippedNonFood = rows.filter((row) => row.decision === 'review_candidate' && NON_FOOD_CATEGORIES.has(row.category)).length;
  const stats = {
    candidates: candidates.length,
    withIngredients: candidates.filter((row) => row.ingredients).length,
    withNutrition: candidates.filter((row) => row.nutrition).length,
    withAllergens: candidates.filter((row) => row.allergens?.length).length,
    withStorage: candidates.filter((row) => row.storageZone).length,
    skippedNonFood,
  };

  const lines = [
    '# Kimchi Source Metadata Apply Plan',
    '',
    `Generated: ${new Date().toISOString()}`,
    `SQL: ${sqlPath}`,
    `Backup table: ${backupTable}`,
    '',
    'This report is generated from the dry-run CSV. The SQL fills missing Kenmito product fields only and keeps existing values.',
    '',
    '## Counts',
    '',
    '| Metric | Count |',
    '| --- | ---: |',
    `| candidate rows | ${stats.candidates} |`,
    `| with ingredients | ${stats.withIngredients} |`,
    `| with nutrition facts | ${stats.withNutrition} |`,
    `| with allergens | ${stats.withAllergens} |`,
    `| with storage zone | ${stats.withStorage} |`,
    `| skipped non-food candidates | ${stats.skippedNonFood} |`,
    '',
    '## Sample Updates',
    '',
    '| SKU | Product | Category | Ingredients | Nutrition | Allergens | Storage |',
    '| --- | --- | --- | ---: | ---: | ---: | --- |',
  ];
  for (const row of candidates.slice(0, 60)) {
    lines.push(`| ${row.sku} | ${row.name.replaceAll('|', '/')} | ${row.category} | ${row.ingredients ? 'yes' : 'no'} | ${row.nutrition ? 'yes' : 'no'} | ${row.allergens?.length ? row.allergens.join(' ') : '-'} | ${row.storageZone ?? '-'} |`);
  }
  lines.push('');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'));
}

function main() {
  const options = parseArgs();
  const rows = readCsv(options.input);
  const candidates = rows.map(buildCandidate).filter(Boolean);
  const backupTable = writeSql(options.output, options, candidates);
  writeReport(options.report, rows, candidates, backupTable, options.output);

  console.log(`Read ${rows.length} CSV rows.`);
  console.log(`Generated ${candidates.length} safe update candidates.`);
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.report}`);
}

main();
