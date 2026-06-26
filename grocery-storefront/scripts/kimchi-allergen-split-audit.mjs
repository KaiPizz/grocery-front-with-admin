#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/kimchi-source-metadata-dry-run.csv';
const DEFAULT_OUTPUT = 'docs/kimchi-allergen-split-audit.md';
const DEFAULT_CSV = 'docs/kimchi-allergen-split-audit.csv';

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

const ALLERGEN_PATTERNS = [
  ['cereals', /\b(pszenic\w*|gluten\w*|jęczmie\w*|jeczmie\w*|żyto|zyto|ows\w*|orkisz\w*|zboż\w*|zboz\w*|mąka pszenna|maka pszenna)\b/iu],
  ['crustaceans', /\b(skorupiak\w*|krewetk\w*|krab\w*|homar\w*|rak\w*)\b/iu],
  ['eggs', /\b(jaj\w*|albumin\w*)\b/iu],
  ['fish', /\b(ryba|ryby|rybami|rybach|rybom|rybę|rybe|rybą|ryba|rybi\w*|bonito|tuńczyk\w*|tunczyk\w*|anchovy|anchois|makrel\w*)\b/iu],
  ['peanuts', /\b(orzeszk\w* ziemn\w*|orzech\w* ziemn\w*|arachid\w*)\b/iu],
  ['soybeans', /\b(soj\w*|soja|sos sojowy|lecytyna sojowa|nasiona soi)\b/iu],
  ['milk', /\b(mleko|mleka|mleczn\w*|laktoz\w*|serwatk\w*|nabiał\w*|nabial\w*)\b/iu],
  ['nuts', /\b(orzech\w*|pistacj\w*|migdał\w*|migdal\w*|nerkow\w*|laskow\w*|włoski\w*|wloski\w*|macadamia)\b/iu],
  ['celery', /\b(seler\w*)\b/iu],
  ['mustard', /\b(gorczyc\w*|musztard\w*)\b/iu],
  ['sesame', /\b(sezam\w*)\b/iu],
  ['sulphites', /\b(siarczyn\w*|dwutlenek siarki|siarka)\b/iu],
  ['lupin', /(^|[^\p{L}])(łubin\p{L}*|lubin\p{L}*)($|[^\p{L}])/iu],
  ['molluscs', /\b(mięczak\w*|mieczak\w*|małż\w*|malz\w*|małże|malze|omułek\w*|omulek\w*|ostryg\w*|kałamarnic\w*|kalmarnic\w*)\b/iu],
];

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }
  console.log('Usage: node scripts/kimchi-allergen-split-audit.mjs [options]');
  console.log('');
  console.log('Read-only audit that splits kimchi.pl allergen warning into contains vs may-contain buckets.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>   Source dry-run CSV (default: ${DEFAULT_INPUT})`);
  console.log(`  --output <path>  Markdown report path (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --csv <path>     CSV report path (default: ${DEFAULT_CSV})`);
  console.log('  --help           Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, csv: DEFAULT_CSV };
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    const value = args[index + 1];
    if (!arg.startsWith('--') || value == null || value.startsWith('--')) {
      printUsage(1, `Invalid argument "${arg}"`);
    }
    switch (arg.slice(2)) {
      case 'input':
        options.input = value;
        break;
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

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectAllergens(rawText) {
  const haystack = normalizeText(rawText).toLocaleLowerCase('pl-PL');
  const codes = [];
  for (const [code, pattern] of ALLERGEN_PATTERNS) {
    if (pattern.test(haystack)) codes.push(code);
  }
  return codes;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseExistingCodes(value) {
  return value ? value.split('|').map((code) => code.trim()).filter(Boolean) : [];
}

function splitWarning(rawWarning) {
  const warning = normalizeText(rawWarning);
  if (!warning) return { containsText: '', mayContainText: '' };

  const mayMatch = warning.match(/(może zawierać|moze zawierac|wytwarzan[yae]?|produkowan[yae]?|przetwarzane są również|przetwarzane sa rowniez)/iu);
  const containsText = mayMatch ? warning.slice(0, mayMatch.index).trim() : warning;
  const mayContainText = mayMatch ? warning.slice(mayMatch.index).trim() : '';

  return { containsText, mayContainText };
}

function arrayDiff(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function buildAuditRow(row) {
  const { containsText, mayContainText } = splitWarning(row.rawAllergenWarning);
  const ingredientContains = detectAllergens(splitWarning(row.rawIngredients).containsText);
  const warningContains = detectAllergens(containsText);
  const mayContain = detectAllergens(mayContainText);
  const contains = unique([...warningContains, ...ingredientContains]);
  const oldCandidate = parseExistingCodes(row.candidateAllergens);

  return {
    decision: row.decision,
    sku: row.firstSku,
    id: row.id,
    name: row.name,
    category: row.category,
    sourceUrl: row.sourceUrl,
    oldCandidate,
    contains,
    mayContain,
    oldExtraVsContains: arrayDiff(oldCandidate, contains),
    containsMissingFromOld: arrayDiff(contains, oldCandidate),
    mayMissingFromOld: arrayDiff(mayContain, oldCandidate),
    containsText,
    mayContainText,
  };
}

function summarize(rows) {
  return {
    rows: rows.length,
    withOldCandidate: rows.filter((row) => row.oldCandidate.length > 0).length,
    withContains: rows.filter((row) => row.contains.length > 0).length,
    withMayContain: rows.filter((row) => row.mayContain.length > 0).length,
    oldMixedContainsMay: rows.filter((row) => row.mayContain.some((code) => row.oldCandidate.includes(code))).length,
    oldExtraVsContains: rows.filter((row) => row.oldExtraVsContains.length > 0).length,
    containsMissingFromOld: rows.filter((row) => row.containsMissingFromOld.length > 0).length,
    mayMissingFromOld: rows.filter((row) => row.mayMissingFromOld.length > 0).length,
  };
}

function writeCsv(filePath, rows) {
  const header = [
    'sku',
    'name',
    'category',
    'sourceUrl',
    'oldCandidateAllergens',
    'containsAllergens',
    'mayContainAllergens',
    'oldExtraVsContains',
    'containsMissingFromOld',
    'mayMissingFromOld',
    'containsText',
    'mayContainText',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([
      row.sku,
      row.name,
      row.category,
      row.sourceUrl,
      row.oldCandidate.join('|'),
      row.contains.join('|'),
      row.mayContain.join('|'),
      row.oldExtraVsContains.join('|'),
      row.containsMissingFromOld.join('|'),
      row.mayMissingFromOld.join('|'),
      row.containsText,
      row.mayContainText,
    ].map(csvEscape).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
}

function writeMarkdown(filePath, rows) {
  const stats = summarize(rows);
  const sampleSkus = ['KIMCHI-1136'];
  const priorityRows = [
    ...rows.filter((row) => sampleSkus.includes(row.sku)),
    ...rows
      .filter((row) => row.oldExtraVsContains.length > 0 || row.mayMissingFromOld.length > 0)
      .sort((left, right) => (
        (right.oldExtraVsContains.length + right.mayMissingFromOld.length)
        - (left.oldExtraVsContains.length + left.mayMissingFromOld.length)
      ))
      .slice(0, 24),
  ];
  const dedupedPriority = [...new Map(priorityRows.map((row) => [row.sku, row])).values()];

  const lines = [
    '# Kimchi Allergen Split Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Read-only audit. No database or production data was changed.',
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '| --- | ---: |',
    `| rows inspected | ${stats.rows} |`,
    `| rows with old candidate allergens | ${stats.withOldCandidate} |`,
    `| rows with contains allergens | ${stats.withContains} |`,
    `| rows with may-contain allergens | ${stats.withMayContain} |`,
    `| old list mixes may-contain terms | ${stats.oldMixedContainsMay} |`,
    `| old list has extra vs contains-only | ${stats.oldExtraVsContains} |`,
    `| contains missing from old list | ${stats.containsMissingFromOld} |`,
    `| may-contain missing from old list | ${stats.mayMissingFromOld} |`,
    '',
    '## Priority Samples',
    '',
    '| SKU | Product | Old allergens | Contains | May contain | Notes |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of dedupedPriority) {
    const notes = [];
    if (row.oldExtraVsContains.length) notes.push(`old extra: ${row.oldExtraVsContains.join(' ')}`);
    if (row.containsMissingFromOld.length) notes.push(`old missing contains: ${row.containsMissingFromOld.join(' ')}`);
    if (row.mayMissingFromOld.length) notes.push(`old missing may: ${row.mayMissingFromOld.join(' ')}`);
    lines.push(`| ${row.sku} | ${row.name.replaceAll('|', '/')} | ${row.oldCandidate.join(' ') || '-'} | ${row.contains.join(' ') || '-'} | ${row.mayContain.join(' ') || '-'} | ${notes.join('; ') || '-'} |`);
  }

  lines.push(
    '',
    '## Recommended Interpretation',
    '',
    '- `containsAllergens` should become the main product allergen list.',
    '- `mayContainAllergens` should be displayed separately as trace/cross-contamination information.',
    '- Existing `allergens` currently mixes both meanings for many products, so using it alone is ambiguous.',
    '',
  );

  fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
}

function main() {
  const options = parseArgs();
  const sourceRows = readCsv(options.input)
    .filter((row) => (
      row.decision === 'review_candidate'
      && row.sourceStatus === '200'
      && !NON_FOOD_CATEGORIES.has(row.category)
    ));
  const rows = sourceRows.map(buildAuditRow);

  writeCsv(options.csv, rows);
  writeMarkdown(options.output, rows);

  const stats = summarize(rows);
  console.log(`Inspected ${stats.rows} rows.`);
  console.log(`Rows with contains allergens: ${stats.withContains}`);
  console.log(`Rows with may-contain allergens: ${stats.withMayContain}`);
  console.log(`Rows where old list has extra vs contains-only: ${stats.oldExtraVsContains}`);
  console.log(`Rows where old list misses may-contain terms: ${stats.mayMissingFromOld}`);
  console.log(`Markdown report: ${options.output}`);
  console.log(`CSV report: ${options.csv}`);
}

main();
