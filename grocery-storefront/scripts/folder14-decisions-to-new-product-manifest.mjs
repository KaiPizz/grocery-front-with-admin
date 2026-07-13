#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_DECISIONS = [
  'docs/asiandeligo-folder14-batch001-owner-decisions.csv',
  'docs/asiandeligo-folder14-batch002-owner-decisions.csv',
  'docs/asiandeligo-folder14-batch003-owner-decisions.csv',
];
const DEFAULT_OUTPUT = 'docs/asiandeligo-new-product-creation-manifest-folder14-20260713.csv';
const DEFAULT_GALLERY_OUTPUT = 'docs/asiandeligo-new-product-gallery-backlog-folder14-20260713.csv';
const DEFAULT_REPORT = 'docs/asiandeligo-new-product-creation-manifest-folder14-20260713.md';
const DEFAULT_IMAGE_ROOT = '/tmp/asiandeligo-owner-images';
const DEFAULT_START_SKU = 1792;
const DEFAULT_STOCK = 100;

const CATEGORY_BY_REVIEW_ID = {
  'folder14-001': 'Pałeczki i sztućce',
  'folder14-002': 'Pałeczki i sztućce',
  'folder14-003': 'Naczynia',
  'folder14-004': 'Naczynia',
  'folder14-005': 'Patelnie Wok / Grill',
  'folder14-006': 'Miski',
  'folder14-007': 'Patelnie Wok / Grill',
  'folder14-008': 'Patelnie Wok / Grill',
  'folder14-009': 'Patelnie Wok / Grill',
  'folder14-010': 'Patelnie Wok / Grill',
  'folder14-011': 'Noże',
  'folder14-012': 'Noże',
  'folder14-013': 'Naczynia',
  'folder14-014': 'Naczynia',
  'folder14-015': 'Noże',
  'folder14-016': 'Noże',
  'folder14-017': 'Zaparzacze do kawy',
  'folder14-018': 'Maty do zwijania',
  'folder14-019': 'Pałeczki i sztućce',
  'folder14-020': 'Noże',
  'folder14-022': 'Pałeczki i sztućce',
  'folder14-023': 'Pałeczki i sztućce',
  'folder14-024': 'Patelnie Wok / Grill',
  'folder14-026': 'Pozostałe produkty',
  'folder14-027': 'Noże',
  'folder14-028': 'Pozostałe produkty',
  'folder14-030': 'Koty szczęścia i inne gadżety',
  'folder14-031': 'Parowary bambusowe',
  'folder14-032': 'Parowary bambusowe',
  'folder14-033': 'Miski',
  'folder14-034': 'Miski',
  'folder14-035': 'Naczynia',
  'folder14-036': 'Patelnie Wok / Grill',
  'folder14-037': 'Patelnie Wok / Grill',
  'folder14-038': 'Koty szczęścia i inne gadżety',
  'folder14-039': 'Koty szczęścia i inne gadżety',
  'folder14-040': 'Koty szczęścia i inne gadżety',
  'folder14-041': 'Koty szczęścia i inne gadżety',
  'folder14-042': 'Koty szczęścia i inne gadżety',
  'folder14-043': 'Koty szczęścia i inne gadżety',
  'folder14-044': 'Naczynia',
  'folder14-046': 'Prezenty',
  'folder14-047': 'Słodycze / Przekąski',
  'folder14-048': 'Herbaty',
  'folder14-049': 'Słodycze / Przekąski',
  'folder14-050': 'Pozostałe produkty',
  'folder14-051': 'Pozostałe produkty',
  'folder14-052': 'Naczynia',
  'folder14-053': 'Naczynia',
  'folder14-054': 'Pozostałe produkty',
  'folder14-055': 'Pozostałe produkty',
  'folder14-056': 'Naczynia',
  'folder14-057': 'Pałeczki i sztućce',
};

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/folder14-decisions-to-new-product-manifest.mjs [options]');
  console.log('');
  console.log('Converts owner-exported folder14 decision CSVs into the manifest format consumed by new-product-creation-plan.mjs.');
  console.log('It does not write the database and does not deploy anything.');
  console.log('');
  console.log('Options:');
  console.log(`  --decisions <paths>       Comma-separated decision CSVs (default: ${DEFAULT_DECISIONS.join(',')})`);
  console.log(`  --output <path>           Product creation manifest CSV (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --gallery-output <path>   Extra selected images backlog CSV (default: ${DEFAULT_GALLERY_OUTPUT})`);
  console.log(`  --report <path>           Markdown report path (default: ${DEFAULT_REPORT})`);
  console.log(`  --image-root <path>       Owner image root (default: ${DEFAULT_IMAGE_ROOT})`);
  console.log(`  --start-sku <number>      First numeric ADG draft SKU (default: ${DEFAULT_START_SKU})`);
  console.log(`  --stock <number>          Temporary default stock (default: ${DEFAULT_STOCK})`);
  console.log('  --help                    Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    decisions: DEFAULT_DECISIONS,
    output: DEFAULT_OUTPUT,
    galleryOutput: DEFAULT_GALLERY_OUTPUT,
    report: DEFAULT_REPORT,
    imageRoot: DEFAULT_IMAGE_ROOT,
    startSku: DEFAULT_START_SKU,
    stock: DEFAULT_STOCK,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (!arg.startsWith('--')) printUsage(1, `Unexpected argument "${arg}"`);
    const value = args[index + 1];
    if (value == null || value.startsWith('--')) printUsage(1, `Missing value for "${arg}"`);

    switch (arg.slice(2)) {
      case 'decisions':
        options.decisions = value.split(',').map((item) => item.trim()).filter(Boolean);
        break;
      case 'output':
        options.output = value;
        break;
      case 'gallery-output':
        options.galleryOutput = value;
        break;
      case 'report':
        options.report = value;
        break;
      case 'image-root':
        options.imageRoot = value;
        break;
      case 'start-sku':
        options.startSku = parsePositiveInt(value, '--start-sku');
        break;
      case 'stock':
        options.stock = parsePositiveInt(value, '--stock');
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }

  return options;
}

