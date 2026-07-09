#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-owner-image-import-manifest-folder01-20260709.csv';
const DEFAULT_OUTPUT = 'docs/asiandeligo-owner-image-import-dry-run-folder01-20260709.csv';
const DEFAULT_JSON = 'docs/asiandeligo-owner-image-import-dry-run-folder01-20260709.json';
const DEFAULT_REPORT = 'docs/asiandeligo-owner-image-import-dry-run-folder01-20260709.md';
const DEFAULT_STAGING_DIR = '/tmp/asiandeligo-owner-image-import-dry-run-folder01-20260709';
const DEFAULT_MEDIA_BASE_URL = 'https://img.zira.pl/asiandeligo';

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/owner-image-import-dry-run.mjs [options]');
  console.log('');
  console.log('Validates and stages owner-provided Asia Deli Go product images from a reviewed manifest.');
  console.log('It does not write the database and does not upload production media.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>          Ready image import manifest CSV (default: ${DEFAULT_INPUT})`);
  console.log(`  --output <path>         CSV dry-run output path (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --json <path>           JSON dry-run output path (default: ${DEFAULT_JSON})`);
  console.log(`  --report <path>         Markdown report path (default: ${DEFAULT_REPORT})`);
  console.log(`  --staging-dir <path>    Local staging directory (default: ${DEFAULT_STAGING_DIR})`);
  console.log(`  --media-base-url <url>  Public media base URL (default: ${DEFAULT_MEDIA_BASE_URL})`);
  console.log('  --no-copy-staging       Validate only; do not copy images into staging');
  console.log('  --help                  Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    json: DEFAULT_JSON,
    report: DEFAULT_REPORT,
    stagingDir: DEFAULT_STAGING_DIR,
    mediaBaseUrl: DEFAULT_MEDIA_BASE_URL,
    copyStaging: true,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (arg === '--no-copy-staging') {
      options.copyStaging = false;
      continue;
    }
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
      case 'staging-dir':
        options.stagingDir = value;
        break;
      case 'media-base-url':
        options.mediaBaseUrl = value.replace(/\/+$/, '');
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }

  return options;
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

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
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

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function readJpegDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { width: 0, height: 0, error: 'not_jpeg' };
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;

    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > buffer.length) break;

    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;

    const isSofMarker = (
      (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf)
    );

    if (isSofMarker && length >= 7) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
        error: '',
      };
    }

    offset += length;
  }

  return { width: 0, height: 0, error: 'jpeg_dimensions_not_found' };
}

