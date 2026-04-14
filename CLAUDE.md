# Project Guidelines

This file captures conventions, preferences, and non-obvious patterns that cannot be inferred from the code alone. It is loaded once and stays in context for the entire session.

For project structure, architecture, and detailed rules, read the `.claude/rules/` directory.

## Reference Docs — Read on Demand

These files are NOT auto-loaded. Read them only when the trigger condition applies — don't waste tokens loading files you don't need for the current task.

| File | What it contains | When to read it |
|------|-----------------|-----------------|
| `.claude/docs/PRD.md` | Product vision, goals, user stories, feature phases, design principles, open questions. **This is the north star for the entire project.** | When you need to understand *why* a feature exists, what the product goals are, what's planned for Phase 2/3, or when making design/UX decisions that need product context. |
| `.claude/docs/progress.md` | Feature completion status for every page, component, store, and API route. | **Read at the start of every task** to know what's done and what's not. Update it as you work. |
| `.claude/docs/learnings.md` | Error log — past mistakes, what caused them, how they were fixed. | **Read at the start of every task** to avoid repeating past errors. Update it when you make or fix mistakes. |

### While implementing
- **Update `progress.md`** whenever you finish a feature, add a new one, or change the status of an existing one. Don't wait until the end — update it as you go.
- **Update `learnings.md`** whenever you:
  - Hit a bug or error and figure out the cause
  - Try an approach that fails and have to switch to a different one
  - Discover something non-obvious about the codebase, an API, or a library
  - Waste time on something that could have been avoided with a note

### Format for learnings entries
Each entry must follow this structure so future sessions can quickly scan it:
```
### [Short description of the mistake/discovery]
- **Error:** What went wrong or what you tried that didn't work
- **Cause:** Why it happened (root cause, not symptoms)
- **Fix:** What you did to solve it
- **Rule:** The general principle to follow going forward
```

### Format for progress updates
- Change status: ❌ Not started → 🔧 Partial → ✅ Done → 🐛 Has issues
- Always update the Notes column with a brief description and date
- Add new rows when you create new features or components
- Add to "Known Issues & Debt" when you find problems you're not fixing now

---

## Coding Style

### TypeScript

- **Interfaces over types** for all object shapes. Use `type` only for unions, intersections, or mapped types. Define response interfaces co-located in the file that uses them — not in a shared types file — unless multiple files need the same shape.
- **Explicit `null` over `undefined`** for nullable fields: `field: string | null`, not `field?: string`.
- **No enums.** Use string literal union types: `type StorageZone = 'AMBIENT' | 'CHILLED' | 'FROZEN'`.
- **Named functions** for top-level helpers (`function handleSearch() {}` not `const handleSearch = () => {}`). Arrow functions are fine for inline callbacks, `.map()`, and short one-liners.
- **`void` keyword** when calling async functions in event handlers where the return value is intentionally discarded: `onClick={() => void handleSubmit()}`.
- **Import ordering:** externals → internal `@/` paths → types (with `import type`) → styles. Keep `'use client'` on line 1 when needed.

### React & Components

- **Individual Zustand selectors** — never destructure the whole store. Each piece of state gets its own selector:
  ```tsx
  const items = useCartStore((s) => s.items);
  const cost = useCartStore((s) => s.cost);
  ```
- **Multiple `useTranslations` hooks** per component are fine. Use namespace prefixes that match the i18n JSON structure: `useTranslations('checkout')`, `useTranslations('cart')`, `useTranslations('common')`.
- **Inline `useMemo`/`useCallback`** for derived data or memoized translations — not standalone utility functions.
- **Error handling pattern:** Every mutation should chain GraphQL top-level errors → payload-level errors → fallback message. Display errors via both `toast.error()` and a visible `errorBanner` state. Never show just one.
- **Form state pattern:** Define a typed `FormState` interface, use a single `useState<FormState>()`, and update individual fields with a `setFieldValue` helper that also clears the corresponding field error.

### CSS & Styling

- **CSS custom properties via inline `style` for all dynamic colors**, not Tailwind color utilities. This is because colors are runtime-configurable via admin panel:
  ```tsx
  // ✅ Correct
  <span style={{ color: 'var(--color-foreground)' }}>Text</span>
  <div style={{ borderColor: 'var(--color-border)' }}>

  // ❌ Wrong — these won't reflect admin-configured colors
  <span className="text-foreground">
  <div className="border-border">
  ```
- **Tailwind is used for layout and spacing only** — `flex`, `gap-*`, `px-*`, `rounded-*`, `text-sm`, responsive breakpoints, etc.
- **`color-mix(in srgb, ...)`** for semi-transparent or blended colors that adapt to dark mode:
  ```css
  background-color: color-mix(in srgb, var(--color-foreground) 5%, transparent);
  ```
