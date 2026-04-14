# TypeScript Rules

## Strict Mode

Both projects use TypeScript 5.5 with strict mode. Follow these patterns:

## Type Safety

- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `unknown` instead of `any` — narrow with type guards
- Use discriminated unions for state variants (loading/error/success)
- Avoid type assertions (`as`) — use proper narrowing instead
- Use `satisfies` operator for type checking without widening

## Generics

- Use descriptive generic names (`TConfig`, `TResponse`) not single letters in complex signatures
- Constrain generics: `<T extends Record<string, unknown>>` not bare `<T>`
- Avoid unnecessary generics — if a type parameter is used once, you don't need it

## Patterns for This Project

```typescript
// Config types — always import from types file, never inline
import type { StorefrontConfig, BrandingConfig } from '@/types/config';

// Nullable fields — use explicit null, not undefined
logoUrl: string | null;  // correct
logoUrl?: string;        // avoid for config fields

// API responses — type the full shape
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

## Imports

- Use `import type` for type-only imports
- Use path aliases (`@/`) configured in tsconfig
- Group imports: external → internal → types → styles

## Do NOT

- Do not use `enum` — use `as const` objects or string literal unions
- Do not use `namespace`
- Do not use `/// <reference>` directives
- Do not suppress TypeScript errors with `@ts-ignore` — use `@ts-expect-error` with explanation if absolutely needed