function safeRelativeKey(value) {
  const normalized = String(value ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    !normalized
    || normalized.includes('..')
    || normalized.split('/').some((part) => part === '')
    || /[^a-zA-Z0-9._/-]/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function tableRow(values) {
  return `| ${values.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`;
}

function writeJson(jsonPath, payload) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeReport(reportPath, summary, rows) {
  const noteRows = rows.filter((row) => row.notes);
  const samples = rows.slice(0, 25);
  const lines = [
    '# Asia Deli Go Owner Image Import Dry Run - Folder 01',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Manifest rows inspected: ${summary.manifestRows}`,
    `- Ready rows staged: ${summary.readyRows}`,
    `- Unique products covered: ${summary.uniqueProducts}`,
    `- Source images found: ${summary.sourceImagesFound}`,
    `- Source images missing: ${summary.sourceImagesMissing}`,
    `- Duplicate target keys: ${summary.duplicateTargetKeys}`,
    `- Rows with notes: ${summary.rowsWithNotes}`,
    `- Staging copy enabled: ${summary.copyStaging ? 'yes' : 'no'}`,
    `- Staging directory: ${summary.stagingDir}`,
    `- Media base URL: ${summary.mediaBaseUrl}`,
    '',
    '## What This Does Not Do',
    '',
    '- It does not write the database.',
    '- It does not upload files to production media storage.',
    '- It does not deploy storefront/admin changes.',
    '- It does not process the hold queue.',
    '',
    '## DB Apply Contract For Later',
    '',
    '- For each `target_sku`, attach rows to `product_images` in `image_order_for_sku` order.',
    '- Use the first image per `target_sku` as candidate `products.image_url` primary image.',
    '- Preserve `review_id`, `owner_notes`, source SHA256, and old image URLs in a backup/audit table before write.',
    '- Run schema introspection and a guarded SQL write plan before any real DB mutation.',
    '',
    '## First 25 Staged Rows',
    '',
    tableRow(['target_sku', 'image_file', 'order', 'target_url', 'width', 'height', 'notes']),
    tableRow(['---', '---', '---:', '---', '---:', '---:', '---']),
    ...samples.map((row) =>
      tableRow([
        row.target_sku,
        row.image_file,
        row.image_order_for_sku,
        row.target_url,
        row.width,
        row.height,
        row.notes,
      ]),
    ),
  ];

  if (noteRows.length > 0) {
    lines.push(
      '',
      '## Rows With Notes',
      '',
      tableRow(['target_sku', 'image_file', 'notes']),
      tableRow(['---', '---', '---']),
      ...noteRows.slice(0, 50).map((row) => tableRow([row.target_sku, row.image_file, row.notes])),
    );
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
}

function main() {
  const options = parseArgs();
  const inputPath = path.resolve(process.cwd(), options.input);
  if (!fs.existsSync(inputPath)) throw new Error(`Input file not found: ${options.input}`);

  const manifestRows = parseCsv(fs.readFileSync(inputPath, 'utf8'));
  const requiredHeaders = [
    'target_sku',
    'image_file',
    'image_order_for_sku',
    'source_image_path',
    'proposed_media_key',
    'owner_notes',
  ];
  const missingHeaders = requiredHeaders.filter((header) => !(header in (manifestRows[0] ?? {})));
  if (missingHeaders.length > 0) {
    throw new Error(`Input manifest missing required headers: ${missingHeaders.join(', ')}`);
  }

  const targetKeyCounts = new Map();
  for (const row of manifestRows) {
    targetKeyCounts.set(row.proposed_media_key, (targetKeyCounts.get(row.proposed_media_key) ?? 0) + 1);
  }

  const dryRunRows = manifestRows.map((row) => {
    const notes = [];
    const targetSku = String(row.target_sku ?? '').trim();
    const sourceImagePath = String(row.source_image_path ?? '').trim();
    const targetKey = safeRelativeKey(row.proposed_media_key);
    const sourceExists = sourceImagePath && fs.existsSync(sourceImagePath);
    const stats = sourceExists ? fs.statSync(sourceImagePath) : null;
    const dimensions = sourceExists ? readJpegDimensions(sourceImagePath) : { width: 0, height: 0, error: 'missing_source_image' };
    const sha256 = sourceExists ? sha256File(sourceImagePath) : '';

    if (!/^ADG-\d{6}$/.test(targetSku)) notes.push('invalid_target_sku');
    if (!targetKey) notes.push('invalid_proposed_media_key');
    if ((targetKeyCounts.get(row.proposed_media_key) ?? 0) > 1) notes.push('duplicate_target_key');
    if (!sourceExists) notes.push('missing_source_image');
    if (dimensions.error) notes.push(dimensions.error);

    const stagingPath = targetKey ? path.join(options.stagingDir, targetKey) : '';
    if (options.copyStaging && sourceExists && targetKey) {
      fs.mkdirSync(path.dirname(stagingPath), { recursive: true });
      fs.copyFileSync(sourceImagePath, stagingPath);
    }

    return {
      manifest_status: row.manifest_status,
      review_id: row.review_id,
      target_sku: targetSku,
      target_product: row.target_product,
      image_file: row.image_file,
      image_order_for_sku: row.image_order_for_sku,
      source_image_path: sourceImagePath,
      source_image_found: sourceExists ? 'yes' : 'no',
      source_size_bytes: stats?.size ?? 0,
      sha256,
      width: dimensions.width,
      height: dimensions.height,
      proposed_media_key: row.proposed_media_key,
      staging_path: stagingPath,
      target_url: targetKey ? `${options.mediaBaseUrl}/${targetKey}` : '',
      db_primary_candidate: String(row.image_order_for_sku) === '1' ? 'yes' : 'no',
      db_action: String(row.image_order_for_sku) === '1'
        ? 'insert_product_image_and_consider_products_image_url'
        : 'insert_product_image',
      owner_notes: row.owner_notes,
      import_rule: row.import_rule,
      notes: notes.join('|'),
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    input: options.input,
    manifestRows: manifestRows.length,
    readyRows: dryRunRows.length,
    uniqueProducts: new Set(dryRunRows.map((row) => row.target_sku)).size,
    sourceImagesFound: dryRunRows.filter((row) => row.source_image_found === 'yes').length,
    sourceImagesMissing: dryRunRows.filter((row) => row.source_image_found !== 'yes').length,
    duplicateTargetKeys: dryRunRows.filter((row) => row.notes.split('|').includes('duplicate_target_key')).length,
    rowsWithNotes: dryRunRows.filter((row) => row.notes).length,
    copyStaging: options.copyStaging,
    stagingDir: options.stagingDir,
    mediaBaseUrl: options.mediaBaseUrl,
  };

  const headers = [
    'manifest_status',
    'review_id',
    'target_sku',
    'target_product',
    'image_file',
    'image_order_for_sku',
    'source_image_path',
    'source_image_found',
    'source_size_bytes',
    'sha256',
    'width',
    'height',
    'proposed_media_key',
    'staging_path',
    'target_url',
    'db_primary_candidate',
    'db_action',
    'owner_notes',
    'import_rule',
    'notes',
  ];

  writeCsv(path.resolve(process.cwd(), options.output), dryRunRows, headers);
  writeJson(path.resolve(process.cwd(), options.json), { summary, rows: dryRunRows });
  writeReport(path.resolve(process.cwd(), options.report), summary, dryRunRows);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.sourceImagesMissing > 0 || summary.duplicateTargetKeys > 0 || summary.rowsWithNotes > 0) {
    process.exitCode = 2;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
