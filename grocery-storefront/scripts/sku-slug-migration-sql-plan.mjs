#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-sku-slug-migration-dry-run-20260708.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-sku-slug-migration-apply-20260708.sql';
const DEFAULT_REPORT = 'docs/asiandeligo-sku-slug-migration-apply-20260708.md';
const DEFAULT_CHANNEL = 'asiandeligo';
const DEFAULT_EXPECTED = 1784;
const DEFAULT_BATCH = 'asiandeligo-sku-slug-20260708';

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/sku-slug-migration-sql-plan.mjs [options]');
  console.log('');
  console.log('Generates reviewed SQL to update Asia Deli Go product codes and SEO slugs.');
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

function validatePayload(payload, options) {
  const errors = [];
  const codeSet = new Set();
  const slugSet = new Set();
  const idSet = new Set();

  if (payload.rows.length !== options.expected) {
    errors.push(`expected ${options.expected} rows, got ${payload.rows.length}`);
  }

  payload.rows.forEach((row, index) => {
    const label = `row ${index + 1}${row?.current_slug ? ` (${row.current_slug})` : ''}`;
    if (!row || typeof row !== 'object') errors.push(`${label}: invalid row`);
    if (!row.id || typeof row.id !== 'string') errors.push(`${label}: missing id`);
    if (!/^KIMCHI-\d+$/i.test(String(row.current_slug ?? ''))) {
      errors.push(`${label}: current_slug is not KIMCHI-*`);
    }
    if (!/^[A-Z0-9]+-\d{6}$/.test(String(row.new_code ?? ''))) {
      errors.push(`${label}: invalid new_code`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(row.new_slug ?? ''))) {
      errors.push(`${label}: invalid new_slug`);
    }
    if (idSet.has(row.id)) errors.push(`${label}: duplicate id in mapping`);
    if (codeSet.has(row.new_code)) errors.push(`${label}: duplicate new_code in mapping`);
    if (slugSet.has(row.new_slug)) errors.push(`${label}: duplicate new_slug in mapping`);
    idSet.add(row.id);
    codeSet.add(row.new_code);
    slugSet.add(row.new_slug);
  });

  return errors;
}

function buildValues(rows) {
  return rows
    .map((row) =>
      [
        sqlString(row.id),
        sqlString(row.current_slug),
        sqlString(row.new_code),
        sqlString(row.new_slug),
      ].join(', '),
    )
    .join('),\n  (');
}

function safeIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40) || 'channel';
}