- **Two font families:** `var(--font-display)` (Fraunces, serif) for headings and branding, `var(--font-body)` (DM Sans, sans-serif) for body text. Use `.heading-display` and `.heading-section` utility classes for headings.
- **Animation timing tokens:** Always use `var(--duration-fast)`, `var(--duration-normal)`, `var(--duration-slow)` and `var(--ease-out)` — never hardcode `200ms ease-in-out`.
- **GPU-only transitions:** Only animate `transform`, `opacity`, and `box-shadow`. Never animate `width`, `height`, `top`, `left`, or `background-color` on scroll-triggered elements. Use `will-change: transform` sparingly and only when promoting a layer.

### Performance Conventions

- **Scroll listeners must use `requestAnimationFrame` throttling.** Never add a bare `scroll` event handler. Always use `{ passive: true }`.
- **No `background-attachment: fixed`** — use a `position: fixed` pseudo-element with `will-change: transform` instead (see `body::before` in globals.css).
- **Product grid stagger** uses CSS custom property `--stagger` with `calc(var(--stagger) * 50ms)` delay — don't add JavaScript-based stagger animation.

---

## i18n Conventions

- Two locales: `en` and `pl`. Message files live in `grocery-storefront/src/messages/{en,pl}.json`.
- When a string needs localization but adding it to the JSON files would be premature or it's a one-off contextual string, use an **inline `useMemo` object keyed by locale**:
  ```tsx
  const uiText = useMemo(() => ({
    label: locale === 'pl' ? 'Polski tekst' : 'English text',
  }), [locale]);
  ```
- Translation functions from `next-intl` follow nested namespaces: `t('checkout.required')` maps to `{ "checkout": { "required": "..." } }`.
- **Default country is `'PL'`**, default currency is `'PLN'`. These are hardcoded fallbacks, not configurable.

---

## Error & Loading Patterns

- **Busy state:** Use a single `busy` boolean for the entire form/page, not per-button loading states.
- **Error banner + toast:** Mutations set both `setErrorBanner(message)` and `toast.error(message)`. The banner is persistent and dismissible; the toast is transient.
- **GraphQL error extraction chain:**
  1. `getGraphqlErrorMessage(response.errors)` — top-level transport errors
  2. `getPayloadMessage(payload?.errors)` — domain-level validation errors
  3. Hardcoded fallback string — e.g., `'Failed to create checkout.'`
- **`try/finally` over `try/catch` for `setBusy`:** Always reset `busy` in `finally`, only catch if you need to set a specific error. The pattern is:
  ```tsx
  setBusy(true);
  try {
    // mutation logic
  } finally {
    setBusy(false);
  }
  ```

---

## Naming Preferences

- **Event handler functions:** `handle` prefix + noun + verb: `handleDeliveryContinue`, `handlePromoApply`, `handleSavedAddressSelect`.
- **Boolean states:** Use adjectives or past participles: `busy`, `initialized`, `isAuthenticated`, `mobileSummaryOpen`.
- **Constants:** `UPPER_SNAKE_CASE` for storage keys and static config: `CHECKOUT_DRAFT_KEY`, `INPUT_CLASS`, `PAYMENT_ICONS`.
- **CSS class-string constants:** Extract repeated Tailwind class strings into `const` at the top of the file:
  ```tsx
  const INPUT_CLASS = 'w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm ...';
  ```

---

## Component Architecture Preferences

- **Fat pages are acceptable.** Complex pages like checkout can be 1000+ lines in a single file if the logic is cohesive. Don't prematurely split into micro-components unless a piece is genuinely reused elsewhere.
- **Extract into components only when reused.** `CheckoutProgress` was extracted because it's reused — the checkout form itself was not because it's page-specific.
- **Helper functions above the component** — keep pure utility functions (formatters, normalizers, translators) as module-level `function` declarations above the default export, not inside the component body.
- **Inline JSX fragments** for sections of a page are fine — assign to a `const` like `summaryContent` and render in place rather than creating a separate component.

---

## Git & Workflow

- Default branch: `main`. Push directly — no PR workflow currently.
- Commit messages should be concise and describe the change, not the file.
- Never commit `.env.local`, `node_modules`, `.next`, or temp files (`.tmp.driveupload`, `.pen`).
- Both apps run independently: storefront on `:3008`, admin on `:4100`.

---

## Things To Watch Out For

- **`StorefrontConfig` types must stay in sync** between `admin-panel/src/types/config.ts` and `grocery-storefront/src/types/storefront-config.ts`. When adding a new config field, update both.
- **Zyra API is external** — we don't control it. GraphQL queries go through `/api/graphql` proxy route. If a field is nullable in the response, always handle the null case.
- **Config flow has a 5-minute cache TTL.** Changes published in admin won't appear in storefront immediately.
- **`useHydrated()` guard** — always check `isHydrated` before accessing browser APIs or rendering client-only state to avoid hydration mismatches.
- **`isMounted` pattern** — interactive elements that reference window dimensions or client state should gate behind `isMounted` via `useEffect(() => setIsMounted(true), [])`.
