#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-owner-image-import-dry-run-folder01-20260709.csv';
const DEFAULT_SKU_MAPPING = 'docs/asiandeligo-sku-slug-migration-dry-run-20260708.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-owner-image-import-sql-plan-folder01-20260709.sql';
const DEFAULT_REPORT = 'docs/asiandeligo-owner-image-import-sql-plan-folder01-20260709.md';
const DEFAULT_BATCH = 'asiandeligo-owner-images-folder01-20260709';
const DEFAULT_EXPECTED_ROWS = 52;
const DEFAULT_EXPECTED_PRODUCTS = 41;

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/owner-image-import-sql-plan.mjs [options]');
  console.log('');
  console.log('Generates a guarded SQL plan for attaching reviewed Asia Deli Go owner images.');
  console.log('It does not connect to the database and does not mutate data.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>              Owner image dry-run CSV (default: ${DEFAULT_INPUT})`);
  console.log(`  --sku-mapping <path>        SKU/slug dry-run JSON with stable product ids (default: ${DEFAULT_SKU_MAPPING})`);
  console.log(`  --output <path>             SQL output path (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --report <path>             Markdown report path (default: ${DEFAULT_REPORT})`);
  console.log(`  --batch <label>             Batch label (default: ${DEFAULT_BATCH})`);
  console.log(`  --expected-rows <number>    Expected image rows (default: ${DEFAULT_EXPECTED_ROWS})`);
  console.log(`  --expected-products <number> Expected distinct products (default: ${DEFAULT_EXPECTED_PRODUCTS})`);
  console.log('  --help                      Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    skuMapping: DEFAULT_SKU_MAPPING,
    output: DEFAULT_OUTPUT,
    report: DEFAULT_REPORT,
    batch: DEFAULT_BATCH,
    expectedRows: DEFAULT_EXPECTED_ROWS,
    expectedProducts: DEFAULT_EXPECTED_PRODUCTS,
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
      case 'sku-mapping':
        options.skuMapping = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'report':
        options.report = value;
        break;
      case 'batch':
        options.batch = value.replace(/[^a-zA-Z0-9_.:-]/g, '-').slice(0, 100);
        if (!options.batch) printUsage(1, '--batch cannot be empty');
        break;
      case 'expected-rows':
        options.expectedRows = parsePositiveInt(value, '--expected-rows');
        break;
      case 'expected-products':
        options.expectedProducts = parsePositiveInt(value, '--expected-products');
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
  if (!Number.isInteger(parsed) || parsed < 1) {
    printUsage(1, `${label} must be a positive integer`);
  }
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

function readDryRunRows(inputPath) {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`Input file not found: ${inputPath}`);
  const rows = parseCsv(fs.readFileSync(resolvedPath, 'utf8'));
  if (rows.length === 0) throw new Error(`Input CSV has no rows: ${inputPath}`);
  return rows;
}

function readSkuMapping(inputPath) {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`SKU mapping file not found: ${inputPath}`);
  const payload = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  if (!payload || !Array.isArray(payload.rows)) {
    throw new Error(`SKU mapping JSON must contain rows array: ${inputPath}`);
  }
  return new Map(payload.rows.map((row) => [row.new_code, row]));
}

