# Kenmito Catalog-First Homepage Design

## Goal

Turn the Kenmito homepage from a generic grocery template into a catalog-first
specialty Asian grocery entrance without inventing promotions, popularity,
fulfillment promises, or brand assets.

## Approved Direction

Direction A: a compact branded hero followed immediately by real category
discovery, a plainly labelled product shelf, and fulfillment trust cues.

## Scope

- Replace the separate legacy mobile and desktop hero treatments with one
  responsive catalog-first hero.
- Use real product thumbnails from the existing homepage query as the hero
  visual. If no product images load, retain a clean typographic fallback.
- Render category shortcuts as visual merchandising cards using real category
  background images when available and a restrained text fallback otherwise.
- Order category cards by real non-empty assortment size instead of raw API
  order. Commercial quick links remain explicitly configured and render after
  real categories.
- Rename the generic homepage product shelf so it does not claim that products
  are new, popular, or bestselling.
- Add a homepage trust strip only when the fulfillment config supports the
  corresponding statement: pickup, bank transfer, and manual confirmation.
- Disable the image-less Kenmito Korean pantry promo banner. The Korean pantry
  remains reachable through commercial navigation and category shortcuts.

## Non-Goals

- No backend or GraphQL schema changes.
- No new admin config schema.
- No fake bestseller, sale, review, delivery, or stock claims.
- No generated lifestyle photography.
- No footer contact details until the owner supplies them.
- No redesign of product cards, listing pages, header, or checkout.

## Responsive Structure

1. Existing service strip and header.
2. Compact two-column hero on desktop; stacked copy and product mosaic on mobile.
3. Visual category grid.
4. Existing honest commercial surfaces when configured.
5. Product shelf labelled as general product discovery.
6. Fulfillment trust strip.
7. Existing footer.

## Acceptance Criteria

- The first mobile flow exposes the hero CTA and category discovery without a
  full-screen decorative hero.
- Desktop and mobile use the same semantic hero content and visual system.
- Hero imagery comes only from real configured or catalog media.
- Category shortcuts expose real category links and product counts.
- The homepage does not display `New arrivals` / `Nowosci` for an unsorted
  product query.
- Pickup tenants display pickup, bank-transfer, and manual-confirmation trust
  statements derived from config.
- Delivery tenants keep their current storage-zone behavior and do not receive
  pickup-specific trust copy.
- Existing Deals behavior remains tied to real sale pricing.
- Targeted Playwright tests, static config tests, lint, typecheck, and build pass.
