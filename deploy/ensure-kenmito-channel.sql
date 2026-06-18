-- Idempotent Kenmito storefront channel alias.
-- Purpose: make GraphQL/storefront requests using channel='kenmito'
-- resolve to the same salon/catalog that previously used channel='kamito'.
--
-- This does not mutate products, variants, orders, stock, or customer data.
-- Current Kamito production has no per-channel child rows in:
-- channel_countries, channel_warehouses, channel_shipping_methods,
-- channel_payment_methods, tax_configurations, product_channel_listings,
-- or variant_channel_listings.

BEGIN;

WITH source_channel AS (
  SELECT *
  FROM channels
  WHERE slug = 'kamito'
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
)
INSERT INTO channels (
  salon_id,
  name,
  slug,
  channel_type,
  is_active,
  currency_code,
  default_country,
  default_language,
  prices_entered_with_tax,
  display_gross_prices,
  allocation_strategy,
  order_prefix,
  external_platform_id,
  settings,
  metadata,
  iai_shop_id,
  supported_languages,
  enabled_price_comparison_sites,
  default_tax_rate,
  is_b2b,
  is_marketplace,
  default_warehouse_id,
  fulfillment_strategy,
  checkout_expiry_hours,
  allow_guest_checkout,
  default_listing_status,
  auto_publish_products,
  default_tax_class_id,
  automatically_confirm_orders,
  allow_unpaid_orders,
  checkout_expiration_minutes,
  date_format,
  time_format,
  language_code
)
SELECT
  salon_id,
  'Kenmito',
  'kenmito',
  channel_type,
  true,
  currency_code,
  default_country,
  default_language,
  prices_entered_with_tax,
  display_gross_prices,
  allocation_strategy,
  order_prefix,
  external_platform_id,
  settings,
  jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{aliasOf}',
    to_jsonb('kamito'::text),
    true
  ),
  iai_shop_id,
  supported_languages,
  enabled_price_comparison_sites,
  default_tax_rate,
  is_b2b,
  is_marketplace,
  default_warehouse_id,
  fulfillment_strategy,
  checkout_expiry_hours,
  allow_guest_checkout,
  default_listing_status,
  auto_publish_products,
  default_tax_class_id,
  automatically_confirm_orders,
  allow_unpaid_orders,
  checkout_expiration_minutes,
  date_format,
  time_format,
  language_code
FROM source_channel
ON CONFLICT (salon_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  currency_code = EXCLUDED.currency_code,
  default_country = EXCLUDED.default_country,
  default_language = EXCLUDED.default_language,
  prices_entered_with_tax = EXCLUDED.prices_entered_with_tax,
  display_gross_prices = EXCLUDED.display_gross_prices,
  allocation_strategy = EXCLUDED.allocation_strategy,
  settings = EXCLUDED.settings,
  metadata = EXCLUDED.metadata,
  default_tax_rate = EXCLUDED.default_tax_rate,
  is_b2b = EXCLUDED.is_b2b,
  is_marketplace = EXCLUDED.is_marketplace,
  default_warehouse_id = EXCLUDED.default_warehouse_id,
  fulfillment_strategy = EXCLUDED.fulfillment_strategy,
  checkout_expiry_hours = EXCLUDED.checkout_expiry_hours,
  allow_guest_checkout = EXCLUDED.allow_guest_checkout,
  default_listing_status = EXCLUDED.default_listing_status,
  auto_publish_products = EXCLUDED.auto_publish_products,
  default_tax_class_id = EXCLUDED.default_tax_class_id,
  automatically_confirm_orders = EXCLUDED.automatically_confirm_orders,
  allow_unpaid_orders = EXCLUDED.allow_unpaid_orders,
  checkout_expiration_minutes = EXCLUDED.checkout_expiration_minutes,
  date_format = EXCLUDED.date_format,
  time_format = EXCLUDED.time_format,
  language_code = EXCLUDED.language_code,
  updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM channels WHERE slug = 'kenmito' AND is_active = true) THEN
    RAISE EXCEPTION 'kenmito channel was not created; source channel kamito missing or inactive';
  END IF;
END $$;

COMMIT;

