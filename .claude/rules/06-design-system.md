# Design System Rules

## Color Tokens

The storefront uses 15 CSS custom properties injected by `ConfigProvider` from `StorefrontConfig.branding.colors`:

```
--color-primary          # Main brand color (buttons, links, accents)
--color-primary-hover    # Hover state for primary elements
--color-checkout-btn     # Checkout button (optional, falls back to primary)
--color-checkout-btn-hover
--color-background       # Page background
--color-foreground       # Main text color
--color-accent           # Secondary accent color
--color-accent-foreground
--color-muted            # Subdued backgrounds (cards, badges)
--color-muted-foreground # Subdued text
--color-border           # Borders and dividers
--color-card             # Card backgrounds
--color-card-foreground  # Card text
--color-destructive      # Error/delete actions
--color-ring             # Focus rings
```

## Usage in Components

Always use CSS variables via Tailwind or inline styles — never hardcode hex values:

```tsx
// Correct — uses config-driven color
<button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">

// Wrong — hardcoded color
<button className="bg-green-600 hover:bg-green-700">
```

## Banner Block Types

The storefront supports 6 banner block types (defined in `BannerBlock.type`):

1. **hero-slider** — Full-width hero carousel with slides
2. **grid-banner** — 2-4 column grid of promotional cards
3. **single-banner** — Full-width single promotional banner
4. **text-banner** — Text-only banner with background color
5. **category-slider** — Horizontal scrollable category cards
6. **product-carousel** — Scrollable product card list

## Typography

- Font comes from Tailwind config — uses system font stack by default
- Store name displayed in header uses `storeName` from branding config
- Responsive text sizing: base → sm → md → lg breakpoints

## Image Handling

- Uploaded images stored in `admin-panel/public/uploads/`
- Storefront references via `NEXT_PUBLIC_CONFIG_API_URL` + image path
- Support both desktop and mobile image variants for hero banners
- Always include `alt` text for accessibility

## Design Decisions

When making UI/UX decisions for this e-commerce grocery store, use the `/design` command to consult UI-UX Pro Max for:
- Color palette recommendations for grocery/food vertical
- Font pairing suggestions
- Layout patterns for product grids, category navigation
- Mobile-first responsive patterns
