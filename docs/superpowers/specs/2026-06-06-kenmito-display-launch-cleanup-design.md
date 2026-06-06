# Kenmito Display Brand And Launch Cleanup Design

## Goal

Present the `kamito` tenant to shoppers as **Kenmito** while preserving every
technical integration key, and remove promotional claims that the current Zyra
catalog cannot support.

## Scope

- Keep the technical tenant slug, channel, file names, environment variables,
  production hostname, audit identifiers, and backend references as `kamito`.
- Change shopper-facing and admin-configured brand text from `Kamito` to
  `Kenmito`.
- Keep `https://kamito.enail.pro` as the canonical production URL.
- Disable the Kenmito Deals and Outlet surfaces until Zyra exposes real sale
  data or operations curates a genuine outlet collection.
- Prevent the generic homepage Deals section from filling itself with regular
  products when no discounted products exist.
- Keep the useful `Korean pantry` curated collection enabled.
- Do not invent owner contact details, pickup instructions, bank details,
  social links, or legal content.

## Approach

### Branding

Update the published and draft admin config plus the tracked storefront static
config:

- `branding.storeName`
- `layout.footer.copyrightText`
- `seo.defaultTitle`

Tests and fixtures that model the production tenant should use `Kenmito`.
Technical test suite names and internal IDs may continue to say `Kamito`
because they identify the backend tenant rather than visible copy.

The repository contains a 320x320 JPG with a small centered KENMITO wordmark.
It is not suitable as a header logo without cropping and asset preparation, so
this slice will not wire it into production config. A poor logo treatment is
worse than the existing text brand.

### Honest Promotions

For the Kenmito config:

- Remove the Outlet promo banner.
- Disable the `deals` homepage section.
- Remove the Outlet quick link.
- Remove the Outlet footer link.
- Remove false `Kontakt -> /privacy` and `Dostawa -> /terms` links until real
  contact and delivery pages exist.
- Disable `commercial.outlet` and clear its collection slug.
- Keep the `Korean pantry` quick link and collection.

For shared homepage behavior:

- `productsForDeals` must contain only products whose API pricing indicates a
  real discount.
- When a configured Deals section finishes loading with no sale products, do
  not render that section.

This guards all tenants against the same misleading fallback while the config
change removes the claim immediately for Kenmito.

### Owner And Operations Data

Set the known canonical URL in both admin and static config. Leave phone,
email, address, pickup instructions, and bank-transfer instructions empty
because no authoritative values exist in the project or wiki.

The targeted release audit is expected to continue failing only for missing
owner contact data. That failure remains an honest launch blocker.

## Verification

- Static config contract verifies the visible brand is Kenmito and Outlet /
  Deals are disabled.
- Homepage Playwright coverage proves non-sale products do not appear in a
  Deals section.
- Existing launch, commercial navigation, category, cart, checkout, and product
  tests remain green.
- Admin unit tests, type checks, lint, builds, config audit, and storefront
  build are run.
- Browser smoke checks local homepage, products, categories, product detail,
  cart, and checkout surfaces.

## Out Of Scope

- Renaming `kamito` infrastructure to `kenmito`.
- Backend sale filtering, stock cleanup, media de-duplication, order webhooks,
  DNS changes, or payment configuration.
- Fabricating owner information.
- New marketing artwork or a redesigned visual identity.
