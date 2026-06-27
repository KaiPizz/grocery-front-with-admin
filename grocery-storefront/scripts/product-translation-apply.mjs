#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/product-translation-en-dry-run.json';
const DEFAULT_REPORT = 'docs/product-translation-en-apply.md';
const DEFAULT_API_BASE = 'https://zira-ai.com/api/v1';
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_LIMIT = null;

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/product-translation-apply.mjs [options]');
  console.log('');
  console.log('Applies reviewed product translations through the backend Product Translation API.');
  console.log('Safe default: preview only. Add --execute and PRODUCT_TRANSLATION_TOKEN to write data.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>       Input dry-run JSON (default: ${DEFAULT_INPUT})`);
  console.log(`  --report <path>      Markdown report path (default: ${DEFAULT_REPORT})`);
  console.log(`  --api-base <url>     Backend API base URL (default: ${DEFAULT_API_BASE})`);
  console.log(`  --language <code>    Target language code (default: ${DEFAULT_LANGUAGE})`);
  console.log('  --limit <n>          Apply/preview only first n rows');
  console.log('  --execute            Write through backend API');
  console.log('  --help               Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    report: DEFAULT_REPORT,
    apiBase: process.env.PRODUCT_TRANSLATION_API_BASE || DEFAULT_API_BASE,
    language: DEFAULT_LANGUAGE,
    execute: false,
    limit: DEFAULT_LIMIT,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (arg === '--execute') {
      options.execute = true;
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
      case 'report':
        options.report = value;
        break;
      case 'api-base':
        options.apiBase = value.replace(/\/+$/, '');
        break;
      case 'language':
        options.language = value;
        break;
      case 'limit': {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1) {
          printUsage(1, `Invalid --limit "${value}"`);
        }
        options.limit = parsed;
        break;
      }
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }

  options.apiBase = options.apiBase.replace(/\/+$/, '');
  return options;
}

function readRows(inputPath) {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  if (!Array.isArray(data)) {
    throw new Error(`Input JSON must be an array: ${inputPath}`);
  }

  return data;
}

function cleanText(value) {
  const text = String(value ?? '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

function validateRow(row, index) {
  const errors = [];
  if (!row || typeof row !== 'object') errors.push('row is not an object');
  if (!row.id || typeof row.id !== 'string') errors.push('missing product id');
  if (row.status !== 'translated') errors.push(`status is "${row.status}"`);
  if (row.notes) errors.push(`notes is not empty: ${row.notes}`);
  if (!cleanText(row.proposedEnglishName)) errors.push('missing proposedEnglishName');
  if (!cleanText(row.proposedEnglishDescription)) errors.push('missing proposedEnglishDescription');

  return errors.map((error) => `row ${index + 1} ${row?.slug ? `(${row.slug}) ` : ''}${error}`);
}

function buildPayload(row) {
  const productName = cleanText(row.proposedEnglishName);
  const shortDescription = cleanText(row.proposedEnglishDescription);

  return {
    productName,
    shortDescription,
    metaTitle: productName,
    metaDescription: shortDescription,
  };
}

async function applyRow(options, token, row) {
  const response = await fetch(
    `${options.apiBase}/products/${encodeURIComponent(row.id)}/translations/${encodeURIComponent(options.language)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPayload(row)),
    },
  );

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    const message = body?.message || body?.error || response.statusText;
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  return body;
}

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function writeReport(options, rows, results, validationErrors) {
  const applied = results.filter((row) => row.status === 'applied').length;
  const previewed = results.filter((row) => row.status === 'preview').length;
  const failed = results.filter((row) => row.status === 'failed').length;

  const lines = [
    '# Product English Translation Apply Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${options.execute ? 'execute' : 'preview'}`,
    `API base: ${options.apiBase}`,
    `Language: ${options.language}`,
    `Input rows: ${rows.length}`,
    `Rows included: ${results.length}`,
    `Rows applied: ${applied}`,
    `Rows previewed: ${previewed}`,
    `Rows failed: ${failed}`,
    '',
  ];

  if (validationErrors.length) {
    lines.push('## Validation Errors', '');
    validationErrors.slice(0, 100).forEach((error) => lines.push(`- ${error}`));
    if (validationErrors.length > 100) {
      lines.push(`- ... ${validationErrors.length - 100} more`);
    }
    lines.push('');
  }

  lines.push('## Rows', '');
  lines.push('| Slug | Product ID | English name | Status | Message |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const result of results) {
    lines.push([
      escapeMarkdown(result.slug),
      escapeMarkdown(result.id),
      escapeMarkdown(result.productName),
      escapeMarkdown(result.status),
      escapeMarkdown(result.message),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  fs.mkdirSync(path.dirname(options.report), { recursive: true });
  fs.writeFileSync(options.report, `${lines.join('\n')}\n`);
}

async function main() {
  const options = parseArgs();
  const allRows = readRows(options.input);
  const rows = options.limit ? allRows.slice(0, options.limit) : allRows;
  const validationErrors = rows.flatMap((row, index) => validateRow(row, index));

  if (validationErrors.length) {
    writeReport(options, allRows, [], validationErrors);
    throw new Error(`Validation failed with ${validationErrors.length} error(s). See ${options.report}`);
  }

  const token = process.env.PRODUCT_TRANSLATION_TOKEN;
  if (options.execute && !token) {
    throw new Error('PRODUCT_TRANSLATION_TOKEN is required when using --execute');
  }

  const results = [];
  for (const row of rows) {
    const payload = buildPayload(row);

    if (!options.execute) {
      results.push({
        id: row.id,
        slug: row.slug,
        productName: payload.productName,
        status: 'preview',
        message: 'no write; pass --execute to apply',
      });
      continue;
    }

    try {
      const body = await applyRow(options, token, row);
      results.push({
        id: row.id,
        slug: row.slug,
        productName: body?.productName || payload.productName,
        status: 'applied',
        message: body?.updatedAt ? `updatedAt=${body.updatedAt}` : 'ok',
      });
    } catch (error) {
      results.push({
        id: row.id,
        slug: row.slug,
        productName: payload.productName,
        status: 'failed',
        message: error.message,
      });
    }
  }

  writeReport(options, allRows, results, validationErrors);

  const failed = results.filter((row) => row.status === 'failed').length;
  console.log(`Mode: ${options.execute ? 'execute' : 'preview'}`);
  console.log(`Rows included: ${results.length}`);
  console.log(`Rows failed: ${failed}`);
  console.log(`Report: ${options.report}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
