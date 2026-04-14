# /qa — Browser Automation QA

**Framework:** gstack

Run comprehensive browser-based QA testing using Playwright.

## Instructions

When the user invokes `/qa`, perform browser-based quality assurance:

### 1. Smoke Tests
Run quick checks on core pages:

```bash
cd grocery-storefront && npx playwright test
```

Verify these pages load without errors:
- `/` — Homepage (hero banner, sections)
- `/products` — Product listing (grid, filters)
- `/cart` — Shopping cart
- `/login` — Authentication

### 2. Feature-Specific QA

If testing a specific feature:
- Navigate to the affected page
- Test the golden path (happy case)
- Test edge cases (empty state, error state, boundary values)
- Test on mobile viewport (390x844) AND desktop (1280x720)

### 3. Visual Regression

Check for visual regressions:
- Compare against existing screenshots if available
- Verify CSS variables render correctly (colors, spacing)
- Check responsive breakpoints (mobile → tablet → desktop)

### 4. Accessibility Quick Check

- Tab through interactive elements — focus visible?
- Screen reader: are form labels present?
- Color contrast: text readable on all backgrounds?
- Touch targets: minimum 44x44px on mobile?

### 5. Cross-App Testing

If the change involves admin → storefront config flow:
1. Start admin panel: `cd admin-panel && npm run dev`
2. Make a config change in admin
3. Save draft → Publish
4. Verify storefront reflects the change (after cache TTL or hard refresh)

### QA Report Format

```
## QA Report: [Feature/Change]

### Environment
- Viewports tested: [list]
- Apps tested: [admin/storefront/both]

### Results
| Test | Status | Notes |
|------|--------|-------|
| Smoke test — homepage | PASS/FAIL | |
| Feature — [specific] | PASS/FAIL | |
| Mobile — [specific] | PASS/FAIL | |
| Accessibility | PASS/FAIL | |

### Issues Found
[List any issues with severity and reproduction steps]

### Verdict: [PASS / FAIL]
```

Reference: `.claude/skills/gstack/browser-automation.md`

$ARGUMENTS
