# /review — Combined Code Review Pipeline

**Framework:** Superpowers + ECC + gstack

Run a multi-layer code review combining static analysis, architectural review, and visual verification.

## Instructions

When the user invokes `/review`, run these three review layers in sequence:

### Layer 1: Static Analysis (ECC Agents)

Run TypeScript and React quality checks:

1. **TypeScript Review** (see `.claude/agents/typescript-reviewer.md`)
   - Type safety, `any` usage, import patterns
   - Config type sync between admin-panel and storefront
   - Zod schema consistency

2. **React Review** (see `.claude/agents/react-reviewer.md`)
   - Component design, hooks rules, state management
   - Server vs Client Component boundaries
   - Accessibility basics

### Layer 2: Architectural Review (Superpowers)

Check that changes align with project architecture:

- Does this change respect the monorepo boundary? (no cross-app imports)
- Does it follow the draft/publish config flow?
- Are new components in the right directory?
- Does it follow existing patterns or introduce unnecessary novelty?
- Is the change minimal? (YAGNI — no speculative features)

### Layer 3: Visual Verification (gstack)

If the change affects UI:

- Start dev server and visually verify the change
- Check mobile viewport (390x844)
- Check desktop viewport (1280x720)
- Verify CSS variable usage (no hardcoded colors)
- Check loading and error states

## Review Output

Provide a summary:
```
## Review Summary

### Static Analysis
- [x] TypeScript: [pass/issues found]
- [x] React: [pass/issues found]

### Architecture
- [x] [pass/issues found]

### Visual (if applicable)
- [x] Mobile: [pass/issues found]
- [x] Desktop: [pass/issues found]

### Verdict: [APPROVE / REQUEST CHANGES]
[Summary of issues if any]
```

$ARGUMENTS
