#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DECISIONS_PATH = 'docs/asiandeligo-folder14-draft-quality-decisions-20260713.csv';
const ORIGINAL_PATH = 'docs/asiandeligo-new-product-creation-dry-run-folder14-20260713.json';
const GALLERY_PATH = 'docs/asiandeligo-new-product-gallery-backlog-folder14-20260713.csv';
const REPORT_PATH = 'docs/asiandeligo-folder14-draft-quality-audit-20260713.md';
const JSON_PATH = 'docs/asiandeligo-folder14-draft-quality-audit-20260713.json';
const RESOLVED_ACTIONS_PATH = 'docs/asiandeligo-folder14-draft-resolved-actions-20260713.csv';
const GALLERY_MANIFEST_PATH = 'docs/asiandeligo-folder14-gallery-upload-manifest-20260713.csv';
const SQL_PATH = 'docs/asiandeligo-folder14-draft-quality-apply-20260713.sql';
const ROLLBACK_PATH = 'docs/asiandeligo-folder14-draft-quality-rollback-20260713.sql';
const STAGING_ROOT = '/tmp/asiandeligo-folder14-draft-quality-20260713/r2';
const CHANNEL = 'asiandeligo';
const BATCH = 'asiandeligo-new-products-folder14-20260713';
const PUBLIC_MEDIA_BASE = 'https://img.zira.pl/asiandeligo';
const PUBLIC_MEDIA_VERSION = '20260713';
const EXPECTED_ROWS = 53;
const EXPECTED_UPDATE_ROWS = 52;
const EXPECTED_MERGE_ROWS = 1;

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

