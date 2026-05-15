# Admin First Publish Hub Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin dashboard into a first-publish hub and centralize publish-readiness rules so first-time owners know the next step and invalid configs cannot publish through a different path.

**Architecture:** Add one pure readiness module under `admin-panel/src/lib/` that inspects `StorefrontConfig` and returns ordered setup state plus blocking/recommended/optional issues. Reuse that module from the dashboard and from `useConfig().publish()`, while keeping the existing admin pages as the only editing surfaces.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Node built-in test runner via `tsx`

---

## File Structure

- Create `admin-panel/src/lib/admin-readiness.ts`
  - Pure readiness model, setup order, blocker/recommendation generation, English publish-blocker fallback text.
- Create `admin-panel/src/lib/admin-readiness.test.ts`
  - Spec-first unit coverage for blockers, recommendations, tracking behavior, and next-step ordering.
- Modify `admin-panel/package.json`
  - Add a focused unit-test command and an explicit `tsx` dev dependency so admin helper tests are runnable without a larger harness.
- Modify `admin-panel/package-lock.json`
  - Lock the new explicit dev dependency.
- Modify `admin-panel/src/hooks/use-config.ts`
  - Gate publish through the shared readiness helper before any API call.
- Modify `admin-panel/src/app/admin/page.tsx`
  - Add the first-publish hub UI above the existing summary cards.
- Modify `admin-panel/src/app/admin/homepage/page.tsx`
  - Remove duplicate publish-only validation so publish readiness has one source of truth.
- Modify `admin-panel/src/i18n/translations/en.ts`
- Modify `admin-panel/src/i18n/translations/pl.ts`
- Modify `admin-panel/src/i18n/translations/vi.ts`
  - Add dashboard copy for readiness states and checklist labels.
- Modify `.claude/docs/progress.md`
  - Record the dashboard/readiness work as it moves from existing overview to first-publish hub.

## Task 1: Establish a Runnable Unit-Test Path

**Files:**
- Modify: `admin-panel/package.json`
- Modify: `admin-panel/package-lock.json`

- [ ] **Step 1: Add the failing test command first**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts
```

Expected: FAIL because the script does not exist yet.

- [ ] **Step 2: Add the minimal explicit test dependency and script**

Add:

```json
"scripts": {
  "test:unit": "tsx --test"
}
```

and:

```json
"devDependencies": {
  "tsx": "^4.20.6"
}
```

Then run:

```powershell
cd admin-panel
npm install
```

- [ ] **Step 3: Re-run the command**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts
```

Expected: FAIL because the test file does not exist yet.

## Task 2: Build the Readiness Model With TDD

**Files:**
- Create: `admin-panel/src/lib/admin-readiness.test.ts`
- Create: `admin-panel/src/lib/admin-readiness.ts`

- [ ] **Step 1: Write the first failing unit tests**

Cover:

- a publishable configured state with valid required assets
- enabled hero block missing required image
- enabled sticky block missing required desktop/mobile images
- disabled blocks not creating blockers
- disabled tracking remaining optional
- enabled tracking with missing required ID blocking publish
- recommendations for default branding/general/SEO values
- deterministic setup order and first blocking next step

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts
```

Expected: FAIL because `admin-readiness.ts` does not exist yet.

- [ ] **Step 3: Implement the smallest readiness helper that satisfies the tests**

Export:

- setup section/issue interfaces
- `getAdminReadiness(config)`
- `getPublishBlockerMessage(issue)`

The model should:

- use setup order `branding -> homepage -> layout -> general -> seo -> tracking`
- classify issues as `blocking`, `recommended`, or `optional`
- return `canPublish`, grouped issue arrays, checklist rows, and first blocking section

- [ ] **Step 4: Re-run unit tests and verify GREEN**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts
```

Expected: PASS.

## Task 3: Centralize Publish Gating

**Files:**
- Modify: `admin-panel/src/hooks/use-config.ts`
- Modify: `admin-panel/src/app/admin/homepage/page.tsx`

- [ ] **Step 1: Extend readiness tests for publish-blocker messaging**

Add assertion that the first blocking issue produces a human-readable publish error message suitable for the existing toast/error channel.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts
```

Expected: FAIL until the publish-blocker message contract exists.

- [ ] **Step 3: Integrate helper into `useConfig().publish()`**

Before saving or publishing:

- compute readiness
- reject when `canPublish === false`
- set `error`
- show a toast using the first blocking reason
- throw before calling the API

- [ ] **Step 4: Remove duplicate homepage publish validation**

Keep any draft-save behavior that already exists, but make `onPublish` call the shared `publish` path instead of a page-local blocker implementation.

- [ ] **Step 5: Run unit tests and TypeScript verification**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts
npx tsc --noEmit
```

Expected: PASS.

## Task 4: Add the First-Publish Hub to the Dashboard

**Files:**
- Modify: `admin-panel/src/app/admin/page.tsx`
- Modify: `admin-panel/src/i18n/translations/en.ts`
- Modify: `admin-panel/src/i18n/translations/pl.ts`
- Modify: `admin-panel/src/i18n/translations/vi.ts`

- [ ] **Step 1: Add the missing dashboard copy**

Add translation keys for:

- blocked / ready / ready-with-recommendations headings
- continue-setup / publish-storefront actions
- checklist title
- per-section checklist labels and descriptions
- severity labels such as required / recommended / optional

- [ ] **Step 2: Add the dashboard hub UI**

Use the shared readiness helper to render:

- readiness summary
- one primary CTA
- ordered checklist rows linking to existing admin pages
- error feedback near the publish action when publish fails

Keep the current status cards and configuration grid below the new guidance.

- [ ] **Step 3: Verify the dashboard compiles**

Run:

```powershell
cd admin-panel
npx tsc --noEmit
npm run lint
```

Expected: PASS, allowing only pre-existing warnings if any already exist before this slice.

## Task 5: Update Project Docs And Verify The Real UI

**Files:**
- Modify: `.claude/docs/progress.md`
- Modify if warranted: `.claude/docs/learnings.md`

- [ ] **Step 1: Update progress**

Record that `/admin` now has first-publish readiness guidance and centralized publish gating.

- [ ] **Step 2: Run final verification**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manually verify the local admin UI**

Open `http://localhost:4100/admin` in the in-app browser and verify:

- default/incomplete config shows a blocked readiness state
- primary CTA leads to the first unresolved required step
- tracking appears optional when disabled
- after using a publishable config, the hub shows the publish action
- existing status cards and configuration navigation remain available below the hub

- [ ] **Step 4: Commit the implementation**

```powershell
git add admin-panel .claude/docs/progress.md .claude/docs/learnings.md docs/superpowers/plans/2026-05-15-admin-first-publish-hub.md
git commit -m "feat(admin): add first-publish readiness hub"
```

## Local Review Notes

- The admin app currently has no dedicated test harness. This plan adds the minimum unit-test path needed for the new pure helper instead of broadening the slice into a full admin E2E infrastructure project.
- The dashboard work must stay operational, not marketing-like: one dominant CTA, dense but scannable checklist, and existing summary content retained lower on the page.
- Recommended items must not become accidental blockers. Only broken live-rendering states belong in the blocking class.
