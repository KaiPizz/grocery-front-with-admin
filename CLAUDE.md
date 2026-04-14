# Grocery Storefront + Admin Panel

## Project Identity

Next.js 14 monorepo with two independent apps communicating via REST API.

| App | Path | Port | Role |
|-----|------|------|------|
| **Admin Panel** | `admin-panel/` | 4100 | Config API + Admin UI for storefront management |
| **Grocery Storefront** | `grocery-storefront/` | 3008 | Customer-facing store with products, cart, checkout |

**Tech stack:** Next.js 14 (App Router), React 18, TypeScript 5.5, Tailwind CSS 3.4, Playwright (E2E)
**Storefront extras:** urql (GraphQL), Zustand (state), next-intl (i18n)
**External API:** Zyra (zira-ai.com) — products, cart, auth, orders. NOT managed here.

## Quick Start

```bash
# Admin Panel
cd admin-panel && npm install && npm run dev    # http://localhost:4100

# Storefront
cd grocery-storefront && npm install && npm run dev  # http://localhost:3008

# E2E Tests
cd grocery-storefront && npx playwright test
```

**Admin login:** see `admin-panel/.env.local` (default: admin / admin123)

## Architecture

```
Browser → Admin Panel (4100)     Browser → Storefront (3008)
              │                              │
              ├── Admin UI (React)           ├── Customer pages
              ├── Config REST API            ├── Reads config from Admin API
              └── Media upload               └── Products from Zyra GraphQL
              │
         data/config-{slug}.json
```

**Config flow:** Admin edits → Save Draft → Publish → Storefront reads published config (5-min cache TTL)

**StorefrontConfig schema:** `admin-panel/src/types/config.ts` — 15 color tokens, 6 banner block types, hero, promo, layout, SEO, tracking sections.

## Key Documentation

- `HOW_IT_WORKS.md` — Full system architecture (Vietnamese)
- `admin-panel/PROJECT_CONTEXT.md` — Admin panel deep-dive
- `grocery-storefront/.codex/backend_structure/` — Zyra API docs (CRM, PIM, OMS)

## Installed Frameworks & Skills

Located in `.claude/` (committed to repo for cross-device access):

| Framework | Location | Role |
|-----------|----------|------|
| **Superpowers** | `.claude/skills/superpowers/` | Primary workflow orchestrator (plan, TDD, debug, review) |
| **UI-UX Pro Max** | `.claude/skills/ui-ux-pro-max/` | Design intelligence (colors, fonts, UX guidelines) |
| **gstack** | `.claude/skills/gstack/` | Browser QA automation + sprint management |
| **ECC agents** | `.claude/agents/` | TypeScript, React, security review agents |

### Available Commands

| Command | Source | Purpose |
|---------|--------|---------|
| `/plan` | Superpowers | Structured feature planning (understand → design → plan → execute → review) |
| `/tdd` | Superpowers | RED-GREEN-REFACTOR test-driven development cycle |
| `/debug` | Superpowers | Systematic root-cause analysis |
| `/review` | Combined | Code review pipeline (static → architectural → visual) |
| `/design` | UI-UX Pro Max | Generate design system decisions (colors, typography, UX) |
| `/ui-review` | UI-UX Pro Max | Audit UI/UX quality against best practices |
| `/sprint` | gstack | Sprint phase management (Think → Plan → Build → Review → Test → Ship → Reflect) |
| `/qa` | gstack | Browser automation QA with Playwright |
| `/ship` | gstack | Deployment workflow with pre-flight checks |
| `/security-audit` | ECC | Security review for e-commerce threats |
| `/ts-review` | ECC | TypeScript code quality check |

### Recommended Workflow

1. `/sprint` — Define sprint scope and priorities
2. `/plan` — Create detailed implementation plan for a feature
3. `/design` — Get design decisions for UI features
4. `/tdd` — Implement with test-first approach
5. `/review` — Run combined code review
6. `/qa` — Browser automation testing
7. `/ship` — Deploy with pre-flight checks

## Coding Conventions

- **Files:** kebab-case. **Components:** PascalCase. **Types:** PascalCase.
- **App Router:** `page.tsx`, `layout.tsx`, `route.ts` — prefer Server Components, use `'use client'` only when needed
- **Types:** `admin-panel/src/types/config.ts` and `grocery-storefront/src/types/storefront-config.ts` must stay in sync
- **State:** Zustand stores in `grocery-storefront/src/stores/`
- **Hooks:** `src/hooks/` in each app
- **Tests:** Playwright E2E with mock-route pattern and mobile viewport fixtures
- **Environment:** NEVER commit `.env.local`. Use `.env.example` as template.
- **Config API:** All write operations require `x-api-key` header. `NEXT_PUBLIC_SALON_SLUG` must match between apps.

## Rules

See `.claude/rules/` for detailed coding rules:
- `01-project-conventions.md` — Monorepo structure, ports, naming
- `02-typescript.md` — Strict mode, type patterns
- `03-react-nextjs.md` — App Router, RSC, client components
- `04-testing.md` — Playwright patterns, fixtures
- `05-security.md` — API keys, env vars, e-commerce security
- `06-design-system.md` — CSS variables, color tokens, branding