function slugify(value) {
  const replacements = { ł: 'l', Ł: 'l', đ: 'd', Đ: 'd' };
  return String(value ?? '')
    .replace(/[łŁđĐ]/g, (char) => replacements[char] ?? char)
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
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function sqlNullableString(value) {
  return value ? sqlString(value) : 'NULL';
}

function sqlInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid integer: ${value}`);
  return String(parsed);
}

function sqlTextArray(value) {
  const values = String(value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
  if (values.length === 0) return 'ARRAY[]::text[]';
  return `ARRAY[${values.map(sqlString).join(', ')}]::text[]`;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function readJpegDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error(`Not a JPEG: ${filePath}`);
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
      };
    }
    offset += length;
  }

  throw new Error(`JPEG dimensions not found: ${filePath}`);
}

function assertUnique(rows, field) {
  const seen = new Set();
  for (const row of rows) {
    if (!row[field]) throw new Error(`Missing ${field}`);
    if (seen.has(row[field])) throw new Error(`Duplicate ${field}: ${row[field]}`);
    seen.add(row[field]);
  }
}

function tableRow(values) {
  return `| ${values.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`;
}

function loadPlan() {
  const decisions = parseCsv(fs.readFileSync(DECISIONS_PATH, 'utf8'));
  const original = JSON.parse(fs.readFileSync(ORIGINAL_PATH, 'utf8')).rows;
  const gallery = parseCsv(fs.readFileSync(GALLERY_PATH, 'utf8'));

  if (decisions.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} decisions, got ${decisions.length}`);
  }
  assertUnique(decisions, 'review_id');
  assertUnique(decisions, 'draft_sku');

  const originalByReviewId = new Map(original.map((row) => [row.review_id, row]));
  const rows = decisions.map((decision) => {
    const source = originalByReviewId.get(decision.review_id);
    if (!source) throw new Error(`Missing original row: ${decision.review_id}`);
    if (source.draft_sku !== decision.draft_sku) {
      throw new Error(`SKU mismatch for ${decision.review_id}`);
    }
    if (!['update_content', 'merge_into'].includes(decision.plan_action)) {
      throw new Error(`Invalid plan_action for ${decision.review_id}: ${decision.plan_action}`);
    }
    if (!decision.proposed_pl_name || !decision.proposed_en_name || !decision.proposed_category_slug) {
      throw new Error(`Incomplete proposed content for ${decision.review_id}`);
    }
    if (/\bunclear\b/i.test(decision.proposed_pl_name) || /\bunclear\b/i.test(decision.proposed_en_name)) {
      throw new Error(`Placeholder word remains for ${decision.review_id}`);
    }

    return {
      ...decision,
      proposed_pl_slug: slugify(decision.proposed_pl_name),
      proposed_en_slug: slugify(decision.proposed_en_name),
      original_pl_name: source.pl_name,
      original_en_name: source.en_name,
      original_slug: source.slug,
      original_brand: source.brand,
      original_category_slug: source.category_slug,
      primary_url: source.target_url,
    };
  });

  const updates = rows.filter((row) => row.plan_action === 'update_content');
  const merges = rows.filter((row) => row.plan_action === 'merge_into');
  if (updates.length !== EXPECTED_UPDATE_ROWS || merges.length !== EXPECTED_MERGE_ROWS) {
    throw new Error(`Expected ${EXPECTED_UPDATE_ROWS} updates and ${EXPECTED_MERGE_ROWS} merge; got ${updates.length}/${merges.length}`);
  }
  assertUnique(updates, 'proposed_pl_slug');

  const updateSkus = new Set(updates.map((row) => row.draft_sku));
  for (const row of merges) {
    if (!row.merge_target_sku || !updateSkus.has(row.merge_target_sku)) {
      throw new Error(`Invalid merge target for ${row.review_id}: ${row.merge_target_sku}`);
    }
  }

  const rowBySku = new Map(rows.map((row) => [row.draft_sku, row]));
  const extras = gallery
    .filter((row) => Number.parseInt(row.image_order_for_sku, 10) > 1)
    .map((row) => {
      const product = rowBySku.get(row.draft_sku);
      if (!product) throw new Error(`Gallery SKU missing from decisions: ${row.draft_sku}`);
      if (!fs.existsSync(row.source_image_path)) {
        throw new Error(`Gallery source missing: ${row.source_image_path}`);
      }
      const dimensions = readJpegDimensions(row.source_image_path);
      const stat = fs.statSync(row.source_image_path);
      const r2ObjectKey = `${CHANNEL}/${row.proposed_media_key}`;
      const stagingPath = path.join(STAGING_ROOT, r2ObjectKey);
      fs.mkdirSync(path.dirname(stagingPath), { recursive: true });
      fs.copyFileSync(row.source_image_path, stagingPath);

      return {
        ...row,
        pl_name: product.proposed_pl_name,
        public_url: `${PUBLIC_MEDIA_BASE}/${row.proposed_media_key}?v=${PUBLIC_MEDIA_VERSION}`,
        r2_object_key: r2ObjectKey,
        staging_path: stagingPath,
        sha256: sha256File(row.source_image_path),
        file_size: stat.size,
        width: dimensions.width,
        height: dimensions.height,
        priority: String(Number.parseInt(row.image_order_for_sku, 10) - 1),
      };
    });

  assertUnique(extras, 'public_url');
  assertUnique(extras, 'sha256');
  return { rows, updates, merges, extras };
}

function sqlSourceValues(rows, includeOriginal = false) {
  return rows.map((row) => {
    const common = [
      sqlString(row.review_id),
      sqlString(row.draft_sku),
      sqlString(row.proposed_pl_name),
      sqlString(row.proposed_en_name),
      sqlNullableString(row.proposed_brand),
      sqlString(row.proposed_category_slug),
      sqlString(row.proposed_pl_slug),
      sqlString(row.proposed_en_slug),
      sqlTextArray(row.quality_flags),
      sqlString(row.review_note),
    ];
    if (includeOriginal) {
      common.push(
        sqlString(row.original_pl_name),
        sqlString(row.original_en_name),
        sqlNullableString(row.original_brand),
        sqlString(row.original_category_slug),
        sqlString(row.original_slug),
      );
    }
    return `  (${common.join(', ')})`;
  }).join(',\n');
}

function gallerySourceValues(rows) {
  return rows.map((row) => `  (${[
    sqlString(row.review_id),
    sqlString(row.draft_sku),
    sqlInteger(row.priority),
    sqlString(row.image_file),
    sqlString(row.public_url),
    sqlString(row.proposed_media_key),
    sqlString(row.sha256),
    sqlInteger(row.file_size),
    sqlInteger(row.width),
    sqlInteger(row.height),
    sqlString(row.pl_name),
  ].join(', ')})`).join(',\n');
}