function sqlString(value) {
  if (value == null || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid integer value: ${value}`);
  return String(parsed);
}

function safeIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50) || 'batch';
}

function backupIdentifierBase(batch) {
  return safeIdentifier(batch)
    .replace(/^asiandeligo_owner_images_folder01_/, 'adg_owner_img_f01_')
    .slice(0, 32);
}

function buildSourceRows(rows, skuMapping) {
  return rows.map((row) => {
    const mapping = skuMapping.get(row.target_sku);
    if (!mapping) throw new Error(`Missing SKU mapping for ${row.target_sku}`);
    if (!mapping.id || !mapping.current_slug) {
      throw new Error(`SKU mapping for ${row.target_sku} lacks id/current_slug`);
    }

    return {
      ...row,
      target_product_id: mapping.id,
      current_slug: mapping.current_slug,
      new_slug: mapping.new_slug,
    };
  });
}

function validateRows(rows, options) {
  const errors = [];
  const targetKeys = new Set();
  const targetUrls = new Set();
  const productIds = new Set();

  if (rows.length !== options.expectedRows) {
    errors.push(`expected ${options.expectedRows} image rows, got ${rows.length}`);
  }

  rows.forEach((row, index) => {
    const label = `row ${index + 1} (${row.target_sku || 'no SKU'} ${row.image_file || 'no image'})`;
    if (!/^ADG-\d{6}$/.test(row.target_sku)) errors.push(`${label}: invalid target_sku`);
    if (!/^[0-9a-f-]{36}$/i.test(row.target_product_id)) errors.push(`${label}: invalid target_product_id`);
    if (!/^KIMCHI-\d+$/i.test(row.current_slug)) errors.push(`${label}: current_slug is not KIMCHI-*`);
    if (!/^https:\/\/img\.zira\.pl\/asiandeligo\/owner-images\/folder01\/ADG-\d{6}\/\d{2}-SAU_\d+\.jpg$/.test(row.target_url)) {
      errors.push(`${label}: unexpected target_url`);
    }
    if (!/^[a-f0-9]{64}$/i.test(row.sha256)) errors.push(`${label}: invalid sha256`);
    if (row.source_image_found !== 'yes') errors.push(`${label}: source_image_found is not yes`);
    if (row.notes) errors.push(`${label}: dry-run notes not empty (${row.notes})`);
    if (targetKeys.has(row.proposed_media_key)) errors.push(`${label}: duplicate proposed_media_key`);
    if (targetUrls.has(row.target_url)) errors.push(`${label}: duplicate target_url`);
    targetKeys.add(row.proposed_media_key);
    targetUrls.add(row.target_url);
    productIds.add(row.target_product_id);
  });

  if (productIds.size !== options.expectedProducts) {
    errors.push(`expected ${options.expectedProducts} distinct products, got ${productIds.size}`);
  }

  return errors;
}

function sourceValuesSql(rows) {
  return rows
    .map((row) =>
      [
        sqlString(row.target_sku),
        `${sqlString(row.target_product_id)}::uuid`,
        sqlString(row.current_slug),
        sqlString(row.new_slug),
        sqlString(row.review_id),
        sqlString(row.image_file),
        sqlInteger(row.image_order_for_sku),
        sqlString(row.target_url),
        sqlString(row.proposed_media_key),
        sqlString(row.sha256),
        sqlInteger(row.source_size_bytes),
        sqlInteger(row.width),
        sqlInteger(row.height),
        sqlString(row.owner_notes),
        sqlString(row.import_rule),
      ].join(', '),
    )
    .join('),\n  (');
}

function writeSql(options, rows) {
  const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const batchIdent = backupIdentifierBase(options.batch);
  const productBackup = `${batchIdent}_products_bak_${dateSuffix}`;
  const imageBackup = `${batchIdent}_images_bak_${dateSuffix}`;
  const sourceValues = sourceValuesSql(rows);

  const sql = [
    '-- Generated by scripts/owner-image-import-sql-plan.mjs',
    `-- Batch: ${options.batch}`,
    '-- Purpose: attach reviewed owner-provided Asia Deli Go product images to product_images.',
    '-- Safe behavior: backs up affected products/product_images; validates exact row counts; aborts on missing product, multi-salon source, duplicate target URL/hash, or rerun.',
    '-- Media precondition: files must be uploaded before running this SQL so every target_url returns 200.',
    '--',
    '-- JOIN contract:',
    '--   _adg_owner_image_source.target_product_id (uuid, from reviewed SKU migration dry-run) = products.id (uuid, PK) - semantic verified against the reviewed catalog mapping.',
    '--   product_images.template_id (uuid, FK) = products.id (uuid, PK); product_images.salon_id = products.salon_id for tenant isolation.',
    '--   product_images.variant_id remains NULL; chk_product_images_entity requires exactly one of template_id/variant_id.',
    '--   Soft-delete: products filtered deleted_at IS NULL; product_images has no deleted_at column.',
    '--   Slug guard accepts either reviewed current KIMCHI slug or reviewed new ADG slug so the plan works before or after SKU/slug migration.',
    'BEGIN;',
    '',
    'CREATE TEMP TABLE _adg_owner_image_source (',
    '  target_sku text NOT NULL,',
    '  target_product_id uuid NOT NULL,',
    '  current_slug text NOT NULL,',
    '  new_slug text NOT NULL,',
    '  review_id text NOT NULL,',
    '  image_file text NOT NULL,',
    '  image_order integer NOT NULL,',
    '  target_url text NOT NULL,',
    '  r2_key text NOT NULL,',
    '  sha256 text NOT NULL,',
    '  file_size integer NOT NULL,',
    '  width integer NOT NULL,',
    '  height integer NOT NULL,',
    '  owner_notes text,',
    '  import_rule text NOT NULL,',
    '  PRIMARY KEY (target_product_id, image_file),',
    '  UNIQUE (target_url),',
    '  UNIQUE (r2_key)',
    ') ON COMMIT DROP;',
    '',
    'INSERT INTO _adg_owner_image_source (',
    '  target_sku, target_product_id, current_slug, new_slug, review_id, image_file, image_order,',
    '  target_url, r2_key, sha256, file_size, width, height, owner_notes, import_rule',
    ')',
    `VALUES\n  (${sourceValues});`,
    '',
    'DO $$',
    'DECLARE',
    '  source_count integer;',
    '  product_count integer;',
    '  matched_count integer;',
    '  live_count integer;',
    '  distinct_salon_count integer;',
    '  slug_guard_match_count integer;',
    '  existing_target_url_count integer;',
    '  existing_target_hash_count integer;',
    'BEGIN',
    '  SELECT COUNT(*), COUNT(DISTINCT target_product_id) INTO source_count, product_count FROM _adg_owner_image_source;',
    '  IF source_count <> ' + options.expectedRows + ' THEN',
    "    RAISE EXCEPTION 'Expected " + options.expectedRows + " source image rows, got %', source_count;",
    '  END IF;',
    '  IF product_count <> ' + options.expectedProducts + ' THEN',
    "    RAISE EXCEPTION 'Expected " + options.expectedProducts + " source products, got %', product_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*),',
    '         COUNT(*) FILTER (WHERE p.deleted_at IS NULL),',
    '         COUNT(DISTINCT p.salon_id),',
    '         COUNT(*) FILTER (WHERE p.slug = s.current_slug OR p.slug = s.new_slug)',
    '    INTO matched_count, live_count, distinct_salon_count, slug_guard_match_count',
    '  FROM _adg_owner_image_source s',
    '  JOIN products p ON p.id = s.target_product_id;',
    '',
    '  IF matched_count <> source_count THEN',
    "    RAISE EXCEPTION 'Product match count mismatch: source %, matched %', source_count, matched_count;",
    '  END IF;',
    '  IF live_count <> source_count THEN',
    "    RAISE EXCEPTION 'Some target products are soft-deleted: live %, source %', live_count, source_count;",
    '  END IF;',
    '  IF distinct_salon_count <> 1 THEN',
    "    RAISE EXCEPTION 'Source products span % salons; aborting tenant-unsafe write', distinct_salon_count;",
    '  END IF;',
    '  IF slug_guard_match_count <> source_count THEN',
    "    RAISE EXCEPTION 'Slug guard failed: %/% source rows match expected current KIMCHI slug or new ADG slug', slug_guard_match_count, source_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO existing_target_url_count',
    '  FROM _adg_owner_image_source s',
    '  JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    '  JOIN product_images pi ON pi.salon_id = p.salon_id AND pi.image_large_url = s.target_url;',
    '  IF existing_target_url_count <> 0 THEN',
    "    RAISE EXCEPTION 'Target owner image URLs already exist (% rows); aborting to avoid duplicate import', existing_target_url_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO existing_target_hash_count',
    '  FROM _adg_owner_image_source s',
    '  JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    '  JOIN product_images pi ON pi.salon_id = p.salon_id AND pi.template_id = p.id AND pi.file_hash = s.sha256;',
    '  IF existing_target_hash_count <> 0 THEN',
    "    RAISE EXCEPTION 'Target owner image hashes already exist on target products (% rows); aborting to avoid duplicate import', existing_target_hash_count;",
    '  END IF;',
    'END $$;',
    '',
    `CREATE TABLE ${productBackup} AS`,
    'SELECT p.*, now() AS backup_created_at',
    'FROM products p',
    'JOIN (SELECT DISTINCT target_product_id FROM _adg_owner_image_source) s ON s.target_product_id = p.id',
    'WHERE p.deleted_at IS NULL;',
    '',
    `CREATE TABLE ${imageBackup} AS`,
    'SELECT pi.*, now() AS backup_created_at',
    'FROM product_images pi',
    'JOIN products p ON p.id = pi.template_id AND p.salon_id = pi.salon_id AND p.deleted_at IS NULL',
    'JOIN (SELECT DISTINCT target_product_id FROM _adg_owner_image_source) s ON s.target_product_id = p.id;',
    '',
    'WITH target_products AS (',
    '  SELECT DISTINCT p.id AS target_product_id, p.salon_id',
    '  FROM _adg_owner_image_source s',
    '  JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    ')',
    'UPDATE product_images pi',
    'SET is_primary = false,',
    '    priority = 1000 + COALESCE(pi.priority, 0),',
    '    updated_at = now()',
    'FROM target_products tp',
    'WHERE pi.template_id = tp.target_product_id',
    '  AND pi.salon_id = tp.salon_id;',
    '',
    'INSERT INTO product_images (',
    '  salon_id, template_id, variant_id, category, priority, is_primary,',
    '  image_large_url, image_medium_url, image_small_url, url_small, url_thumbnail, url_micro,',
    '  image_id, mime_type, file_size, width, height, alt_text, r2_keys, file_hash, r2_synced,',
    '  created_at, updated_at',
    ')',
    'SELECT',
    '  p.salon_id,',
    '  p.id,',
    '  NULL::uuid,',
    "  CASE WHEN s.image_order = 1 THEN 'LISTING'::product_image_category ELSE 'GALLERY'::product_image_category END,",
    '  s.image_order - 1,',
    '  s.image_order = 1,',
    '  s.target_url,',
    '  s.target_url,',
    '  s.target_url,',
    '  s.target_url,',
    '  s.target_url,',
    '  s.target_url,',
    '  s.image_file,',
    "  'image/jpeg',",
    '  s.file_size,',
    '  s.width,',
    '  s.height,',
    '  p.name,',
    '  jsonb_build_array(s.r2_key),',
    '  s.sha256,',
    '  false,',
    '  now(),',
    '  now()',
    'FROM _adg_owner_image_source s',
    'JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    'ORDER BY s.target_sku, s.image_order;',
    '',
    'WITH first_images AS (',
    '  SELECT DISTINCT ON (s.target_product_id)',
    '    s.target_product_id, p.salon_id, s.target_url',
    '  FROM _adg_owner_image_source s',
    '  JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    '  ORDER BY s.target_product_id, s.image_order ASC',
    ')',
    'UPDATE products p',
    'SET image_url = f.target_url,',
    "    images = COALESCE(p.images, '{}'::jsonb) || jsonb_build_object(",
    "      'desktop', f.target_url,",
    "      'thumbnail', f.target_url,",
    "      'source', 'owner_image_import',",
    `      'batch', ${sqlString(options.batch)}`,
    '    ),',
    '    updated_at = now()',
    'FROM first_images f',
    'WHERE p.id = f.target_product_id',
    '  AND p.salon_id = f.salon_id',
    '  AND p.deleted_at IS NULL;',
    '',
    'DO $$',
    'DECLARE',
    '  inserted_count integer;',
    '  primary_count integer;',
    '  updated_products integer;',
    'BEGIN',
    '  SELECT COUNT(*) INTO inserted_count',
    '  FROM _adg_owner_image_source s',
    '  JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    '  JOIN product_images pi ON pi.salon_id = p.salon_id AND pi.template_id = p.id AND pi.image_large_url = s.target_url;',
    '  SELECT COUNT(*) INTO primary_count',
    '  FROM _adg_owner_image_source s',
    '  JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    '  JOIN product_images pi ON pi.salon_id = p.salon_id AND pi.template_id = p.id AND pi.image_large_url = s.target_url',
    "  WHERE pi.is_primary = true AND pi.category = 'LISTING'::product_image_category;",
    '  SELECT COUNT(*) INTO updated_products',
    '  FROM (SELECT DISTINCT target_product_id FROM _adg_owner_image_source) s',
    '  JOIN products p ON p.id = s.target_product_id AND p.deleted_at IS NULL',
    '  JOIN _adg_owner_image_source first_s ON first_s.target_product_id = p.id AND first_s.image_order = 1',
    '  WHERE p.image_url = first_s.target_url;',
    '',
    '  IF inserted_count <> ' + options.expectedRows + ' THEN',
    "    RAISE EXCEPTION 'Post-check failed: expected " + options.expectedRows + " inserted owner images, got %', inserted_count;",
    '  END IF;',
    '  IF primary_count <> ' + options.expectedProducts + ' THEN',
    "    RAISE EXCEPTION 'Post-check failed: expected " + options.expectedProducts + " primary LISTING images, got %', primary_count;",
    '  END IF;',
    '  IF updated_products <> ' + options.expectedProducts + ' THEN',
    "    RAISE EXCEPTION 'Post-check failed: expected " + options.expectedProducts + " product image_url updates, got %', updated_products;",
    '  END IF;',
    'END $$;',
    '',
    'SELECT',
    '  p.salon_id,',
    '  COUNT(*) AS owner_images_inserted,',
    '  COUNT(DISTINCT p.id) AS products_updated,',
    "  COUNT(*) FILTER (WHERE pi.category = 'LISTING'::product_image_category AND pi.is_primary = true) AS primary_listing_images",
    'FROM _adg_owner_image_source s',
    'JOIN products p ON p.id = s.target_product_id',
    'JOIN product_images pi ON pi.template_id = p.id AND pi.salon_id = p.salon_id AND pi.image_large_url = s.target_url',
    'GROUP BY p.salon_id;',
    '',
    'COMMIT;',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, sql);
}

function tableRow(values) {
  return `| ${values.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`;
}

function writeReport(options, rows) {
  const productCount = new Set(rows.map((row) => row.target_product_id)).size;
  const primaryRows = rows.filter((row) => String(row.image_order_for_sku) === '1');
  const samples = rows.slice(0, 25);

  const lines = [
    '# Asia Deli Go Owner Image Import SQL Plan - Folder 01',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Batch: ${options.batch}`,
    `- Image rows planned: ${rows.length}`,
    `- Distinct products planned: ${productCount}`,
    `- Primary image candidates: ${primaryRows.length}`,
    `- SQL output: \`${options.output}\``,
    '',
    '## Preconditions',
    '',
    '- Upload/stage the 52 image files so each `target_url` returns 200 before running SQL.',
    '- Run this SQL against the correct eNail PostgreSQL database only after reviewing the guards.',
    '- The plan is idempotency-protected by URL/hash checks and should abort if already applied.',
    '',
    '## JOIN Contract',
    '',
    '- `_adg_owner_image_source.target_product_id` is a UUID from the reviewed SKU migration dry-run and joins to `products.id`.',
    '- `product_images.template_id` is a declared FK to `products.id`; `product_images.salon_id = products.salon_id` keeps tenant scope.',
    '- `products.deleted_at IS NULL` is required; `product_images` has no soft-delete column.',
    '- Current build DB still stores these products under salon slug `kamito` with `KIMCHI-*` slugs; the plan uses stable product UUIDs and accepts either the reviewed current `KIMCHI-*` slug or reviewed new ADG slug.',
    '',
    '## Write Effects',
    '',
    '- Backs up affected `products` rows.',
    '- Backs up existing `product_images` for the affected products.',
    '- Demotes existing product images by setting `is_primary=false` and adding `1000` to `priority`.',
    '- Inserts owner images: first image per product as `LISTING/is_primary=true/priority=0`, additional images as `GALLERY`.',
    '- Updates `products.image_url` and `products.images.desktop/thumbnail` to the first owner image.',
    '',
    '## First 25 Planned Rows',
    '',
    tableRow(['target_sku', 'current_slug', 'image_file', 'order', 'target_product_id', 'target_url']),
    tableRow(['---', '---', '---', '---:', '---', '---']),
    ...samples.map((row) =>
      tableRow([
        row.target_sku,
        row.current_slug,
        row.image_file,
        row.image_order_for_sku,
        row.target_product_id,
        row.target_url,
      ]),
    ),
  ];

  fs.mkdirSync(path.dirname(options.report), { recursive: true });
  fs.writeFileSync(options.report, `${lines.join('\n')}\n`);
}

function main() {
  const options = parseArgs();
  const dryRunRows = readDryRunRows(options.input);
  const skuMapping = readSkuMapping(options.skuMapping);
  const rows = buildSourceRows(dryRunRows, skuMapping);
  const errors = validateRows(rows, options);
  if (errors.length > 0) {
    throw new Error(`Validation failed:\n- ${errors.join('\n- ')}`);
  }

  writeSql(options, rows);
  writeReport(options, rows);

  console.log(JSON.stringify({
    input: options.input,
    output: options.output,
    report: options.report,
    imageRows: rows.length,
    products: new Set(rows.map((row) => row.target_product_id)).size,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
