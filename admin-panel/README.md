# Storefront Admin Panel

Schema-driven configuration system for storefront websites. Allows operations teams to customize branding, layout, content, tracking, and SEO without code changes or redeployment.

## Architecture

```
admin-panel (this project)          grocery-storefront
├── Admin UI  (/admin/*)            ├── Reads config from admin API
├── Config API (/api/config/*)      ├── Renders based on config
└── Media Upload (/api/media/*)     └── Falls back to defaults
```

- **Admin UI** — Next.js pages for editing storefront config
- **Config API** — REST endpoints for config CRUD + publish
- **Zyra** — Separate backend for products, cart, auth (not managed here)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local
# Edit .env.local with your values

# 3. Start dev server
npm run dev
# Admin panel: http://localhost:4100/admin
# Config API:  http://localhost:4100/api/config/:slug
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_API_KEY` | Yes | — | API key for write operations (PUT/PATCH/publish) |
| `NEXT_PUBLIC_ADMIN_API_KEY` | Yes | — | Same key, exposed to client for admin UI API calls |
| `NEXT_PUBLIC_SALON_SLUG` | Yes | `my-grocery-store` | Slug identifying which storefront config to manage |
| `CORS_ORIGIN` | No | `*` | Allowed origin for storefront CORS |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/config/:slug` | Public | Published config (cached 5min) |
| `GET` | `/api/config/:slug?draft=true` | API key | Draft config for editing |
| `PUT` | `/api/config/:slug` | API key | Full config replace (saves to draft) |
| `PATCH` | `/api/config/:slug` | API key | Partial config merge (into draft) |
| `POST` | `/api/config/:slug/publish` | API key | Copy draft → published |
| `GET` | `/api/health` | Public | Health check |
| `POST` | `/api/media/upload` | API key | Upload image (5MB max, images only) |

Auth: Pass `x-api-key` header with `ADMIN_API_KEY` value.

## Admin Pages

| Page | Route | What it manages |
|------|-------|-----------------|
| Dashboard | `/admin` | Overview + links to all sections |
| Branding | `/admin/branding` | Logo, favicon, store name, 13 theme colors |
| Homepage | `/admin/homepage` | Hero banner, promo banners (with image upload), section ordering |
| Layout | `/admin/layout-config` | Header nav, footer columns, price/banner position |
| Tracking | `/admin/tracking` | Facebook Pixel, GA4, GTM, Hotjar |
| SEO | `/admin/seo` | Meta title/description, OG image, canonical |
| General | `/admin/general` | Phone, email, social links, policy URLs |

## Config Storage

- **MVP:** JSON files in `./data/config-{slug}.json`
- Each file stores both `draft` and `published` versions
- Admin edits go to `draft`; "Publish" copies `draft` → `published`
- Storefront reads `published` config only

## Storefront Integration

The storefront needs these env vars:

```env
NEXT_PUBLIC_CONFIG_API_URL=http://localhost:4100
NEXT_PUBLIC_SALON_SLUG=my-grocery-store
```

The storefront fetches `GET /api/config/:slug` on page load and uses the config to:
- Inject CSS custom properties (colors)
- Render logo, store name, nav items, footer
- Show/hide/reorder homepage sections
- Load tracking scripts (Pixel, GA4, GTM, Hotjar)

## Project Structure

```
src/
├── app/
│   ├── admin/           # Admin UI pages
│   │   ├── branding/
│   │   ├── homepage/
│   │   ├── layout-config/
│   │   ├── tracking/
│   │   ├── seo/
│   │   ├── general/
│   │   ├── layout.tsx   # Admin shell (sidebar + topbar)
│   │   └── page.tsx     # Dashboard
│   ├── api/
│   │   ├── config/[slug]/       # Config CRUD
│   │   ├── config/[slug]/publish/ # Publish endpoint
│   │   ├── health/              # Health check
│   │   └── media/upload/        # Image upload
│   ├── layout.tsx
│   └── page.tsx         # Redirects to /admin
├── components/          # Shared UI (SaveBar, ColorPicker, etc.)
├── hooks/
│   └── use-config.ts    # Config fetch/save/publish hook
├── lib/
│   ├── api-client.ts    # Typed API fetch wrappers
│   ├── auth.ts          # API key validation
│   ├── config-repository.ts  # JSON file read/write
│   ├── defaults.ts      # Default config values
│   └── validation.ts    # Zod schemas
├── types/
│   └── config.ts        # StorefrontConfig TypeScript interfaces
data/                    # Config JSON files (gitignored)
public/uploads/          # Uploaded media (gitignored)
```

## Development

```bash
npm run dev      # Start dev server on port 4100
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Related Projects

- **grocery-storefront** — Customer-facing storefront (Next.js, port 3008)
- **Zyra** — Business API backend (products, cart, auth, media)