function writeSql(options, rows) {
  const safeChannel = safeIdentifier(options.channel);
  const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const productBackup = `${safeChannel}_sku_slug_products_backup_${dateSuffix}`;
  const translationBackup = `${safeChannel}_sku_slug_translations_backup_${dateSuffix}`;
  const values = buildValues(rows);

  const sql = [
    '-- Generated by scripts/sku-slug-migration-sql-plan.mjs',
    `-- Batch: ${options.batch}`,
    `-- Safe behavior: ${options.channel} channel only; updates product slugs/codes and translation slugs; backs up existing rows first.`,
    '-- JOIN contract:',
    '--   channels.slug filters one active channel; channels.salon_id scopes all product rows.',
    '--   source.product_id (uuid text literal) = products.id (uuid) via products primary key; products.salon_id = channels.salon_id; products.deleted_at IS NULL.',
    '--   source.current_slug must equal products.slug so stale mappings fail the guard before update.',
    '--   product_translations.template_id (uuid) = products.id (uuid) via declared FK product_translations_template_id_fkey; product_translations.salon_id = products.salon_id.',
    '--   Backup tables are session-specific copies; no backup/legacy table is joined for matching.',
    'BEGIN;',
    '',
    'CREATE TEMP TABLE _asiandeligo_sku_slug_source (',
    '  product_id uuid PRIMARY KEY,',
    '  current_slug text NOT NULL,',
    '  new_code text NOT NULL,',
    '  new_slug text NOT NULL,',
    '  UNIQUE (new_code),',
    '  UNIQUE (new_slug)',
    ') ON COMMIT DROP;',
    '',
    'INSERT INTO _asiandeligo_sku_slug_source (product_id, current_slug, new_code, new_slug)',
    `VALUES\n  (${values});`,
    '',
    'DO $$',
    'DECLARE',
    '  source_count integer;',
    '  matched_count integer;',
    '  new_slug_conflicts integer;',
    '  non_kimchi_current integer;',
    'BEGIN',
    '  SELECT COUNT(*) INTO source_count FROM _asiandeligo_sku_slug_source;',
    '  SELECT COUNT(*) INTO matched_count',
    '  FROM _asiandeligo_sku_slug_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.id = s.product_id AND p.salon_id = ch.salon_id AND p.deleted_at IS NULL AND p.slug = s.current_slug;',
    '  SELECT COUNT(*) INTO new_slug_conflicts',
    '  FROM _asiandeligo_sku_slug_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.salon_id = ch.salon_id AND p.deleted_at IS NULL AND p.slug = s.new_slug AND p.id <> s.product_id;',
    "  SELECT COUNT(*) INTO non_kimchi_current FROM _asiandeligo_sku_slug_source WHERE current_slug !~* '^KIMCHI-[0-9]+$';",
    `  IF source_count <> ${options.expected} THEN`,
    `    RAISE EXCEPTION 'source_count % does not equal expected ${options.expected}', source_count;`,
    '  END IF;',
    `  IF matched_count <> ${options.expected} THEN`,
    `    RAISE EXCEPTION 'matched_count % does not equal expected ${options.expected}', matched_count;`,
    '  END IF;',
    '  IF new_slug_conflicts <> 0 THEN',
    "    RAISE EXCEPTION 'new_slug_conflicts %; aborting', new_slug_conflicts;",
    '  END IF;',
    '  IF non_kimchi_current <> 0 THEN',
    "    RAISE EXCEPTION 'non_kimchi_current %; aborting', non_kimchi_current;",
    '  END IF;',
    'END $$;',
    '',
    `CREATE TABLE IF NOT EXISTS ${productBackup} (LIKE products INCLUDING ALL);`,
    `CREATE TABLE IF NOT EXISTS ${translationBackup} (LIKE product_translations INCLUDING ALL);`,
    '',
    'WITH matched AS (',
    '  SELECT p.*',
    '  FROM _asiandeligo_sku_slug_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.id = s.product_id AND p.salon_id = ch.salon_id AND p.deleted_at IS NULL AND p.slug = s.current_slug',
    '), backed_up_products AS (',
    `  INSERT INTO ${productBackup}`,
    '  SELECT m.* FROM matched m',
    `  WHERE NOT EXISTS (SELECT 1 FROM ${productBackup} b WHERE b.id = m.id)`,
    '  RETURNING id',
    '), matched_translations AS (',
    '  SELECT pt.*',
    '  FROM product_translations pt',
    '  JOIN matched m ON m.id = pt.template_id AND m.salon_id = pt.salon_id',
    '), backed_up_translations AS (',
    `  INSERT INTO ${translationBackup}`,
    '  SELECT mt.* FROM matched_translations mt',
    `  WHERE NOT EXISTS (SELECT 1 FROM ${translationBackup} b WHERE b.id = mt.id)`,
    '  RETURNING id',
    ')',
    'SELECT',
    '  (SELECT COUNT(*) FROM matched) AS matched_products,',
    '  (SELECT COUNT(*) FROM backed_up_products) AS backed_up_products,',
    '  (SELECT COUNT(*) FROM matched_translations) AS matched_translations,',
    '  (SELECT COUNT(*) FROM backed_up_translations) AS backed_up_translations;',
    '',
    'WITH matched AS (',
    '  SELECT p.id, p.salon_id, p.slug AS old_slug, p.product_code AS old_product_code, p.product_code_base AS old_product_code_base, s.new_code, s.new_slug',
    '  FROM _asiandeligo_sku_slug_source s',
    `  JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true`,
    '  JOIN products p ON p.id = s.product_id AND p.salon_id = ch.salon_id AND p.deleted_at IS NULL AND p.slug = s.current_slug',
    '), updated_products AS (',
    '  UPDATE products p',
    '  SET',
    '    slug = m.new_slug,',
    '    product_code = m.new_code,',
    '    product_code_base = m.new_code,',
    '    private_metadata = COALESCE(p.private_metadata, \'{}\'::jsonb) || jsonb_build_object(',
    "      'legacy_kimchi_slug', m.old_slug,",
    "      'legacy_product_code', m.old_product_code,",
    "      'legacy_product_code_base', m.old_product_code_base,",
    "      'sku_slug_migration_batch', " + sqlString(options.batch) + ',',
    "      'sku_slug_migrated_at', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')",
    '    ),',
    '    updated_at = NOW()',
    '  FROM matched m',
    '  WHERE p.id = m.id AND p.salon_id = m.salon_id',
    '  RETURNING p.id',
    '), updated_translations AS (',
    '  UPDATE product_translations pt',
    '  SET',
    '    slug = m.new_slug,',
    '    canonical_url = NULL,',
    '    updated_at = NOW()',
    '  FROM matched m',
    '  WHERE pt.template_id = m.id AND pt.salon_id = m.salon_id',
    '  RETURNING pt.id',
    ')',
    'SELECT',
    '  (SELECT COUNT(*) FROM updated_products) AS updated_products,',
    '  (SELECT COUNT(*) FROM updated_translations) AS updated_translations;',
    '',
    'SELECT',
    "  COUNT(*) FILTER (WHERE p.slug ~* '^KIMCHI-[0-9]+$') AS remaining_legacy_kimchi_slugs,",
    "  COUNT(*) FILTER (WHERE p.product_code ILIKE 'ADG-%') AS products_with_adg_code,",
    '  COUNT(*) AS active_products',
    'FROM products p',
    `JOIN channels ch ON ch.slug = ${sqlString(options.channel)} AND ch.is_active = true AND ch.salon_id = p.salon_id`,
    'WHERE p.deleted_at IS NULL;',
    '',
    '-- Verify the printed counts. Use ROLLBACK instead of COMMIT for preview.',
    'COMMIT;',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, sql);
}

