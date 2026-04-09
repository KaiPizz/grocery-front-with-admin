# Frontend Configuration System Spike

## Recommendation
- Do not build the standalone config system before OMS Phase 1 checkout and order history are stable.
- Do estimate and design it now, because it is a separate platform track that will touch frontend rendering, admin auth, caching, and deployment boundaries.

## Complexity Estimate
- Relative size: medium-to-large project, not a feature task.
- Expected workstreams:
  - config-service backend and database models
  - admin authentication and authorization
  - admin CRUD UI
  - media upload pipeline
  - frontend config client with caching and fallbacks
  - migration of hardcoded homepage, header, footer, promo, and tracking content

## Dependencies
- A separate backend service or module boundary from Zyra business APIs
- Persistent storage for site settings, sections, banners, header/footer, tracking, and media metadata
- Media hosting strategy
- Admin auth strategy
- Cache strategy for public config reads

## Backend Needs
- Public config endpoints for site, homepage, banners, layout, tracking, header, and footer
- Admin endpoints for login, logout, current user, CRUD, and uploads
- Validation rules for enum-backed config fields
- Read-optimized API responses that avoid frontend joins and avoid blocking initial render

## Frontend Integration Needs
- A dedicated config fetch layer separate from product and checkout business data
- Safe defaults for header, footer, promo banners, and homepage sections
- Non-blocking config hydration so the storefront still renders if config fails
- Clear fallback precedence between code defaults and remote config

## Migration Plan
1. Extract the current hardcoded header, footer, homepage hero, promo banner slides, and tracking placeholders into local config objects.
2. Replace direct literals with a thin config access layer that still reads local defaults.
3. Add remote config fetches behind that layer.
4. Move homepage and marketing surfaces first.
5. Move theme and price-display presentation rules after the basic content surfaces are stable.
6. Keep business flows like products, pricing, checkout, and order logic in Zyra.

## Recommended Implementation Order
1. Finish OMS Phase 1 contract cleanup and real order history.
2. Fix backend drift in checkout create and promo code mutations.
3. Introduce frontend config defaults and fetch abstraction.
4. Build the config-service API and admin auth.
5. Migrate homepage, header, footer, and banners.
6. Add media upload and tracking config.

## Key Risk
- If this system is started too early, it will consume time on infrastructure and admin tooling while checkout and order flows are still carrying contract bugs. That is bad prioritization.