function parsePositiveInt(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) printUsage(1, `${label} must be a positive integer`);
  return parsed;
}

function parseCsv(contents) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter((values) => values.some((item) => item !== ''))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function csvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(outputPath, rows, headers) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(',')),
  ];
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
}

function categorySlug(categoryName) {
  return String(categoryName ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/[,\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function draftSku(number) {
  return `ADG-${String(number).padStart(6, '0')}`;
}

function splitFiles(value) {
  return String(value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedImageIndexes(ownerNotes, fileCount) {
  const numbers = Array.from(String(ownerNotes ?? '').matchAll(/\d+/g))
    .map((match) => Number.parseInt(match[0], 10))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= fileCount);
  if (numbers.length === 0) return [1];
  return Array.from(new Set(numbers));
}

function loadDecisionRows(decisionPaths) {
  return decisionPaths.flatMap((decisionPath) => {
    const resolvedPath = path.resolve(process.cwd(), decisionPath);
    if (!fs.existsSync(resolvedPath)) throw new Error(`Decision CSV not found: ${decisionPath}`);
    return parseCsv(fs.readFileSync(resolvedPath, 'utf8')).map((row) => ({
      ...row,
      decision_file: decisionPath,
    }));
  });
}

function makeRows(decisionRows, options) {
  const productRows = [];
  const galleryRows = [];
  const skippedRows = [];
  let skuNumber = options.startSku;

  for (const row of decisionRows) {
    const decision = String(row.decision ?? '').trim();
    if (decision !== 'create_new') {
      skippedRows.push(row);
      continue;
    }

    const files = splitFiles(row.files);
    if (files.length === 0) throw new Error(`${row.id}: no files listed`);
    const indexes = selectedImageIndexes(row.owner_notes, files.length);
    const selectedFiles = indexes.map((fileIndex) => files[fileIndex - 1]);
    const primaryFile = selectedFiles[0];
    const sourceImagePath = path.join(options.imageRoot, row.source_batch, 'extracted', primaryFile);
    const sku = draftSku(skuNumber);
    const categoryName = CATEGORY_BY_REVIEW_ID[row.id];
    if (!categoryName) throw new Error(`${row.id}: no category mapping`);

    productRows.push({
      draft_status: 'missing_required_fields',
      review_id: row.id,
      draft_sku: sku,
      source_image: primaryFile,
      source_image_path: sourceImagePath,
      proposed_media_key: `owner-images/folder14/${sku}/01-${primaryFile}`,
      pl_name: row.visible_product,
      en_name: row.visible_product,
      brand: '',
      size: '',
      category_guess: categoryName,
      category_slug_guess: categorySlug(categoryName),
      ean: '',
      price_pln: '',
      stock: String(options.stock),
      country_of_origin: '',
      dietary_tags: '',
      allergens: '',
      missing_required_fields: 'price_pln, ean, country_of_origin, polish_name_review, category_review',
      notes: [
        'Create-new from owner folder14 decision export.',
        row.owner_notes ? `Owner notes: ${row.owner_notes}` : '',
        selectedFiles.length > 1 ? `Selected gallery images: ${selectedFiles.join('; ')}` : '',
        row.reason ? `Original review reason: ${row.reason}` : '',
      ].filter(Boolean).join(' '),
    });

    selectedFiles.forEach((fileName, imageIndex) => {
      galleryRows.push({
        review_id: row.id,
        draft_sku: sku,
        image_order_for_sku: String(imageIndex + 1),
        image_file: fileName,
        source_image_path: path.join(options.imageRoot, row.source_batch, 'extracted', fileName),
        proposed_media_key: `owner-images/folder14/${sku}/${String(imageIndex + 1).padStart(2, '0')}-${fileName}`,
      });
    });

    skuNumber += 1;
  }

  return { productRows, galleryRows, skippedRows };
}

function writeReport(reportPath, summary, productRows, galleryRows, skippedRows) {
  const lines = [
    '# Asia Deli Go Folder14 Owner Decisions -> New Product Manifest',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Decision rows read: ${summary.decisionRows}`,
    `- Create-new products planned: ${summary.productRows}`,
    `- Skipped rows: ${summary.skippedRows}`,
    `- Selected gallery image rows: ${summary.galleryRows}`,
    `- Draft SKU range: ${summary.firstSku} - ${summary.lastSku}`,
    `- Output manifest: \`${summary.output}\``,
    `- Gallery backlog: \`${summary.galleryOutput}\``,
    '',
    '## Notes',
    '',
    '- This only prepares dry-run input; it does not write the database.',
    '- Product prices and EANs remain blank by policy; owner/admin will fill prices later.',
    '- Current product creation SQL supports one primary image per product. Extra owner-selected images are preserved in the gallery backlog for a later image-attach pass.',
    '',
    '## Product Rows',
    '',
    '| review_id | draft_sku | category_slug_guess | source_image | selected_images_note |',
    '| --- | --- | --- | --- | --- |',
    ...productRows.map((row) => `| ${row.review_id} | ${row.draft_sku} | ${row.category_slug_guess} | ${row.source_image} | ${row.notes.replace(/\|/g, '\\|')} |`),
    '',
    '## Skipped Rows',
    '',
    '| review_id | decision | visible_product | owner_notes |',
    '| --- | --- | --- | --- |',
    ...skippedRows.map((row) => `| ${row.id} | ${row.decision} | ${String(row.visible_product ?? '').replace(/\|/g, '\\|')} | ${String(row.owner_notes ?? '').replace(/\|/g, '\\|')} |`),
  ];

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
}

function main() {
  const options = parseArgs();
  const decisionRows = loadDecisionRows(options.decisions);
  const { productRows, galleryRows, skippedRows } = makeRows(decisionRows, options);

  for (const row of galleryRows) {
    if (!fs.existsSync(row.source_image_path)) {
      throw new Error(`Missing selected image for ${row.review_id}: ${row.source_image_path}`);
    }
  }

  const productHeaders = [
    'draft_status',
    'review_id',
    'draft_sku',
    'source_image',
    'source_image_path',
    'proposed_media_key',
    'pl_name',
    'en_name',
    'brand',
    'size',
    'category_guess',
    'category_slug_guess',
    'ean',
    'price_pln',
    'stock',
    'country_of_origin',
    'dietary_tags',
    'allergens',
    'missing_required_fields',
    'notes',
  ];
  const galleryHeaders = [
    'review_id',
    'draft_sku',
    'image_order_for_sku',
    'image_file',
    'source_image_path',
    'proposed_media_key',
  ];

  writeCsv(path.resolve(process.cwd(), options.output), productRows, productHeaders);
  writeCsv(path.resolve(process.cwd(), options.galleryOutput), galleryRows, galleryHeaders);
  const summary = {
    generatedAt: new Date().toISOString(),
    decisionRows: decisionRows.length,
    productRows: productRows.length,
    skippedRows: skippedRows.length,
    galleryRows: galleryRows.length,
    firstSku: productRows[0]?.draft_sku ?? '',
    lastSku: productRows.at(-1)?.draft_sku ?? '',
    output: options.output,
    galleryOutput: options.galleryOutput,
  };
  writeReport(path.resolve(process.cwd(), options.report), summary, productRows, galleryRows, skippedRows);
  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
