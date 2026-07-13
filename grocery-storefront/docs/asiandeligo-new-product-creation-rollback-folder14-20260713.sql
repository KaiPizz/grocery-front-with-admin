-- Rollback for asiandeligo-new-products-folder14-20260713.
-- Use only before these draft products have orders or manual admin edits.
--
-- Deletes in reverse dependency order:
-- product_translations -> product_images -> product_variants -> products.

BEGIN;

WITH target_products AS (
  SELECT p.id
  FROM products p
  JOIN channels ch ON ch.salon_id = p.salon_id
  WHERE ch.slug = 'asiandeligo'
    AND ch.is_active = true
    AND p.private_metadata->>'batch' = 'asiandeligo-new-products-folder14-20260713'
),
deleted_translations AS (
  DELETE FROM product_translations pt
  USING target_products tp
  WHERE pt.template_id = tp.id
  RETURNING pt.id
),
deleted_images AS (
  DELETE FROM product_images pi
  USING target_products tp
  WHERE pi.template_id = tp.id
  RETURNING pi.id
),
deleted_variants AS (
  DELETE FROM product_variants pv
  USING target_products tp
  WHERE pv.template_id = tp.id
    AND pv.external_metadata->>'batch' = 'asiandeligo-new-products-folder14-20260713'
  RETURNING pv.id
),
deleted_products AS (
  DELETE FROM products p
  USING target_products tp
  WHERE p.id = tp.id
  RETURNING p.id
)
SELECT
  (SELECT COUNT(*) FROM deleted_translations) AS translations_deleted,
  (SELECT COUNT(*) FROM deleted_images) AS images_deleted,
  (SELECT COUNT(*) FROM deleted_variants) AS variants_deleted,
  (SELECT COUNT(*) FROM deleted_products) AS products_deleted;

COMMIT;
