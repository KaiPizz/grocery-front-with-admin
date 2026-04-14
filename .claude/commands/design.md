# /design — Design System Generation

**Framework:** UI-UX Pro Max

Generate context-aware design decisions for the grocery storefront.

## Instructions

When the user invokes `/design`, provide design recommendations using UI-UX Pro Max intelligence.

### Process

1. **Understand the context**
   - What is being designed? (new page, component update, color change, etc.)
   - What is the target audience? (grocery shoppers, admin users)
   - What device priority? (mobile-first by default)

2. **Consult design rules**
   - Reference `.claude/skills/ui-ux-pro-max/design-rules.md` for:
     - Color palettes appropriate for grocery/food vertical
     - Typography pairings
     - Layout patterns (product grid, checkout, filters)
     - UX guidelines for e-commerce

3. **Generate recommendations**
   - Provide specific, actionable design decisions
   - Map recommendations to the project's 15 CSS color tokens
   - Include Tailwind classes or CSS variable references
   - Show before/after when modifying existing designs

4. **Consider constraints**
   - Must work with existing `StorefrontConfig.branding.colors` system
   - Must be configurable via admin panel (no hardcoded styles)
   - Must be responsive (mobile → tablet → desktop)
   - Must meet WCAG 2.1 AA contrast requirements (4.5:1 minimum)

### Output Format

```
## Design Recommendation: [Feature/Component]

### Color Palette
- Primary: [hex] → `--color-primary`
- Accent: [hex] → `--color-accent`
- [other tokens as needed]

### Typography
- Heading: [font family], [weight], [size]
- Body: [font family], [weight], [size]

### Layout
- [Mobile layout description + Tailwind pattern]
- [Desktop layout description + Tailwind pattern]

### UX Considerations
- [Specific UX recommendations]

### Implementation
[Tailwind classes or component structure to use]
```

Reference: `.claude/skills/ui-ux-pro-max/design-rules.md`

$ARGUMENTS