function writeReport(options, payload, errors) {
  const rows = payload.rows;
  const samples = rows.slice(0, 20);
  const lines = [
    '# Asia Deli Go SKU / Slug Migration SQL Plan',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Channel: ${options.channel}`,
    `Batch: ${options.batch}`,
    `Expected rows: ${options.expected}`,
    '',
    '## Validation',
    '',
    errors.length === 0 ? '- Mapping validation: OK' : '- Mapping validation: FAILED',
    `- Rows in mapping: ${rows.length}`,
    `- Duplicate new codes in source: ${payload.summary?.duplicateNewCodes ?? 'unknown'}`,
    `- Duplicate new slugs in source: ${payload.summary?.duplicateNewSlugs ?? 'unknown'}`,
    '',
    '## SQL Safety',
    '',
    '- SQL creates backup tables before updates.',
    '- SQL aborts if source rows, matched product rows, new slug conflicts, or non-Kimchi current slugs do not match expectations.',
    '- SQL scopes updates through active `channels.slug = asiandeligo` and product `salon_id`.',
    '- Preview by replacing final `COMMIT;` with `ROLLBACK;`.',
    '',
    '## First 20 Mappings',
    '',
    '| current slug | new code | new slug |',
    '| --- | --- | --- |',
    ...samples.map((row) => `| ${row.current_slug} | ${row.new_code} | ${row.new_slug} |`),
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
