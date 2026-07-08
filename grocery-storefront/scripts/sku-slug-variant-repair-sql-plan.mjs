#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-sku-slug-migration-dry-run-20260708.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-sku-slug-variant-repair-20260708.sql';
const DEFAULT_REPORT = 'docs/asiandeligo-sku-slug-variant-repair-20260708.md';
const DEFAULT_CHANNEL = 'asiandeligo';
const DEFAULT_EXPECTED = 1784;
const DEFAULT_BATCH = 'asiandeligo-sku-slug-variant-repair-20260708';

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/sku-slug-variant-repair-sql-plan.mjs [options]');
  console.log('');
  console.log('Generates SQL to update product_variants.sku after the product slug/code migration.');
  console.log('It does not connect to the database or mutate data.');
  console.log('');
  console.log('Options:');
  console.log(`  --input <path>       Dry-run mapping JSON (default: ${DEFAULT_INPUT})`);
  console.log(`  --output <path>      SQL output path (default: ${DEFAULT_OUTPUT})`);
  console.log(`  --report <path>      Markdown report path (default: ${DEFAULT_REPORT})`);
  console.log(`  --channel <slug>     Channel slug (default: ${DEFAULT_CHANNEL})`);
  console.log(`  --expected <number>  Expected source/match rows (default: ${DEFAULT_EXPECTED})`);
  console.log(`  --batch <value>      Migration batch label (default: ${DEFAULT_BATCH})`);
  console.log('  --help               Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    report: DEFAULT_REPORT,
    channel: DEFAULT_CHANNEL,
    expected: DEFAULT_EXPECTED,
    batch: DEFAULT_BATCH,
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
      case 'report':
        options.report = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'expected':
        options.expected = Number.parseInt(value, 10);
        if (!Number.isInteger(options.expected) || options.expected < 1) {
          printUsage(1, '--expected must be a positive integer');
        }
        break;
      case 'batch':
        options.batch = value.replace(/[^a-zA-Z0-9_.:-]/g, '-').slice(0, 80);
        if (!options.batch) printUsage(1, '--batch cannot be empty');
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }

  return options;
}

function readPayload(inputPath) {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`Input file not found: ${inputPath}`);
  const payload = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  if (!payload || !Array.isArray(payload.rows)) {
    throw new Error(`Input JSON must contain a rows array: ${inputPath}`);
  }
  return payload;
}

function sqlString(value) {
  if (value == null || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function safeIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40) || 'channel';
}

function validatePayload(payload, options) {
  const errors = [];
  const ids = new Set();
  const codes = new Set();

  if (payload.rows.length !== options.expected) {
    errors.push(`expected ${options.expected} rows, got ${payload.rows.length}`);
  }

  payload.rows.forEach((row, index) => {
    const label = `row ${index + 1}${row?.current_slug ? ` (${row.current_slug})` : ''}`;
    if (!row?.id) errors.push(`${label}: missing id`);
    if (!/^KIMCHI-\d+$/i.test(String(row?.current_slug ?? ''))) {
      errors.push(`${label}: current_slug is not KIMCHI-*`);
    }
    if (!/^[A-Z0-9]+-\d{6}$/.test(String(row?.new_code ?? ''))) {
      errors.push(`${label}: invalid new_code`);
    }
    if (ids.has(row.id)) errors.push(`${label}: duplicate id`);
    if (codes.has(row.new_code)) errors.push(`${label}: duplicate new_code`);
    ids.add(row.id);
    codes.add(row.new_code);
  });

  return errors;
}

function buildValues(rows) {
  return rows
    .map((row) => [sqlString(row.id), sqlString(row.current_slug), sqlString(row.new_code)].join(', '))
    .join('),\n  (');
}

