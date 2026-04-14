# React & Next.js Rules

## Next.js 14 App Router

- All routes use the App Router (`src/app/`)
- Default to **Server Components** — only add `'use client'` when you need:
  - Event handlers (onClick, onChange, etc.)
  - useState, useEffect, useRef, or other hooks
  - Browser APIs (window, document, localStorage)
- Server Components can `async/await` directly for data fetching
- Use `route.ts` for API routes, not `pages/api/`

## Component Patterns

```
// Server Component (default) — no directive needed
export default async function ProductPage({ params }) {
  const data = await fetchProducts();
  return <ProductList products={data} />;
}

// Client Component — explicit directive
'use client';
export function AddToCartButton({ productId }) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

## Data Fetching

- **Storefront:** Uses urql GraphQL client for Zyra API, REST proxy for other endpoints
- **Admin Panel:** Uses custom `api-client.ts` for config CRUD
- Fetch on the server when possible — pass data down as props
- Use `useConfig()` hook in admin panel for config state management

## Layout & Routing

- **Storefront:** `[locale]/(shop)/` route group with next-intl for i18n
- **Admin:** `/admin/*` routes protected by session middleware
- Both apps have `layout.tsx` at root for shared chrome (header, footer, providers)

## State Management

- **Storefront:** Zustand for global state (`src/stores/`), React state for local UI
- **Admin:** `useConfig()` hook manages draft/published config state
- Do NOT lift state higher than necessary
- Do NOT create new Zustand stores without justification

## Styling

- Tailwind CSS utility classes — avoid custom CSS unless truly needed
- Use `clsx` or `tailwind-merge` for conditional classes (storefront)
- Responsive: mobile-first (`sm:`, `md:`, `lg:` breakpoints)
- Colors come from CSS variables injected by ConfigProvider (storefront)

## Do NOT

- Do not use `getServerSideProps` or `getStaticProps` (Pages Router patterns)
- Do not use `next/router` — use `next/navigation` (`useRouter`, `usePathname`)
- Do not create barrel exports (`index.ts` re-exporting everything)
- Do not add `'use client'` to components that don't need interactivity
