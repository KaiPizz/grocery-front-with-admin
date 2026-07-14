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
| `ADMIN_USERNAME` | Yes | — | Non-default admin login name |
| `ADMIN_PASSWORD_HASH` | Yes | — | Scrypt password hash; plaintext passwords are rejected in production |
| `ADMIN_SESSION_SECRET` | Yes | — | Server-only random session-signing secret (at least 32 bytes) |
| `ADMIN_ALLOWED_SLUGS` | Yes | — | Comma-separated server-side tenant allowlist |
| `NEXT_PUBLIC_SALON_SLUG` | Yes | — | Slug opened by the editor; must be in `ADMIN_ALLOWED_SLUGS` |
| `ADMIN_DATA_DIR` | Production | `./data` in development | Absolute, release-independent config directory |
| `ADMIN_UPLOAD_DIR` | Production | `./public/uploads` in development | Absolute, release-independent media directory |
| `ADMIN_PUBLIC_ORIGIN` | Production | Request origin in development | Canonical HTTPS origin used for uploaded-media URLs |
| `STOREFRONT_ORIGINS` | When cross-origin | — | Comma-separated origins allowed to read published config |

Generate the password hash without placing the plaintext password in shell
history:

```bash
read -r -s -p "Admin password: " ADMIN_PASSWORD_INPUT; printf '\n'
printf '%s' "$ADMIN_PASSWORD_INPUT" | npm run --silent hash:admin-password
unset ADMIN_PASSWORD_INPUT
```

Capture the output directly into the protected runtime environment. Treat the
hash as credential material: do not paste it into chat, Git, or logs. If the
password hash changes, existing sessions are invalidated automatically.

Production should point the storage variables at shared paths such as
`/var/www/kenmito-admin/shared/data` and `/var/www/kenmito-admin/shared/uploads`,
then include both directories in backup and rollback checks. Do not place them
inside a timestamped release directory.

Bind the production Node listener to `127.0.0.1` (or firewall it to the reverse
proxy only). The Docker example exposes port 4100 on host loopback; standalone
PM2 deployments should set `HOSTNAME=127.0.0.1`.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/config/:slug` | Public | Published config (cached 5min) |
| `GET` | `/api/config/:slug?draft=true` | Admin session + tenant scope | Draft config for editing |
| `PUT` | `/api/config/:slug` | Admin session + tenant scope | Full config replace (saves to draft) |
| `PATCH` | `/api/config/:slug` | Admin session + tenant scope | Partial config merge (into draft) |
| `POST` | `/api/config/:slug/publish` | Admin session + tenant scope | Copy draft → published |
| `GET` | `/api/health` | Public | Health check |
| `GET` | `/api/media` | Admin session | List uploaded media |
| `DELETE` | `/api/media?filename=...` | Admin session + same origin | Delete uploaded media |
| `POST` | `/api/media/upload` | Admin session + same origin | Upload validated raster image (5MB max; no SVG) |

Admin API calls use the signed, `HttpOnly` login session cookie. Unsafe methods
also require an exact same-origin `Origin` header. Config writes require the
version returned by the draft read in `If-Match`; stale edits receive `409`.
The public published-config GET is the only endpoint with storefront CORS.

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

- JSON files live in `ADMIN_DATA_DIR` as `config-{slug}.json`
- Each file stores both `draft` and `published` versions
- Admin edits go to `draft`; "Publish" copies `draft` → `published`
- Storefront reads `published` config only
- Writes are serialized per tenant, version-checked, and atomically renamed
- Uploaded images live in `ADMIN_UPLOAD_DIR`; SVG and MIME-spoofed files are rejected

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
│   ├── auth.ts          # Signed admin-session validation
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
