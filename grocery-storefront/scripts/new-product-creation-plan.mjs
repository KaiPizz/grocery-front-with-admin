#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-new-product-creation-manifest-folder01-review2-20260709.csv';
const DEFAULT_OUTPUT = 'docs/asiandeligo-new-product-creation-dry-run-folder01-review2-20260709.csv';
const DEFAULT_JSON = 'docs/asiandeligo-new-product-creation-dry-run-folder01-review2-20260709.json';
const DEFAULT_SQL = 'docs/asiandeligo-new-product-creation-sql-plan-folder01-review2-20260709.sql';
const DEFAULT_REPORT = 'docs/asiandeligo-new-product-creation-sql-plan-folder01-review2-20260709.md';
const DEFAULT_STAGING_DIR = '/tmp/asiandeligo-new-product-creation-dry-run-folder01-review2-20260709';
const DEFAULT_MEDIA_BASE_URL = 'https://img.zira.pl/asiandeligo';
const DEFAULT_CHANNEL = 'kenmito';
const DEFAULT_BATCH = 'asiandeligo-new-products-folder01-review2-20260709';
const DEFAULT_EXPECTED_ROWS = 7;

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/new-product-creation-plan.mjs [options]');
  console.log('');
  console.log('Validates owner-confirmed Asia Deli Go create-new product rows and generates a guarded SQL plan.');
  console.log('It does not connect to the database and does not mutate data.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>          Creation manifest CSV (default: ${DEFAULT_INPUT})`);
  console.log(`  --output <path>         Dry-run CSV output path (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --json <path>           Dry-run JSON output path (default: ${DEFAULT_JSON})`);
  console.log(`  --sql <path>            SQL plan output path (default: ${DEFAULT_SQL})`);
  console.log(`  --report <path>         Markdown report output path (default: ${DEFAULT_REPORT})`);
  console.log(`  --staging-dir <path>    Local image staging directory (default: ${DEFAULT_STAGING_DIR})`);
  console.log(`  --media-base-url <url>  Public media base URL (default: ${DEFAULT_MEDIA_BASE_URL})`);
  console.log(`  --channel <slug>        Runtime channel slug for SQL guards (default: ${DEFAULT_CHANNEL})`);
  console.log(`  --batch <label>         Batch label (default: ${DEFAULT_BATCH})`);
  console.log(`  --expected-rows <n>     Expected source rows (default: ${DEFAULT_EXPECTED_ROWS})`);
  console.log('  --no-copy-staging       Validate only; do not copy images into staging');
  console.log('  --help                  Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    json: DEFAULT_JSON,
    sql: DEFAULT_SQL,
    report: DEFAULT_REPORT,
    stagingDir: DEFAULT_STAGING_DIR,
    mediaBaseUrl: DEFAULT_MEDIA_BASE_URL,
    channel: DEFAULT_CHANNEL,
    batch: DEFAULT_BATCH,
    expectedRows: DEFAULT_EXPECTED_ROWS,
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
    if (value == null || value.startsWith('--')) printUsage(1, `Missing value for "${arg}"`);

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
      case 'sql':
        options.sql = value;
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
      case 'channel':
        options.channel = value;
        break;
      case 'batch':
        options.batch = value.replace(/[^a-zA-Z0-9_.:-]/g, '-').slice(0, 100);
        if (!options.batch) printUsage(1, '--batch cannot be empty');
        break;
      case 'expected-rows':
        options.expectedRows = parsePositiveInt(value, '--expected-rows');
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

function writeJson(outputPath, payload) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
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

function slugify(value) {
  const map = {
    ł: 'l',
    Ł: 'l',
    đ: 'd',
    Đ: 'd',
  };
  return String(value ?? '')
    .replace(/[łŁđĐ]/g, (char) => map[char] ?? char)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 180);
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

function sqlJsonb(value) {
  return `${sqlString(JSON.stringify(value ?? null))}::jsonb`;
}

function splitTags(value) {
  return String(value ?? '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tableRow(values) {
  return `| ${values.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`;
}

function makeRows(manifestRows, options) {
  const seenSlugs = new Map();
  const keyCounts = new Map();
  const skuCounts = new Map();
  const eanCounts = new Map();

  for (const row of manifestRows) {
    keyCounts.set(row.proposed_media_key, (keyCounts.get(row.proposed_media_key) ?? 0) + 1);
    skuCounts.set(row.draft_sku, (skuCounts.get(row.draft_sku) ?? 0) + 1);
    if (row.ean) eanCounts.set(row.ean, (eanCounts.get(row.ean) ?? 0) + 1);
  }

  return manifestRows.map((row) => {
    const notes = [];
    const sourceImagePath = String(row.source_image_path ?? '').trim();
    const targetKey = safeRelativeKey(row.proposed_media_key);
    const sourceExists = sourceImagePath && fs.existsSync(sourceImagePath);
    const stats = sourceExists ? fs.statSync(sourceImagePath) : null;
    const dimensions = sourceExists ? readJpegDimensions(sourceImagePath) : { width: 0, height: 0, error: 'missing_source_image' };
    const sha256 = sourceExists ? sha256File(sourceImagePath) : '';
    const rawSlug = slugify(row.pl_name || row.en_name || row.draft_sku);
    const duplicateIndex = seenSlugs.get(rawSlug) ?? 0;
    seenSlugs.set(rawSlug, duplicateIndex + 1);
    const slug = duplicateIndex === 0 ? rawSlug : `${rawSlug}-${String(row.draft_sku).toLowerCase()}`;
    const stock = Number.parseInt(row.stock, 10);
    const dietaryTags = splitTags(row.dietary_tags);

    if (!/^ADG-\d{6}$/.test(row.draft_sku)) notes.push('invalid_draft_sku');
    if ((skuCounts.get(row.draft_sku) ?? 0) > 1) notes.push('duplicate_manifest_sku');
    if (row.ean && !/^\d{8,14}$/.test(row.ean)) notes.push('invalid_ean_format');
    if (row.ean && (eanCounts.get(row.ean) ?? 0) > 1) notes.push('duplicate_manifest_ean');
    if (!row.pl_name) notes.push('missing_pl_name');
    if (!row.category_slug_guess) notes.push('missing_category_slug');
    if (!Number.isInteger(stock) || stock < 0) notes.push('invalid_stock');
    if (row.price_pln) notes.push('unexpected_price_present');
    if (!targetKey) notes.push('invalid_proposed_media_key');
    if ((keyCounts.get(row.proposed_media_key) ?? 0) > 1) notes.push('duplicate_manifest_media_key');
    if (!sourceExists) notes.push('missing_source_image');
    if (dimensions.error) notes.push(dimensions.error);

    const stagingPath = targetKey ? path.join(options.stagingDir, targetKey) : '';
    if (options.copyStaging && sourceExists && targetKey) {
      fs.mkdirSync(path.dirname(stagingPath), { recursive: true });
      fs.copyFileSync(sourceImagePath, stagingPath);
    }

    return {
      plan_status: notes.length ? 'needs_fix' : 'ready_for_sql_plan',
      review_id: row.review_id,
      draft_sku: row.draft_sku,
      slug,
      product_status: 'draft',
      is_published: 'false',
      is_for_sale: 'false',
      price_pln: '0',
      price_policy: 'owner_price_pending',
      stock: String(stock),
      ean: row.ean,
      pl_name: row.pl_name,
      en_name: row.en_name || row.pl_name,
      brand: row.brand,
      size: row.size,
      category_slug: row.category_slug_guess,
      dietary_tags_json: JSON.stringify(dietaryTags),
      allergens_json: '[]',
      country_of_origin: row.country_of_origin,
      source_image: row.source_image,
      source_image_path: sourceImagePath,
      source_image_found: sourceExists ? 'yes' : 'no',
      source_size_bytes: stats?.size ?? 0,
      sha256,
      width: dimensions.width,
      height: dimensions.height,
      proposed_media_key: row.proposed_media_key,
      staging_path: stagingPath,
      target_url: targetKey ? `${options.mediaBaseUrl}/${targetKey}` : '',
      manifest_missing_required_fields: row.missing_required_fields,
      notes: notes.join('|'),
    };
  });
}

function sourceValuesSql(rows) {
  return rows
    .map((row) =>
      [
        sqlString(row.review_id),
        sqlString(row.draft_sku),
        sqlString(row.slug),
        sqlString(row.pl_name),
        sqlString(row.en_name),
        sqlString(row.brand),
        sqlString(row.size),
        sqlString(row.category_slug),
        sqlString(row.ean),
        sqlInteger(row.stock),
        sqlJsonb(JSON.parse(row.dietary_tags_json)),
        sqlJsonb(JSON.parse(row.allergens_json)),
        sqlString(row.country_of_origin),
        sqlString(row.source_image),
        sqlString(row.target_url),
        sqlString(row.proposed_media_key),
        sqlString(row.sha256),
        sqlInteger(row.source_size_bytes),
        sqlInteger(row.width),
        sqlInteger(row.height),
      ].join(', '),
    )
    .join('),\n  (');
}

function writeSql(options, rows) {
  const sourceValues = sourceValuesSql(rows);
  const sql = [
    '-- Generated by scripts/new-product-creation-plan.mjs',
    `-- Batch: ${options.batch}`,
    `-- Runtime channel guard: ${options.channel}`,
    '-- Purpose: create owner-confirmed Asia Deli Go draft products with owner images.',
    '-- Safe behavior: creates products as draft/unpublished/not-for-sale with retail_price=0 and price_pending metadata.',
    '-- Media precondition: files must be uploaded before running this SQL so every target_url returns 200.',
    '--',
    '-- JOIN contract:',
    '--   channels.slug resolves one active channel; channels.salon_id scopes all product/category/variant/image/translation writes.',
    '--   products.category_id (uuid, FK) = categories.id (uuid, PK); categories.salon_id must equal target channel salon_id.',
    '--   product_variants.template_id (uuid, FK) = products.id (uuid, PK); product_variants.salon_id = products.salon_id.',
    '--   product_images.template_id (uuid, FK) = products.id (uuid, PK); product_images.variant_id remains NULL.',
    '--   product_translations.template_id (uuid, FK) = products.id (uuid, PK).',
    '--   Soft-delete: duplicate guards ignore rows with products/product_variants.deleted_at IS NOT NULL.',
    'BEGIN;',
    '',
    'CREATE TEMP TABLE _adg_new_product_source (',
    '  product_id uuid NOT NULL DEFAULT gen_random_uuid(),',
    '  variant_id uuid NOT NULL DEFAULT gen_random_uuid(),',
    '  review_id text NOT NULL,',
    '  draft_sku text NOT NULL,',
    '  slug text NOT NULL,',
    '  pl_name text NOT NULL,',
    '  en_name text NOT NULL,',
    '  brand text,',
    '  size_label text,',
    '  category_slug text NOT NULL,',
    '  ean text,',
    '  stock integer NOT NULL,',
    "  dietary_tags jsonb NOT NULL DEFAULT '[]'::jsonb,",
    "  allergens jsonb NOT NULL DEFAULT '[]'::jsonb,",
    '  country_of_origin text,',
    '  source_image text NOT NULL,',
    '  target_url text NOT NULL,',
    '  r2_key text NOT NULL,',
    '  sha256 text NOT NULL,',
    '  file_size integer NOT NULL,',
    '  width integer NOT NULL,',
    '  height integer NOT NULL,',
    '  PRIMARY KEY (draft_sku),',
    '  UNIQUE (slug),',
    '  UNIQUE (target_url),',
    '  UNIQUE (r2_key),',
    '  UNIQUE (sha256)',
    ') ON COMMIT DROP;',
    '',
    'INSERT INTO _adg_new_product_source (',
    '  review_id, draft_sku, slug, pl_name, en_name, brand, size_label, category_slug, ean, stock,',
    '  dietary_tags, allergens, country_of_origin, source_image, target_url, r2_key, sha256, file_size, width, height',
    ')',
    `VALUES\n  (${sourceValues});`,
    '',
    'DO $$',
    'DECLARE',
    '  target_salon_id uuid;',
    '  source_count integer;',
    '  category_count integer;',
    '  existing_sku_count integer;',
    '  existing_slug_count integer;',
    '  existing_ean_count integer;',
    '  existing_image_url_count integer;',
    '  existing_image_hash_count integer;',
    'BEGIN',
    `  SELECT ch.salon_id INTO target_salon_id FROM channels ch WHERE ch.slug = ${sqlString(options.channel)} AND ch.is_active = true;`,
    '  IF target_salon_id IS NULL THEN',
    `    RAISE EXCEPTION 'Target channel not found or inactive: ${options.channel}';`,
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO source_count FROM _adg_new_product_source;',
    '  IF source_count <> ' + options.expectedRows + ' THEN',
    "    RAISE EXCEPTION 'Expected " + options.expectedRows + " source products, got %', source_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(DISTINCT c.slug) INTO category_count',
    '  FROM _adg_new_product_source s',
    '  JOIN categories c ON c.salon_id = target_salon_id AND c.slug = s.category_slug AND c.is_active = true;',
    '  IF category_count <> (SELECT COUNT(DISTINCT category_slug) FROM _adg_new_product_source) THEN',
    "    RAISE EXCEPTION 'Category guard failed: not all category slugs resolve in target salon';",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO existing_sku_count',
    '  FROM _adg_new_product_source s',
    '  JOIN product_variants pv ON pv.salon_id = target_salon_id AND pv.deleted_at IS NULL AND pv.sku = s.draft_sku;',
    '  IF existing_sku_count <> 0 THEN',
    "    RAISE EXCEPTION 'SKU guard failed: % target SKUs already exist', existing_sku_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO existing_slug_count',
    '  FROM _adg_new_product_source s',
    '  JOIN products p ON p.salon_id = target_salon_id AND p.deleted_at IS NULL AND p.slug = s.slug;',
    '  IF existing_slug_count <> 0 THEN',
    "    RAISE EXCEPTION 'Slug guard failed: % target slugs already exist', existing_slug_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO existing_ean_count',
    '  FROM _adg_new_product_source s',
    '  JOIN product_variants pv ON pv.salon_id = target_salon_id AND pv.deleted_at IS NULL AND pv.ean = s.ean',
    "  WHERE s.ean IS NOT NULL AND s.ean <> '';",
    '  IF existing_ean_count <> 0 THEN',
    "    RAISE EXCEPTION 'EAN guard failed: % researched EANs already exist', existing_ean_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO existing_image_url_count',
    '  FROM _adg_new_product_source s',
    '  JOIN product_images pi ON pi.salon_id = target_salon_id AND pi.image_large_url = s.target_url;',
    '  IF existing_image_url_count <> 0 THEN',
    "    RAISE EXCEPTION 'Image URL guard failed: % owner image URLs already exist', existing_image_url_count;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO existing_image_hash_count',
    '  FROM _adg_new_product_source s',
    '  JOIN product_images pi ON pi.salon_id = target_salon_id AND pi.file_hash = s.sha256;',
    '  IF existing_image_hash_count <> 0 THEN',
    "    RAISE EXCEPTION 'Image hash guard failed: % owner image hashes already exist', existing_image_hash_count;",
    '  END IF;',
    'END $$;',
    '',
    'WITH target_channel AS (',
    `  SELECT ch.salon_id FROM channels ch WHERE ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '), resolved AS (',
    '  SELECT s.*, tc.salon_id, c.id AS category_id',
    '  FROM _adg_new_product_source s',
    '  CROSS JOIN target_channel tc',
    '  JOIN categories c ON c.salon_id = tc.salon_id AND c.slug = s.category_slug AND c.is_active = true',
    '), inserted_products AS (',
    '  INSERT INTO products (',
    '    id, salon_id, category_id, name, description, product_type, image_url, images, retail_price,',
    '    slug, is_active, status, is_published, brand, country_of_origin, allergens, dietary_tags,',
    '    external_metadata, private_metadata, name_translations, created_at, updated_at',
    '  )',
    '  SELECT',
    '    r.product_id,',
    '    r.salon_id,',
    '    r.category_id,',
    '    r.pl_name,',
    '    NULL::text,',
    "    'stockable',",
    '    r.target_url,',
    '    jsonb_build_object(',
    "      'desktop', r.target_url,",
    "      'thumbnail', r.target_url,",
    "      'source', 'owner_new_product_import',",
    `      'batch', ${sqlString(options.batch)}`,
    '    ),',
    '    0,',
    '    r.slug,',
    '    true,',
    "    'draft',",
    '    false,',
    '    r.brand,',
    '    NULLIF(r.country_of_origin, \'\'),',
    '    r.allergens,',
    '    r.dietary_tags,',
    '    jsonb_build_object(',
    "      'batch', " + sqlString(options.batch) + ',',
    "      'review_id', r.review_id,",
    "      'draft_sku', r.draft_sku,",
    "      'price_pending', true,",
    "      'owner_stock_default', r.stock,",
    "      'source_image', r.source_image",
    '    ),',
    '    jsonb_build_object(',
    "      'source', 'owner_image_review',",
    "      'batch', " + sqlString(options.batch) + ',',
    "      'review_id', r.review_id,",
    "      'price_policy', 'owner_price_pending'",
    '    ),',
    "    jsonb_build_object('pl', r.pl_name, 'en', r.en_name),",
    '    now(),',
    '    now()',
    '  FROM resolved r',
    '  RETURNING id',
    '), inserted_variants AS (',
    '  INSERT INTO product_variants (',
    '    id, salon_id, template_id, sku, barcode, ean, name, display_name, product_type,',
    '    retail_price, currency, image_url, images, is_active, is_published, is_for_sale,',
    '    total_stock, total_stock_qty, external_metadata, created_at, updated_at',
    '  )',
    '  SELECT',
    '    r.variant_id,',
    '    r.salon_id,',
    '    r.product_id,',
    '    r.draft_sku,',
    '    NULLIF(r.ean, \'\'),',
    '    NULLIF(r.ean, \'\'),',
    '    r.pl_name,',
    '    r.pl_name,',
    "    'stockable',",
    '    0,',
    "    'PLN',",
    '    r.target_url,',
    "    jsonb_build_object('desktop', r.target_url, 'thumbnail', r.target_url),",
    '    true,',
    '    false,',
    '    false,',
    '    r.stock,',
    '    r.stock,',
    "    jsonb_build_object('batch', " + sqlString(options.batch) + ", 'review_id', r.review_id, 'price_pending', true),",
    '    now(),',
    '    now()',
    '  FROM resolved r',
    '  RETURNING id',
    '), inserted_images AS (',
    '  INSERT INTO product_images (',
    '    salon_id, template_id, variant_id, category, priority, is_primary,',
    '    image_large_url, image_medium_url, image_small_url, url_small, url_thumbnail, url_micro,',
    '    image_id, mime_type, file_size, width, height, alt_text, r2_keys, file_hash, r2_synced,',
    '    created_at, updated_at',
    '  )',
    '  SELECT',
    '    r.salon_id,',
    '    r.product_id,',
    '    NULL::uuid,',
    "    'LISTING'::product_image_category,",
    '    0,',
    '    true,',
    '    r.target_url,',
    '    r.target_url,',
    '    r.target_url,',
    '    r.target_url,',
    '    r.target_url,',
    '    r.target_url,',
    '    r.source_image,',
    "    'image/jpeg',",
    '    r.file_size,',
    '    r.width,',
    '    r.height,',
    '    r.pl_name,',
    '    jsonb_build_array(r.r2_key),',
    '    r.sha256,',
    '    false,',
    '    now(),',
    '    now()',
    '  FROM resolved r',
    '  RETURNING id',
    '), inserted_translations AS (',
    '  INSERT INTO product_translations (salon_id, template_id, lang_id, product_name, slug, created_at, updated_at)',
    "  SELECT r.salon_id, r.product_id, 'pl', r.pl_name, r.slug, now(), now() FROM resolved r",
    '  UNION ALL',
    "  SELECT r.salon_id, r.product_id, 'en', r.en_name, r.slug, now(), now() FROM resolved r",
    '  RETURNING id',
    ')',
    'SELECT',
    '  (SELECT COUNT(*) FROM inserted_products) AS products_inserted,',
    '  (SELECT COUNT(*) FROM inserted_variants) AS variants_inserted,',
    '  (SELECT COUNT(*) FROM inserted_images) AS images_inserted,',
    '  (SELECT COUNT(*) FROM inserted_translations) AS translations_inserted;',
    '',
    'DO $$',
    'DECLARE',
    '  product_count integer;',
    '  variant_count integer;',
    '  image_count integer;',
    '  translation_count integer;',
    'BEGIN',
    '  SELECT COUNT(*) INTO product_count',
    '  FROM _adg_new_product_source s',
    '  JOIN products p ON p.slug = s.slug AND p.private_metadata->>\'batch\' = ' + sqlString(options.batch) + ';',
    '  SELECT COUNT(*) INTO variant_count',
    '  FROM _adg_new_product_source s',
    '  JOIN product_variants pv ON pv.sku = s.draft_sku AND pv.external_metadata->>\'batch\' = ' + sqlString(options.batch) + ';',
    '  SELECT COUNT(*) INTO image_count',
    '  FROM _adg_new_product_source s',
    '  JOIN product_images pi ON pi.image_large_url = s.target_url;',
    '  SELECT COUNT(*) INTO translation_count',
    '  FROM _adg_new_product_source s',
    '  JOIN products p ON p.slug = s.slug AND p.private_metadata->>\'batch\' = ' + sqlString(options.batch),
    '  JOIN product_translations pt ON pt.template_id = p.id;',
    '',
    '  IF product_count <> ' + options.expectedRows + ' THEN',
    "    RAISE EXCEPTION 'Post-check failed: expected " + options.expectedRows + " products, got %', product_count;",
    '  END IF;',
    '  IF variant_count <> ' + options.expectedRows + ' THEN',
    "    RAISE EXCEPTION 'Post-check failed: expected " + options.expectedRows + " variants, got %', variant_count;",
    '  END IF;',
    '  IF image_count <> ' + options.expectedRows + ' THEN',
    "    RAISE EXCEPTION 'Post-check failed: expected " + options.expectedRows + " images, got %', image_count;",
    '  END IF;',
    '  IF translation_count <> ' + (options.expectedRows * 2) + ' THEN',
    "    RAISE EXCEPTION 'Post-check failed: expected " + (options.expectedRows * 2) + " translations, got %', translation_count;",
    '  END IF;',
    'END $$;',
    '',
    'COMMIT;',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(options.sql), { recursive: true });
  fs.writeFileSync(options.sql, sql);
}

function writeReport(options, summary, rows) {
  const samples = rows.slice(0, 25);
  const lines = [
    '# Asia Deli Go New Product Creation SQL Plan',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Batch: ${options.batch}`,
    `- Runtime channel guard: \`${options.channel}\``,
    `- Input manifest: \`${options.input}\``,
    `- Source products planned: ${summary.rows}`,
    `- Source images found: ${summary.sourceImagesFound}`,
    `- Rows with notes: ${summary.rowsWithNotes}`,
    `- Stock policy: temporary owner default, \`100\` per row`,
    '- Price policy: `retail_price=0`, `status=draft`, `is_published=false`, `is_for_sale=false`, metadata `price_pending=true`.',
    '- Pricing decision: deferred to the final owner/admin phase; missing real prices must not block finishing the web/catalog cleanup.',
    `- Dry-run CSV: \`${options.output}\``,
    `- SQL output: \`${options.sql}\``,
    `- Local staging directory: \`${options.stagingDir}\``,
    '',
    '## Preconditions Before Running SQL',
    '',
    '- Upload/stage each image so `target_url` returns 200.',
    '- Confirm this should target the current runtime catalog channel `kenmito` / Asia Deli Go storefront.',
    '- Confirm owner accepts draft products with price pending and not visible for sale until edited.',
    '- Do not source prices from internet listings; owner/admin will fill real store prices later.',
    '- EAN gaps stay blank until they are confirmed from product labels, owner data, or reliable product sources.',
    '',
    '## Schema Assumptions Verified',
    '',
    '- `channels.slug` resolves the target `salon_id`; all writes are scoped to that salon.',
    '- `products.category_id -> categories.id`, `product_variants.template_id -> products.id`, `product_images.template_id -> products.id`, and `product_translations.template_id -> products.id` are declared FKs.',
    '- `products.retail_price` has default `0`; `products.status` has default `draft`; this plan sets both explicitly.',
    '- `product_variants.available_stock` is a generated column, so the plan sets only `total_stock` and `total_stock_qty`.',
    '- Current build DB product catalog is under channel `kenmito`; local `asiandeligo` channel is not the 1784-product catalog.',
    '',
    '## Planned Rows',
    '',
    tableRow(['draft_sku', 'slug', 'category_slug', 'ean', 'stock', 'target_url', 'notes']),
    tableRow(['---', '---', '---', '---', '---:', '---', '---']),
    ...samples.map((row) =>
      tableRow([row.draft_sku, row.slug, row.category_slug, row.ean, row.stock, row.target_url, row.notes]),
    ),
    '',
    '## Rollback Idea',
    '',
    'If the SQL is applied and needs rollback before orders reference these products, delete by batch metadata in reverse dependency order: `product_translations`, `product_images`, `product_variants`, then `products` where batch equals this plan label.',
  ];

  fs.mkdirSync(path.dirname(options.report), { recursive: true });
  fs.writeFileSync(options.report, `${lines.join('\n')}\n`);
}

function main() {
  const options = parseArgs();
  const inputPath = path.resolve(process.cwd(), options.input);
  if (!fs.existsSync(inputPath)) throw new Error(`Input file not found: ${options.input}`);

  const manifestRows = parseCsv(fs.readFileSync(inputPath, 'utf8'));
  const requiredHeaders = [
    'review_id',
    'draft_sku',
    'source_image',
    'source_image_path',
    'proposed_media_key',
    'pl_name',
    'en_name',
    'brand',
    'size',
    'category_slug_guess',
    'ean',
    'price_pln',
    'stock',
    'dietary_tags',
    'allergens',
    'missing_required_fields',
  ];
  const missingHeaders = requiredHeaders.filter((header) => !(header in (manifestRows[0] ?? {})));
  if (missingHeaders.length > 0) throw new Error(`Input manifest missing required headers: ${missingHeaders.join(', ')}`);

  const rows = makeRows(manifestRows, options);
  const summary = {
    generatedAt: new Date().toISOString(),
    input: options.input,
    rows: rows.length,
    readyRows: rows.filter((row) => row.plan_status === 'ready_for_sql_plan').length,
    sourceImagesFound: rows.filter((row) => row.source_image_found === 'yes').length,
    rowsWithNotes: rows.filter((row) => row.notes).length,
    eanFilled: rows.filter((row) => row.ean).length,
    eanMissing: rows.filter((row) => !row.ean).map((row) => row.review_id),
    stock100: rows.filter((row) => row.stock === '100').length,
    copyStaging: options.copyStaging,
    stagingDir: options.stagingDir,
    mediaBaseUrl: options.mediaBaseUrl,
  };

  const headers = [
    'plan_status',
    'review_id',
    'draft_sku',
    'slug',
    'product_status',
    'is_published',
    'is_for_sale',
    'price_pln',
    'price_policy',
    'stock',
    'ean',
    'pl_name',
    'en_name',
    'brand',
    'size',
    'category_slug',
    'dietary_tags_json',
    'allergens_json',
    'country_of_origin',
    'source_image',
    'source_image_path',
    'source_image_found',
    'source_size_bytes',
    'sha256',
    'width',
    'height',
    'proposed_media_key',
    'staging_path',
    'target_url',
    'manifest_missing_required_fields',
    'notes',
  ];

  writeCsv(path.resolve(process.cwd(), options.output), rows, headers);
  writeJson(path.resolve(process.cwd(), options.json), { summary, rows });

  if (rows.some((row) => row.notes)) {
    writeReport(options, summary, rows);
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 2;
    return;
  }

  writeSql(options, rows);
  writeReport(options, summary, rows);

  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