function writeSql(options, rows) {
  const safeChannel = safeIdentifier(options.channel);
  const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const variantBackup = `${safeChannel}_sku_slug_variants_backup_${dateSuffix}`;
  const values = buildValues(rows);

  const sql = [
    '-- Generated by scripts/sku-slug-variant-repair-sql-plan.mjs',
    `-- Batch: ${options.batch}`,
    `-- Safe behavior: ${options.channel} channel only; updates product_variants.sku; backs up existing rows first.`,
    '-- JOIN contract:',
    '--   channels.slug filters one active channel; channels.salon_id scopes all products and variants.',
    '--   source.product_id (uuid text literal) = products.id (uuid) via products primary key; products.product_code must equal source.new_code from the completed product migration.',
    '--   products.private_metadata->legacy_kimchi_slug must equal source.current_slug so stale mappings fail the guard.',
    '--   product_variants.template_id (uuid) = products.id (uuid) via declared FK FK_variants_template; product_variants.salon_id = products.salon_id.',
    '--   product_variants.sku must equal source.current_slug before update; new SKU uniqueness is protected by IDX_variants_salon_sku.',
    'BEGIN;',
    '',
    'CREATE TEMP TABLE _asiandeligo_variant_sku_source (',
    '  product_id uuid PRIMARY KEY,',
    '  current_sku text NOT NULL,',
    '  new_sku text NOT NULL,',
    '  UNIQUE (new_sku)',
    ') ON COMMIT DROP;',
    '',
    'INSERT INTO _asiandeligo_variant_sku_source (product_id, current_sku, new_sku)',
    `VALUES\n  (${values});`,
    '',
    'DO $$',
    'DECLARE',
    '  source_count integer;',
    '  matched_products integer;',
    '  matched_variants integer;',
    '  new_sku_conflicts integer;',
    'BEGIN',
    '  SELECT COUNT(*) INTO source_count FROM _asiandeligo_variant_sku_source;',
    '  SELECT COUNT(*) INTO matched_products',
    '  FROM _asiandeligo_variant_sku_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.id = s.product_id AND p.salon_id = ch.salon_id AND p.deleted_at IS NULL',
    '    AND p.product_code = s.new_sku',
    "    AND p.private_metadata->>'legacy_kimchi_slug' = s.current_sku;",
    '  SELECT COUNT(*) INTO matched_variants',
    '  FROM _asiandeligo_variant_sku_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.id = s.product_id AND p.salon_id = ch.salon_id AND p.deleted_at IS NULL',
    '    AND p.product_code = s.new_sku',
    "    AND p.private_metadata->>'legacy_kimchi_slug' = s.current_sku",
    '  JOIN product_variants pv ON pv.template_id = p.id AND pv.salon_id = p.salon_id AND pv.deleted_at IS NULL AND pv.sku = s.current_sku;',
    '  SELECT COUNT(*) INTO new_sku_conflicts',
    '  FROM _asiandeligo_variant_sku_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN product_variants pv ON pv.salon_id = ch.salon_id AND pv.deleted_at IS NULL AND pv.sku = s.new_sku AND pv.template_id <> s.product_id;',
    `  IF source_count <> ${options.expected} THEN`,
    `    RAISE EXCEPTION 'source_count % does not equal expected ${options.expected}', source_count;`,
    '  END IF;',
    `  IF matched_products <> ${options.expected} THEN`,
    `    RAISE EXCEPTION 'matched_products % does not equal expected ${options.expected}', matched_products;`,
    '  END IF;',
    `  IF matched_variants <> ${options.expected} THEN`,
    `    RAISE EXCEPTION 'matched_variants % does not equal expected ${options.expected}', matched_variants;`,
    '  END IF;',
    '  IF new_sku_conflicts <> 0 THEN',
    "    RAISE EXCEPTION 'new_sku_conflicts %; aborting', new_sku_conflicts;",
    '  END IF;',
    'END $$;',
    '',
    `CREATE TABLE IF NOT EXISTS ${variantBackup} AS SELECT * FROM product_variants WHERE false;`,
    '',
    'WITH matched AS (',
    '  SELECT pv.*',
    '  FROM _asiandeligo_variant_sku_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.id = s.product_id AND p.salon_id = ch.salon_id AND p.deleted_at IS NULL',
    '    AND p.product_code = s.new_sku',
    "    AND p.private_metadata->>'legacy_kimchi_slug' = s.current_sku",
    '  JOIN product_variants pv ON pv.template_id = p.id AND pv.salon_id = p.salon_id AND pv.deleted_at IS NULL AND pv.sku = s.current_sku',
    '), backed_up_variants AS (',
    `  INSERT INTO ${variantBackup}`,
    '  SELECT m.* FROM matched m',
    `  WHERE NOT EXISTS (SELECT 1 FROM ${variantBackup} b WHERE b.id = m.id)`,
    '  RETURNING id',
    ')',
    'SELECT',
    '  (SELECT COUNT(*) FROM matched) AS matched_variants,',
    '  (SELECT COUNT(*) FROM backed_up_variants) AS backed_up_variants;',
    '',
    'WITH matched AS (',
    '  SELECT pv.id, pv.salon_id, pv.sku AS old_sku, s.new_sku',
    '  FROM _asiandeligo_variant_sku_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.id = s.product_id AND p.salon_id = ch.salon_id AND p.deleted_at IS NULL',
    '    AND p.product_code = s.new_sku',
    "    AND p.private_metadata->>'legacy_kimchi_slug' = s.current_sku",
    '  JOIN product_variants pv ON pv.template_id = p.id AND pv.salon_id = p.salon_id AND pv.deleted_at IS NULL AND pv.sku = s.current_sku',
    '), updated_variants AS (',
    '  UPDATE product_variants pv',
    '  SET',
    '    sku = m.new_sku,',
    '    external_metadata = COALESCE(pv.external_metadata, \'{}\'::jsonb) || jsonb_build_object(',
    "      'legacy_kimchi_sku', m.old_sku,",
    "      'sku_slug_migration_batch', " + sqlString(options.batch) + ',',
    "      'sku_slug_migrated_at', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')",
    '    ),',
    '    updated_at = NOW()',
    '  FROM matched m',
    '  WHERE pv.id = m.id AND pv.salon_id = m.salon_id',
    '  RETURNING pv.id',
    ')',
    'SELECT (SELECT COUNT(*) FROM updated_variants) AS updated_variants;',
    '',
    'SELECT',
    "  COUNT(*) FILTER (WHERE pv.sku ~* '^KIMCHI-[0-9]+$') AS remaining_legacy_variant_skus,",
    "  COUNT(*) FILTER (WHERE pv.sku ILIKE 'ADG-%') AS variants_with_adg_sku,",
    '  COUNT(*) AS active_variants',
    'FROM product_variants pv',
    `JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true AND ch.salon_id = pv.salon_id`,
    'WHERE pv.deleted_at IS NULL;',
    '',
    '-- Verify the printed counts. Use ROLLBACK instead of COMMIT for preview.',
    'COMMIT;',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, sql);
}

