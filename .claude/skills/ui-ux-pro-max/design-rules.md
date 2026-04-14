# E-Commerce Design Rules — Grocery Vertical

## Color Psychology for Grocery/Food

### Recommended Palette Directions

**Fresh & Natural:**
- Primary: Deep green (#2D6A4F) or forest green (#40916C)
- Accent: Warm orange (#F4A261) or golden yellow (#E9C46A)
- Background: Off-white (#FAFAF5) or cream (#FFF8F0)
- Use greens for trust/freshness, oranges for appetite/energy

**Clean & Modern:**
- Primary: Teal (#0D9488) or slate blue (#475569)
- Accent: Coral (#F87171) or amber (#F59E0B)
- Background: Pure white (#FFFFFF) or light gray (#F8FAFC)
- Use clean tones for premium/health-focused positioning

**Warm & Inviting:**
- Primary: Terracotta (#C2410C) or burgundy (#881337)
- Accent: Sage green (#84CC16) or cream (#FDE68A)
- Background: Warm white (#FFFBEB) or light beige (#FEF3C7)
- Use warm tones for artisanal/organic positioning

### Color Token Mapping

Map these to the project's 15 CSS variables:
- `--color-primary` → Main brand identity color
- `--color-accent` → Call-to-action, highlights, badges
- `--color-background` → Page backgrounds
- `--color-foreground` → Primary text (ensure 4.5:1 contrast ratio)
- `--color-muted` → Secondary backgrounds, disabled states
- `--color-destructive` → Errors, remove-from-cart, alerts

## Typography Pairings for E-Commerce

### Recommended Google Fonts

| Heading | Body | Vibe |
|---------|------|------|
| Inter | Inter | Clean, modern, highly readable |
| Playfair Display | Source Sans 3 | Premium, editorial feel |
| DM Sans | DM Sans | Geometric, tech-forward |
| Nunito | Open Sans | Friendly, approachable |
| Montserrat | Lato | Professional, trustworthy |

### Size Scale (Mobile-First)

```
Text xs:  12px / 0.75rem  — badges, fine print
Text sm:  14px / 0.875rem — captions, metadata
Text base: 16px / 1rem    — body text, product descriptions
Text lg:  18px / 1.125rem — subheadings, prices
Text xl:  20px / 1.25rem  — section headers
Text 2xl: 24px / 1.5rem   — page titles (mobile)
Text 3xl: 30px / 1.875rem — page titles (desktop)
Text 4xl: 36px / 2.25rem  — hero headlines
```

## Layout Patterns

### Product Grid
- Mobile: 2 columns, 8px gap
- Tablet: 3 columns, 12px gap
- Desktop: 4 columns, 16px gap
- Product card: image (1:1 or 4:3), name, price, add-to-cart button

### Category Navigation
- Mobile: horizontal scroll with pill-shaped buttons
- Desktop: sidebar or mega-menu dropdown
- Show icons for major categories (fruits, vegetables, dairy, meat, etc.)

### Hero Banner
- Full-width, max-height 400px (mobile) / 500px (desktop)
- Overlay text with semi-transparent background for readability
- CTA button within thumb-reach zone on mobile

### Checkout Flow
- Single-page checkout preferred for grocery (basket → delivery → payment → confirm)
- Progress indicator at top
- Order summary always visible (sticky sidebar on desktop, collapsible on mobile)

## UX Guidelines for Grocery

1. **Quick-add** — Allow adding to cart from product grid without opening detail page
2. **Quantity controls** — +/- buttons directly on product cards
3. **Search** — Prominent search bar, autocomplete with product images
4. **Filters** — Draft-and-apply pattern on mobile (not instant-apply)
5. **Price display** — Consistent formatting, show per-unit price when relevant
6. **Stock status** — Clear in/out-of-stock indicators
7. **Delivery slots** — Show next available delivery prominently
8. **Reorder** — Easy access to previous orders for repeat purchases
9. **Recipes** — Cross-sell via recipe ingredients → add all to cart
10. **Accessibility** — Min 44px touch targets, proper ARIA labels, 4.5:1 contrast
