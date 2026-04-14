# /ui-review — UI/UX Quality Audit

**Framework:** UI-UX Pro Max

Audit the current UI/UX against best practices for e-commerce grocery stores.

## Instructions

When the user invokes `/ui-review`, perform a comprehensive UI/UX audit:

### 1. Visual Inspection
- Start the dev server and open the target page
- Check mobile viewport (390x844) and desktop (1280x720)
- Screenshot key states for reference

### 2. Color & Contrast
- Verify all colors come from CSS variables (no hardcoded hex)
- Check text contrast ratios against WCAG 2.1 AA (4.5:1 minimum)
- Verify color tokens are used consistently (`--color-primary` for actions, `--color-destructive` for errors, etc.)

### 3. Typography
- Text hierarchy is clear (headings > subheadings > body > captions)
- Font sizes are readable on mobile (minimum 14px for body)
- Line height appropriate for readability (1.4-1.6 for body text)

### 4. Layout & Spacing
- Consistent spacing scale (Tailwind default: 4px base unit)
- Content doesn't touch viewport edges on mobile (padding present)
- Grid alignment is consistent across components

### 5. Interaction Design
- Touch targets are minimum 44x44px on mobile
- Hover states are visible on desktop
- Focus indicators present for keyboard navigation
- Loading states shown for async operations
- Error states are informative and actionable

### 6. E-Commerce Specifics
- Product images are high quality and consistent aspect ratio
- Prices are prominently displayed with consistent formatting
- Add-to-cart is easy to find and use
- Cart count/badge is visible in header
- Search is prominent and functional

### Output Format

```
## UI/UX Audit: [Page/Component]

### Score: [X/10]

### Strengths
- [What's working well]

### Issues Found
| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| [description] | High/Medium/Low | [component/line] | [specific fix] |

### Recommendations
- [Prioritized improvement suggestions]
```

Reference: `.claude/skills/ui-ux-pro-max/design-rules.md`

$ARGUMENTS