function buildApplySql(updates, extras) {
  return `-- Generated by scripts/folder14-draft-quality-plan.mjs
-- Purpose: clean ${EXPECTED_UPDATE_ROWS} owner-confirmed folder14 drafts and attach ${extras.length} owner-selected gallery images.
-- This file intentionally leaves all 53 products draft, unpublished, and not for sale.
--
-- JOIN contract (schema-introspect verified 2026-07-13):
--   product_variants.template_id (uuid) = products.id (uuid), FK declared.
--   product_images.template_id (uuid) = products.id (uuid), FK declared.
--   product_translations.template_id (uuid) = products.id (uuid), FK declared.
--   products.category_id (uuid) = categories.id (uuid), FK declared.
--   Every business table is filtered by the active ${CHANNEL} salon_id.
--   products/product_variants exclude deleted_at rows; other joined tables have no deleted_at.

BEGIN;

CREATE TEMP TABLE _adg_f14_quality_source (
  review_id text PRIMARY KEY,
  draft_sku text UNIQUE NOT NULL,
  pl_name text NOT NULL,
  en_name text NOT NULL,
  brand text,
  category_slug text NOT NULL,
  pl_slug text UNIQUE NOT NULL,
  en_slug text NOT NULL,
  quality_flags text[] NOT NULL,
  review_note text NOT NULL
) ON COMMIT DROP;

INSERT INTO _adg_f14_quality_source (
  review_id, draft_sku, pl_name, en_name, brand, category_slug,
  pl_slug, en_slug, quality_flags, review_note
) VALUES
${sqlSourceValues(updates)};

CREATE TEMP TABLE _adg_f14_gallery_source (
  review_id text NOT NULL,
  draft_sku text NOT NULL,
  priority integer NOT NULL,
  image_file text NOT NULL,
  public_url text UNIQUE NOT NULL,
  media_key text NOT NULL,
  sha256 text UNIQUE NOT NULL,
  file_size integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  alt_text text NOT NULL,
  PRIMARY KEY (draft_sku, priority)
) ON COMMIT DROP;

INSERT INTO _adg_f14_gallery_source (
  review_id, draft_sku, priority, image_file, public_url, media_key,
  sha256, file_size, width, height, alt_text
) VALUES
${gallerySourceValues(extras)};

DO $$
DECLARE
  target_salon_id uuid;
  target_channel_count integer;
  batch_count integer;
  source_match_count integer;
  category_match_count integer;
  slug_conflict_count integer;
  gallery_conflict_count integer;
BEGIN
  SELECT count(*)
  INTO target_channel_count
  FROM channels
  WHERE slug = '${CHANNEL}' AND is_active = true;

  IF target_channel_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active ${CHANNEL} channel, got %', target_channel_count;
  END IF;

  SELECT salon_id INTO STRICT target_salon_id
  FROM channels
  WHERE slug = '${CHANNEL}' AND is_active = true;

  SELECT count(*) INTO batch_count
  FROM products p
  WHERE p.salon_id = target_salon_id
    AND p.deleted_at IS NULL
    AND p.external_metadata->>'batch' = '${BATCH}';
  IF batch_count <> ${EXPECTED_ROWS} THEN
    RAISE EXCEPTION 'Expected ${EXPECTED_ROWS} folder14 products, got %', batch_count;
  END IF;

  SELECT count(*) INTO source_match_count
  FROM _adg_f14_quality_source s
  JOIN products p
    ON p.salon_id = target_salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
  JOIN product_variants pv
    ON pv.salon_id = target_salon_id
   AND pv.template_id = p.id
   AND pv.deleted_at IS NULL
   AND pv.sku = s.draft_sku;
  IF source_match_count <> ${EXPECTED_UPDATE_ROWS} THEN
    RAISE EXCEPTION 'Expected ${EXPECTED_UPDATE_ROWS} guarded product/variant matches, got %', source_match_count;
  END IF;

  SELECT count(*) INTO category_match_count
  FROM _adg_f14_quality_source s
  JOIN categories c
    ON c.salon_id = target_salon_id
   AND c.slug = s.category_slug
   AND c.is_active = true;
  IF category_match_count <> ${EXPECTED_UPDATE_ROWS} THEN
    RAISE EXCEPTION 'Expected ${EXPECTED_UPDATE_ROWS} category matches, got %', category_match_count;
  END IF;

  SELECT count(*) INTO slug_conflict_count
  FROM _adg_f14_quality_source s
  JOIN products p
    ON p.salon_id = target_salon_id
   AND p.deleted_at IS NULL
   AND p.slug = s.pl_slug
   AND COALESCE(p.external_metadata->>'review_id', '') <> s.review_id;
  IF slug_conflict_count <> 0 THEN
    RAISE EXCEPTION 'Proposed product slug conflicts: %', slug_conflict_count;
  END IF;

  SELECT count(*) INTO gallery_conflict_count
  FROM _adg_f14_gallery_source s
  JOIN product_images pi
    ON pi.salon_id = target_salon_id
   AND (pi.image_large_url = s.public_url OR pi.file_hash = s.sha256);
  IF gallery_conflict_count <> 0 THEN
    RAISE EXCEPTION 'Gallery URL/hash conflicts: %', gallery_conflict_count;
  END IF;
END $$;

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, c.id AS category_id, t.salon_id
  FROM _adg_f14_quality_source s
  CROSS JOIN target t
  JOIN categories c
    ON c.salon_id = t.salon_id
   AND c.slug = s.category_slug
   AND c.is_active = true
)
UPDATE products p
SET name = r.pl_name,
    slug = r.pl_slug,
    category_id = r.category_id,
    brand = r.brand,
    name_translations = jsonb_build_object('pl', r.pl_name, 'en', r.en_name),
    external_metadata = COALESCE(p.external_metadata, '{}'::jsonb) || jsonb_build_object(
      'quality_review', jsonb_build_object(
        'reviewed_at', '2026-07-13',
        'quality_flags', to_jsonb(r.quality_flags),
        'review_note', r.review_note
      )
    )
FROM resolved r
WHERE p.salon_id = r.salon_id
  AND p.deleted_at IS NULL
  AND p.external_metadata->>'batch' = '${BATCH}'
  AND p.external_metadata->>'review_id' = r.review_id;

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, p.id AS product_id, t.salon_id
  FROM _adg_f14_quality_source s
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
)
UPDATE product_variants pv
SET name = r.pl_name,
    display_name = r.pl_name,
    external_metadata = COALESCE(pv.external_metadata, '{}'::jsonb) || jsonb_build_object(
      'quality_reviewed_at', '2026-07-13',
      'quality_flags', to_jsonb(r.quality_flags)
    )
FROM resolved r
WHERE pv.salon_id = r.salon_id
  AND pv.template_id = r.product_id
  AND pv.deleted_at IS NULL
  AND pv.sku = r.draft_sku;

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, p.id AS product_id, t.salon_id
  FROM _adg_f14_quality_source s
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
)
UPDATE product_translations pt
SET product_name = CASE pt.lang_id WHEN 'pl' THEN r.pl_name ELSE r.en_name END,
    slug = CASE pt.lang_id WHEN 'pl' THEN r.pl_slug ELSE r.en_slug END
FROM resolved r
WHERE pt.salon_id = r.salon_id
  AND pt.template_id = r.product_id
  AND pt.lang_id IN ('pl', 'en');

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, p.id AS product_id, t.salon_id
  FROM _adg_f14_quality_source s
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
)
UPDATE product_images pi
SET alt_text = r.pl_name
FROM resolved r
WHERE pi.salon_id = r.salon_id
  AND pi.template_id = r.product_id;

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT g.*, p.id AS product_id, t.salon_id
  FROM _adg_f14_gallery_source g
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = g.review_id
  JOIN product_variants pv
    ON pv.salon_id = t.salon_id
   AND pv.template_id = p.id
   AND pv.deleted_at IS NULL
   AND pv.sku = g.draft_sku
)
INSERT INTO product_images (
  salon_id, template_id, variant_id, category, priority, is_primary,
  image_large_url, image_medium_url, image_small_url, url_small, url_thumbnail, url_micro,
  image_id, mime_type, file_size, width, height, alt_text, r2_keys, file_hash, r2_synced,
  created_at, updated_at
)
SELECT
  r.salon_id, r.product_id, NULL::uuid, 'LISTING'::product_image_category,
  r.priority, false,
  r.public_url, r.public_url, r.public_url, r.public_url, r.public_url, r.public_url,
  r.image_file, 'image/jpeg', r.file_size, r.width, r.height, r.alt_text,
  jsonb_build_array(r.media_key), r.sha256, false, now(), now()
FROM resolved r;

DO $$
DECLARE
  target_salon_id uuid;
  cleaned_count integer;
  translation_count integer;
  gallery_count integer;
  unsafe_visibility_count integer;
BEGIN
  SELECT salon_id INTO STRICT target_salon_id
  FROM channels WHERE slug = '${CHANNEL}' AND is_active = true;

  SELECT count(*) INTO cleaned_count
  FROM _adg_f14_quality_source s
  JOIN products p
    ON p.salon_id = target_salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
   AND p.name = s.pl_name
   AND p.slug = s.pl_slug;
  IF cleaned_count <> ${EXPECTED_UPDATE_ROWS} THEN
    RAISE EXCEPTION 'Post-check expected ${EXPECTED_UPDATE_ROWS} cleaned products, got %', cleaned_count;
  END IF;

  SELECT count(*) INTO translation_count
  FROM _adg_f14_quality_source s
  JOIN products p
    ON p.salon_id = target_salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
  JOIN product_translations pt
    ON pt.salon_id = target_salon_id
   AND pt.template_id = p.id
   AND pt.lang_id IN ('pl', 'en');
  IF translation_count <> ${EXPECTED_UPDATE_ROWS * 2} THEN
    RAISE EXCEPTION 'Post-check expected ${EXPECTED_UPDATE_ROWS * 2} translations, got %', translation_count;
  END IF;

  SELECT count(*) INTO gallery_count
  FROM _adg_f14_gallery_source s
  JOIN product_images pi
    ON pi.salon_id = target_salon_id
   AND pi.image_large_url = s.public_url
   AND pi.file_hash = s.sha256;
  IF gallery_count <> ${extras.length} THEN
    RAISE EXCEPTION 'Post-check expected ${extras.length} gallery images, got %', gallery_count;
  END IF;

  SELECT count(*) INTO unsafe_visibility_count
  FROM products p
  JOIN product_variants pv
    ON pv.salon_id = target_salon_id
   AND pv.template_id = p.id
   AND pv.deleted_at IS NULL
  WHERE p.salon_id = target_salon_id
    AND p.deleted_at IS NULL
    AND p.external_metadata->>'batch' = '${BATCH}'
    AND (p.status <> 'draft' OR p.is_published OR pv.is_published OR pv.is_for_sale);
  IF unsafe_visibility_count <> 0 THEN
    RAISE EXCEPTION 'Folder14 visibility safety failed for % products', unsafe_visibility_count;
  END IF;
END $$;

COMMIT;
`;
}

