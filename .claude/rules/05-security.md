# Security Rules

## Environment Variables

- NEVER commit `.env.local` files — they contain secrets
- Use `.env.example` as templates (no real values)
- Access secrets only on the server side — never prefix with `NEXT_PUBLIC_` unless the value is safe to expose

### Sensitive Variables (admin-panel)

| Variable | Purpose | Exposure |
|----------|---------|----------|
| `ADMIN_API_KEY` | Config API write auth | Server only |
| `ADMIN_SESSION_SECRET` | Cookie signing | Server only |
| `ADMIN_PASSWORD` | Login credential | Server only |
| `NEXT_PUBLIC_ADMIN_API_KEY` | Client-side API calls | Public (by design) |

## API Security

- All write endpoints require `x-api-key` header validation
- Admin routes protected by session middleware (`admin-panel/src/middleware.ts`)
- Cookie-based sessions with signed cookies (`admin-panel/src/lib/session.ts`)
- CORS headers configured in `next.config.js`

## Input Validation

- Use Zod schemas for all API input validation (`admin-panel/src/lib/validation.ts`)
- Validate on the server — client validation is UX, not security
- Sanitize file uploads: check MIME type, file size, image dimensions

## E-Commerce Specific

- Never expose customer PII in client-side state beyond what's needed for the current page
- Cart/checkout data flows through Zyra API — do not cache sensitive payment data
- Config API data (colors, banners, etc.) is public — but admin write access is not

## Headers

- Use `next/headers` for reading request headers in Server Components
- Set appropriate `Cache-Control` headers for config endpoints
- CSP headers should allow Zyra API domain and configured tracking domains

## Do NOT

- Do not hardcode API keys, passwords, or secrets in source code
- Do not log sensitive data (tokens, passwords, session secrets)
- Do not use `eval()` or `dangerouslySetInnerHTML` without sanitization
- Do not trust client-side data for authorization decisions
- Do not disable CORS for production builds
