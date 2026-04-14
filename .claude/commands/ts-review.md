# /ts-review — TypeScript Quality Check

**Framework:** ECC (Everything Claude Code)

Run a TypeScript-focused code quality review.

## Instructions

When the user invokes `/ts-review`, review the specified files for TypeScript quality using the TypeScript Reviewer agent guidelines.

### Quick Check (default)

Run these automated checks:
```bash
# Type check (no emit)
cd admin-panel && npx tsc --noEmit
cd grocery-storefront && npx tsc --noEmit

# Lint
cd admin-panel && npm run lint
cd grocery-storefront && npm run lint
```

### Deep Review

After automated checks, manually review the specified files for:

1. **Type Safety**
   - No `any` types — use `unknown` with type guards
   - Proper nullable handling (`string | null` not `string | undefined` for config fields)
   - Complete generic constraints
   - No unnecessary type assertions

2. **Pattern Compliance**
   - `import type` for type-only imports
   - Path aliases (`@/`) used consistently
   - Interfaces for objects, types for unions
   - `as const` instead of `enum`

3. **Config Type Sync**
   - `admin-panel/src/types/config.ts` matches `grocery-storefront/src/types/storefront-config.ts`
   - New fields have defaults in `admin-panel/src/lib/defaults.ts`
   - Zod schemas in `admin-panel/src/lib/validation.ts` match types

### Output Format

```
## TypeScript Review: [scope]

### Automated Checks
- [ ] `tsc --noEmit` (admin-panel): [pass/fail]
- [ ] `tsc --noEmit` (storefront): [pass/fail]
- [ ] Lint (admin-panel): [pass/fail]
- [ ] Lint (storefront): [pass/fail]

### Manual Review
| Issue | File | Line | Fix |
|-------|------|------|-----|
| [description] | [path] | [line] | [recommendation] |

### Verdict: [PASS / NEEDS FIXES]
```

Reference: `.claude/agents/typescript-reviewer.md`, `.claude/rules/02-typescript.md`

$ARGUMENTS