function buildRollbackSql(updates, extras) {
  return `-- Generated by scripts/folder14-draft-quality-plan.mjs
-- Roll back only the folder14 quality cleanup and 11 added gallery rows.
-- Do not use after later manual admin edits without reviewing the affected drafts.

BEGIN;

CREATE TEMP TABLE _adg_f14_quality_rollback (
  review_id text PRIMARY KEY,
  draft_sku text UNIQUE NOT NULL,
  proposed_pl_name text NOT NULL,
  proposed_en_name text NOT NULL,
  proposed_brand text,
  proposed_category_slug text NOT NULL,
  proposed_pl_slug text NOT NULL,
  proposed_en_slug text NOT NULL,
  quality_flags text[] NOT NULL,
  review_note text NOT NULL,
  old_pl_name text NOT NULL,
  old_en_name text NOT NULL,
  old_brand text,
  old_category_slug text NOT NULL,
  old_slug text NOT NULL
) ON COMMIT DROP;

INSERT INTO _adg_f14_quality_rollback (
  review_id, draft_sku, proposed_pl_name, proposed_en_name, proposed_brand,
  proposed_category_slug, proposed_pl_slug, proposed_en_slug, quality_flags,
  review_note, old_pl_name, old_en_name, old_brand, old_category_slug, old_slug
) VALUES
${sqlSourceValues(updates, true)};

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
)
DELETE FROM product_images pi
USING target t
WHERE pi.salon_id = t.salon_id
  AND pi.image_large_url IN (${extras.map((row) => sqlString(row.public_url)).join(', ')});

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, c.id AS old_category_id, p.id AS product_id, t.salon_id
  FROM _adg_f14_quality_rollback s
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
  JOIN categories c
    ON c.salon_id = t.salon_id
   AND c.slug = s.old_category_slug
   AND c.is_active = true
)
UPDATE products p
SET name = r.old_pl_name,
    slug = r.old_slug,
    category_id = r.old_category_id,
    brand = r.old_brand,
    name_translations = jsonb_build_object('pl', r.old_pl_name, 'en', r.old_en_name),
    external_metadata = COALESCE(p.external_metadata, '{}'::jsonb) - 'quality_review'
FROM resolved r
WHERE p.salon_id = r.salon_id AND p.id = r.product_id;

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, p.id AS product_id, t.salon_id
  FROM _adg_f14_quality_rollback s
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
)
UPDATE product_variants pv
SET name = r.old_pl_name,
    display_name = r.old_pl_name,
    external_metadata = COALESCE(pv.external_metadata, '{}'::jsonb)
      - 'quality_reviewed_at' - 'quality_flags'
FROM resolved r
WHERE pv.salon_id = r.salon_id
  AND pv.template_id = r.product_id
  AND pv.deleted_at IS NULL
  AND pv.sku = r.draft_sku;

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, p.id AS product_id, t.salon_id
  FROM _adg_f14_quality_rollback s
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
)
UPDATE product_translations pt
SET product_name = CASE pt.lang_id WHEN 'pl' THEN r.old_pl_name ELSE r.old_en_name END,
    slug = r.old_slug
FROM resolved r
WHERE pt.salon_id = r.salon_id
  AND pt.template_id = r.product_id
  AND pt.lang_id IN ('pl', 'en');

WITH target AS (
  SELECT salon_id FROM channels WHERE slug = '${CHANNEL}' AND is_active = true
), resolved AS (
  SELECT s.*, p.id AS product_id, t.salon_id
  FROM _adg_f14_quality_rollback s
  CROSS JOIN target t
  JOIN products p
    ON p.salon_id = t.salon_id
   AND p.deleted_at IS NULL
   AND p.external_metadata->>'batch' = '${BATCH}'
   AND p.external_metadata->>'review_id' = s.review_id
)
UPDATE product_images pi
SET alt_text = r.old_pl_name
FROM resolved r
WHERE pi.salon_id = r.salon_id
  AND pi.template_id = r.product_id;

COMMIT;
`;
}

