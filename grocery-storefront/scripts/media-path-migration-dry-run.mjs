#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-media-path-source-20260708.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-media-path-migration-dry-run-20260708.csv';
const DEFAULT_JSON = 'docs/asiandeligo-media-path-migration-dry-run-20260708.json';
const DEFAULT_REPORT = 'docs/asiandeligo-media-path-migration-dry-run-20260708.md';
const DEFAULT_CONCURRENCY = 12;

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/media-path-migration-dry-run.mjs [options]');
  console.log('');
  console.log('Generates a dry-run report for moving Asia Deli Go media URLs from KIMCHI folders to ADG folders.');
  console.log('It does not copy files and does not mutate the database.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>          Source media JSON export (default: ${DEFAULT_INPUT})`);
  console.log(`  --output <path>         CSV mapping output (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --json <path>           JSON mapping output (default: ${DEFAULT_JSON})`);
  console.log(`  --report <path>         Markdown report output (default: ${DEFAULT_REPORT})`);
  console.log('  --check-http            HEAD-check each unique source URL');
  console.log(`  --concurrency <number>  HTTP concurrency when --check-http is used (default: ${DEFAULT_CONCURRENCY})`);
  console.log('  --help                  Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    json: DEFAULT_JSON,
    report: DEFAULT_REPORT,
    checkHttp: false,
    concurrency: DEFAULT_CONCURRENCY,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (arg === '--check-http') {
      options.checkHttp = true;
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
      case 'concurrency':
        options.concurrency = Number.parseInt(value, 10);
        if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 50) {
          printUsage(1, '--concurrency must be between 1 and 50');
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
  return String(value ?? '').trim();
}

function buildTargetUrl(row) {
  const sourceUrl = normalizeText(row.source_url);
  const productCode = normalizeText(row.product_code);
  const legacySlug = normalizeText(row.legacy_kimchi_slug);
  const notes = [];

  if (!sourceUrl) notes.push('missing_source_url');
  if (!/^ADG-\d{6}$/.test(productCode)) notes.push('invalid_product_code');
  if (!/^KIMCHI-\d+$/i.test(legacySlug)) notes.push('missing_legacy_kimchi_slug');

  const match = sourceUrl.match(/\/products\/(KIMCHI-\d+)\/([^/?#]+)([?#].*)?$/i);
  if (!match) {
    notes.push('source_url_not_kimchi_product_path');
    return { targetUrl: '', imageFile: '', sourceFolder: '', notes };
  }

  const sourceFolder = match[1];
  const imageFile = match[2];
  if (legacySlug && sourceFolder.toUpperCase() !== legacySlug.toUpperCase()) {
    notes.push('url_folder_differs_from_legacy_slug');
  }

  const targetUrl = sourceUrl.replace(`/products/${sourceFolder}/`, `/products/${productCode}/`);
  return { targetUrl, imageFile, sourceFolder, notes };
}

async function headCheck(url) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    return {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type') ?? '',
      contentLength: response.headers.get('content-length') ?? '',
      etag: response.headers.get('etag') ?? '',
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      contentType: '',
      contentLength: '',
      etag: '',
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
      if ((index + 1) % 250 === 0) {
        console.log(`HTTP checked ${index + 1}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function makeCsvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(outputPath, rows) {
  const headers = [
    'field_key',
    'source_table',
    'source_column',
    'product_id',
    'product_image_id',
    'product_code',
    'legacy_kimchi_slug',
    'product_slug',
    'image_file',
    'source_url',
    'target_url',
    'source_http_status',
    'source_http_ok',
    'source_content_type',
    'source_content_length',
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

function writeReport(reportPath, summary, rows) {
  const issueRows = rows.filter((row) => row.notes);
  const samples = rows.slice(0, 25);
  const issueSamples = issueRows.slice(0, 25);

  const lines = [
    '# Asia Deli Go Media Path Migration Dry Run',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Field rows inspected: ${summary.fieldRows}`,
    `- Unique source URLs: ${summary.uniqueSourceUrls}`,
    `- Unique target URLs: ${summary.uniqueTargetUrls}`,
    `- Products covered: ${summary.productsCovered}`,
    `- Product image rows covered: ${summary.productImageRowsCovered}`,
    `- Target collisions across unique source URLs: ${summary.targetCollisions}`,
    `- Rows with notes: ${summary.rowsWithNotes}`,
    `- HTTP checked: ${summary.httpChecked ? 'yes' : 'no'}`,
    `- Source HTTP OK: ${summary.sourceHttpOk}`,
    `- Source HTTP failed: ${summary.sourceHttpFailed}`,
    '',
    '## What This Does Not Do',
    '',
    '- It does not copy media files.',
    '- It does not update DB rows.',
    '- It does not make legacy scraped images licensed or original.',
    '',
    '## First 25 Mappings',
    '',
    tableRow(['field', 'ADG code', 'source', 'target']),
    tableRow(['---', '---', '---', '---']),
    ...samples.map((row) => tableRow([row.field_key, row.product_code, row.source_url, row.target_url])),
    '',
  ];

  if (issueSamples.length > 0) {
    lines.push('## Issue Samples', '');
    lines.push(tableRow(['field', 'ADG code', 'source', 'notes']));
    lines.push(tableRow(['---', '---', '---', '---']));
    for (const row of issueSamples) {
      lines.push(tableRow([row.field_key, row.product_code, row.source_url, row.notes]));
    }
    lines.push('');
  }

  lines.push(
    '## Next Apply Phase',
    '',
    '- Copy each unique source URL to the target ADG URL/object key.',
    '- Verify target URLs return 200 and expected image content type.',
    '- Update `products.image_url` and `product_images.image_large_url` in a transaction with backup tables.',
    '- Keep legacy image URL in metadata or backup report for rollback.',
    '- Mark these images as `legacy_scraped_rehosted` until replaced by owner/supplier images.',
    '',
  );

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join('\n'));
}

function summarize(rows, options) {
  const uniqueSourceUrls = new Set(rows.map((row) => row.source_url).filter(Boolean));
  const uniqueTargetUrls = new Set(rows.map((row) => row.target_url).filter(Boolean));
  const sourceToTarget = new Map();
  const targetSources = new Map();
  for (const row of rows) {
    if (!row.source_url || !row.target_url) continue;
    sourceToTarget.set(row.source_url, row.target_url);
    if (!targetSources.has(row.target_url)) targetSources.set(row.target_url, new Set());
    targetSources.get(row.target_url).add(row.source_url);
  }
  const targetCollisions = [...targetSources.values()].filter((sources) => sources.size > 1).length;

  return {
    generatedAt: new Date().toISOString(),
    input: options.input,
    fieldRows: rows.length,
    uniqueSourceUrls: uniqueSourceUrls.size,
    uniqueTargetUrls: uniqueTargetUrls.size,
    productsCovered: new Set(rows.map((row) => row.product_id).filter(Boolean)).size,
    productImageRowsCovered: new Set(rows.map((row) => row.product_image_id).filter(Boolean)).size,
    targetCollisions,
    rowsWithNotes: rows.filter((row) => row.notes).length,
    httpChecked: options.checkHttp,
    sourceHttpOk: rows.filter((row) => row.source_http_ok === true).length,
    sourceHttpFailed: rows.filter((row) => row.source_http_ok === false).length,
  };
}

async function main() {
  const options = parseArgs();
  const sourceRows = readRows(options.input);
  const mappedRows = sourceRows.map((row) => {
    const { targetUrl, imageFile, sourceFolder, notes } = buildTargetUrl(row);
    return {
      field_key: normalizeText(row.field_key),
      source_table: normalizeText(row.source_table),
      source_column: normalizeText(row.source_column),
      product_id: normalizeText(row.product_id),
      product_image_id: normalizeText(row.product_image_id),
      product_code: normalizeText(row.product_code),
      legacy_kimchi_slug: normalizeText(row.legacy_kimchi_slug),
      product_slug: normalizeText(row.product_slug),
      image_file: imageFile,
      source_folder: sourceFolder,
      source_url: normalizeText(row.source_url),
      target_url: targetUrl,
      source_http_status: '',
      source_http_ok: '',
      source_content_type: '',
      source_content_length: '',
      notes: notes.join('|'),
    };
  });

  if (options.checkHttp) {
    const uniqueUrls = [...new Set(mappedRows.map((row) => row.source_url).filter(Boolean))];
    console.log(`HTTP checking ${uniqueUrls.length} unique source URLs with concurrency ${options.concurrency}`);
    const checks = await mapWithConcurrency(uniqueUrls, options.concurrency, (url) => headCheck(url));
    const checksByUrl = new Map(uniqueUrls.map((url, index) => [url, checks[index]]));
    for (const row of mappedRows) {
      const check = checksByUrl.get(row.source_url);
      if (!check) continue;
      row.source_http_status = check.status;
      row.source_http_ok = check.ok;
      row.source_content_type = check.contentType;
      row.source_content_length = check.contentLength;
      if (!check.ok) {
        row.notes = [row.notes, `source_http_failed:${check.status || check.error || 'unknown'}`]
          .filter(Boolean)
          .join('|');
      }
    }
  }

  const summary = summarize(mappedRows, options);
  writeCsv(options.output, mappedRows);
  writeJson(options.json, { summary, rows: mappedRows });
  writeReport(options.report, summary, mappedRows);

  console.log(`Field rows inspected: ${summary.fieldRows}`);
  console.log(`Unique source URLs: ${summary.uniqueSourceUrls}`);
  console.log(`Unique target URLs: ${summary.uniqueTargetUrls}`);
  console.log(`Target collisions: ${summary.targetCollisions}`);
  console.log(`Rows with notes: ${summary.rowsWithNotes}`);
  if (options.checkHttp) {
    console.log(`Source HTTP OK rows: ${summary.sourceHttpOk}`);
    console.log(`Source HTTP failed rows: ${summary.sourceHttpFailed}`);
  }
  console.log(`Wrote CSV: ${options.output}`);
  console.log(`Wrote JSON: ${options.json}`);
  console.log(`Wrote report: ${options.report}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
