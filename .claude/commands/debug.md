# /debug — Systematic Debugging

**Framework:** Superpowers

Diagnose and fix bugs using systematic root-cause analysis.

## Instructions

When the user invokes `/debug`, follow this process:

### 1. Reproduce
- Get a clear reproduction path (steps, URL, viewport, input data)
- Reproduce the bug yourself — run the dev server, navigate, observe
- If you can't reproduce, clarify the conditions with the user

### 2. Gather Evidence
- Check browser console for errors
- Check server logs (Next.js terminal output)
- Read the relevant source code
- Check recent git changes that might have introduced the bug
- Inspect network requests (API responses, GraphQL queries)

### 3. Hypothesize
- Form a hypothesis about the root cause based on evidence
- List 2-3 possible causes ranked by likelihood
- **Do NOT jump to fixing** — verify the hypothesis first

### 4. Verify Hypothesis
- Add temporary logging or assertions to confirm the cause
- Check: Is this a data issue? A logic error? A timing issue? A type mismatch?
- Trace the data flow from source to symptom

### 5. Fix
- Write a failing test that captures the bug (TDD RED)
- Fix the root cause, not the symptom
- Run the test to confirm it passes (TDD GREEN)
- Run the full test suite to check for regressions

### 6. Verify Fix
- Reproduce the original steps — bug should be gone
- Check related features haven't regressed
- Document what caused the bug in the commit message

## Common Bug Categories in This Project

| Category | Check |
|----------|-------|
| **Config sync** | Admin draft vs published, slug mismatch, cache TTL |
| **Type mismatch** | admin-panel types vs storefront types diverged |
| **SSR/CSR** | Server Component using client-only API, hydration mismatch |
| **i18n** | Missing translation key, locale routing issue |
| **API** | Zyra endpoint changed, GraphQL schema mismatch |
| **State** | Zustand store stale, useConfig() race condition |

$ARGUMENTS