function writeReport(options, payload, errors) {
  const samples = payload.rows.slice(0, 20);
  const lines = [
    '# Asia Deli Go Variant SKU Repair SQL Plan',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Channel: ${options.channel}`,
    `Batch: ${options.batch}`,
    `Expected rows: ${options.expected}`,
    '',
    '## Validation',
    '',
    errors.length === 0 ? '- Mapping validation: OK' : '- Mapping validation: FAILED',
    `- Rows in mapping: ${payload.rows.length}`,
    '',
    '## SQL Safety',
    '',
    '- SQL creates a `product_variants` backup table before updates.',
    '- SQL aborts if source rows, migrated products, matching variants, or new SKU conflicts do not match expectations.',
    '- SQL verifies the product migration first using `products.product_code = ADG-*` and `products.private_metadata.legacy_kimchi_slug`.',
    '',
    '## First 20 Variant SKU Mappings',
    '',
    '| old sku | new sku |',
    '| --- | --- |',
    ...samples.map((row) => `| ${row.current_slug} | ${row.new_code} |`),
    '',
  ];
  if (errors.length > 0) {
    lines.push('## Errors', '', ...errors.map((error) => `- ${error}`), '');
  }
  fs.mkdirSync(path.dirname(options.report), { recursive: true });
  fs.writeFileSync(options.report, lines.join('\n'));
}

function main() {
  const options = parseArgs();
  const payload = readPayload(options.input);
  const errors = validatePayload(payload, options);
  writeReport(options, payload, errors);
  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s). Report: ${options.report}`);
    process.exit(1);
  }
  writeSql(options, payload.rows);
  console.log(`Rows planned: ${payload.rows.length}`);
  console.log(`Wrote SQL: ${options.output}`);
  console.log(`Wrote report: ${options.report}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