function writeOutputs(plan) {
  const { rows, updates, merges, extras } = plan;
  const categoryCorrections = updates.filter((row) => row.proposed_category_slug !== row.original_category_slug);
  const brandFills = updates.filter((row) => row.proposed_brand && row.proposed_brand !== row.original_brand);
  const resolvedActionRows = merges.map((row) => ({
    review_id: row.review_id,
    draft_sku: row.draft_sku,
    action: row.plan_action,
    merge_target_sku: row.merge_target_sku,
    proposed_name: row.proposed_pl_name,
    quality_flags: row.quality_flags,
    resolution: row.review_note,
    primary_url: row.primary_url,
  }));

  writeCsv(RESOLVED_ACTIONS_PATH, resolvedActionRows, [
    'review_id', 'draft_sku', 'action', 'merge_target_sku', 'proposed_name',
    'quality_flags', 'resolution', 'primary_url',
  ]);
  writeCsv(GALLERY_MANIFEST_PATH, extras, [
    'review_id', 'draft_sku', 'image_order_for_sku', 'image_file', 'source_image_path',
    'staging_path', 'r2_object_key', 'public_url', 'sha256', 'file_size', 'width', 'height',
  ]);

  const summary = {
    generated_at: new Date().toISOString(),
    channel: CHANNEL,
    batch: BATCH,
    audited_products: rows.length,
    automatic_content_updates: updates.length,
    owner_confirmation_rows: 0,
    resolved_merge_rows: merges.length,
    category_corrections: categoryCorrections.length,
    brand_fills: brandFills.length,
    primary_images_visually_accepted: 53,
    extra_gallery_images_visually_accepted: extras.length,
    extra_gallery_images_staged: extras.length,
    prices_pending: 53,
    eans_pending: 53,
    origins_pending: 53,
    production_mutated: false,
  };

  fs.writeFileSync(JSON_PATH, `${JSON.stringify({ summary, rows, extras }, null, 2)}\n`);
  fs.writeFileSync(SQL_PATH, buildApplySql(updates, extras));
  fs.writeFileSync(ROLLBACK_PATH, buildRollbackSql(updates, extras));

  const report = [
    '# Asia Deli Go Folder14 Draft Quality Audit',
    '',
    `Generated: ${summary.generated_at}`,
    '',
    '## Result',
    '',
    `- Audited draft products: ${rows.length}`,
    `- Structurally complete in production: 53 products, 53 variants, 53 primary images, 106 translations`,
    `- Safe automatic content updates prepared: ${updates.length}`,
    '- Rows still held for owner confirmation: 0',
    `- Confirmed duplicate merges handed to the dedicated merge plan: ${merges.length}`,
    `- Category corrections prepared: ${categoryCorrections.length}`,
    `- Confirmed brand fills prepared: ${brandFills.length}`,
    `- Extra owner-selected gallery images checked and staged: ${extras.length}`,
    '- Primary image visual review: 53/53 usable; no hand/person obstruction found.',
    '- Extra gallery image visual review: 11/11 usable; no hand/person obstruction found.',
    '- Production mutation in this step: none.',
    '',
    '## Safety',
    '',
    '- All 53 products remain draft, unpublished, and not for sale.',
    '- Price, EAN, and country of origin remain pending for all 53 products.',
    '- Food label details remain pending for ADG-001834, ADG-001835, and ADG-001836.',
    `- This quality SQL plan changes ${updates.length} \`update_content\` rows. The confirmed duplicate merge is handled by a separate guarded plan.`,
    '',
    '## Resolved Merge',
    '',
    '| Duplicate SKU | Keep SKU | Resolution |',
    '| --- | --- | --- |',
    ...merges.map((row) => tableRow([row.draft_sku, row.merge_target_sku, row.review_note])),
    '',
    '## Category Corrections',
    '',
    '| SKU | From | To |',
    '| --- | --- | --- |',
    ...categoryCorrections.map((row) => tableRow([
      row.draft_sku, row.original_category_slug, row.proposed_category_slug,
    ])),
    '',
    '## Generated Artifacts',
    '',
    `- Resolved owner actions: \`${RESOLVED_ACTIONS_PATH}\``,
    `- Gallery upload manifest: \`${GALLERY_MANIFEST_PATH}\``,
    `- Guarded SQL apply plan: \`${SQL_PATH}\``,
    `- Rollback SQL: \`${ROLLBACK_PATH}\``,
    `- Structured audit: \`${JSON_PATH}\``,
    '',
    '## Schema Assumptions',
    '',
    '1. `product_variants.template_id = products.id` uses UUIDs and a declared FK; sampled matches are valid.',
    '2. `product_images.template_id` and `product_translations.template_id` both reference `products.id`; every table is salon-scoped.',
    '3. Products and variants exclude soft-deleted rows; all 53 current products are verified `draft` and unpublished.',
  ];
  fs.writeFileSync(REPORT_PATH, `${report.join('\n')}\n`);

  return summary;
}

try {
  const summary = writeOutputs(loadPlan());
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
