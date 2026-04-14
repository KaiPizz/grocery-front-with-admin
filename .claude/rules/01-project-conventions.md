# Project Conventions

## Monorepo Structure

This is a monorepo with two independent Next.js 14 apps. They share NO code — each has its own `node_modules`, `package.json`, and `tsconfig.json`.

| App | Port | Purpose |
|-----|------|---------|
| `admin-panel/` | 4100 | Config REST API + Admin UI |
| `grocery-storefront/` | 3008 | Customer-facing storefront |

## Communication

- Storefront reads config from Admin Panel via `GET /api/config/{slug}`
- Admin writes config via `PUT /api/config/{slug}` with `x-api-key` header
- Storefront reads products/cart/auth from external Zyra API (GraphQL + REST)
- The two Next.js apps do NOT import from each other

## File Naming

- **Files/directories:** kebab-case (`color-picker.tsx`, `use-config.ts`)
- **Components:** PascalCase (`ColorPicker`, `SaveBar`)
- **Types/interfaces:** PascalCase (`StorefrontConfig`, `BrandingConfig`)
- **Constants:** UPPER_SNAKE_CASE for env vars, camelCase for others

## Directory Layout (per app)

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions, API clients
├── types/         # TypeScript type definitions
├── i18n/          # Internationalization
└── stores/        # Zustand stores (storefront only)
```

## Config Data

- Stored as JSON files in `admin-panel/data/config-{slug}.json`
- Each file has `published` + `draft` sections
- `NEXT_PUBLIC_SALON_SLUG` must match between both apps
- Draft/Publish workflow: Save Draft → Publish → Storefront picks up after 5-min cache TTL

## Dependencies

- Do NOT add dependencies without justification
- Both apps share: Next.js 14, React 18, TypeScript 5.5, Tailwind 3.4
- Storefront-specific: urql, Zustand, next-intl, Playwright
- Admin-specific: lucide-react, sonner, zod, uuid
