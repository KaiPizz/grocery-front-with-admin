# Asia Deli Go — landing page redesign (plan, 2026-09-28)

Status: **design plan for Paul's OK**. After the OK, each phase is broken into TDD tasks
(writing-plans) and executed in this worktree; preview on `adg-dev.159.195.47.45.sslip.io`.

Branch `feat/adg-landing-redesign-20260928`, stacked on wave 2
(`feat/cuisines-lean-filters-20260927` @ `d9dc056`, not landed yet). Lands after wave 2.

Evidence: `/home/paul/work/adg-landing-research/findings.md` + `shots/` (kimchi.pl, asiafoods.pl,
pitaya.pl, japancentre.com, sayweee.com, frisco.pl, wingyipstore.co.uk, hmart.com, ADG dev;
oseyo/yamibuy blocked the server). Owner complaint (Telegram photo 28/09): page looks "demo",
not eye-catching; the 4 cards under the banner are uneven and ugly.

## 1. What is wrong today (measured on dev `d9dc056`)

| # | Problem | Evidence |
|---|---|---|
| P1 | Trust row = 4 cards whose height follows copy length; on a 390 px phone they fill ~1 screen before any product | photo; `home-trust-row` `grid-cols-2`, copy 2–4 lines |
| P2 | Hero art has text baked in at 3.2:1; the "mobile" files are the same 768×240 crop ⇒ unreadable on a phone, no CTA, all slides link `/products` | `public/brand/hero/*-mobile.webp` = 768×240, `HeroBanner` `aspect-[3.2/1]` |
| P3 | "Polecane" = 6/8 Buldak (same product, different packs, a 344 zł 40-pack carton first) | featured leaves round-robin, no diversity rule |
| P4 | Categories: mixed sources (2 grids + round grid) ⇒ 9 tiles, not the 10 tree groups; 3×3 grid on mobile eats a screen | config blocks |
| P5 | Nothing about the pickup shop on the page (address, hours, how pickup works) — pickup is the whole model | only a top-bar line + footer |
| P6 | ADG's differentiator — 5 cuisines — only in the nav | "Kuchnie" menu only |
| P7 | SEO text wall is the last big block; footer = 3 bare columns + a duplicate trust strip | screenshots |

Data facts that constrain the design (dev DB = prod dump, ADG salon):
1 779 active products · country set on 1 707 (Japonia 441, Korea 419, Chiny 334, Tajlandia 174,
Wietnam 60) · brand set on 1 771 (Asia Kitchen, Samyang, Ottogi, Sempio, Nongshim, Lee Kum Kee…) ·
**0 on sale, 0 bestseller flags, all created the same day, 16 orders** ⇒ "Nowości", "Promocje",
"Bestsellery" rails would be fake today. The API supports `countryOfOrigin`, `brands`,
`categories` filters and `DATE`/`PRICE` sorts; no sale/bestseller sort.

## 2. Target layout

Mobile (390 px) — no section taller than ~½ screen except rails:
1. Top bar: `Odbiór osobisty · Zamieniecka 80/12 · dziś do 19:00` (hours from config; "Zamknięte" on Sunday).
2. Header (unchanged).
3. **Hero** 4:3 mobile / 3:1 desktop, **image without baked text + HTML overlay** (headline, 1 line, CTA button), 3–4 slides, each CTA to a real category; dots, swipe, autoplay 6 s, pause on touch.
4. **USP strip**: one row, equal height, icon + ≤3 words — `Odbiór w Warszawie` · `BLIK / Przelewy24` · `Płatność przy odbiorze` · `1 700+ produktów`; mobile = horizontal scroll chips (2.5 visible), desktop = 4 equal columns 56 px high. (kimchi.pl / Japan Centre)
5. **Kategorie**: the 10 tree groups from the API, same set/order on every breakpoint; mobile = horizontal scroll of square tiles (image + name), desktop = 5×2 grid; "Zobacz wszystkie".
6. **Kuchnie Azji**: 5 cards (Korea, Japonia, Chiny, Tajlandia, Wietnam) with a dish photo, flag chip and live product count, linking to the existing cuisine pages. (H Mart cuisine rows)
7. **Polecane** rail — curated: product IDs from admin config; fallback = featured leaves with a diversity rule (max 1 product per brand+base-name, skip multipack/carton titles, prefer in-stock, 8–12 items). Horizontal scroll on mobile.
8. **Jak działa odbiór** — 3 steps: Zamów online → Potwierdzimy dostępność → Odbierz i zapłać (lub zapłać online). (Frisco)
9. Country rails: **Hity z Korei**, **Z Japonii** (countryOfOrigin filter + featured leaves, same diversity rule).
10. One campaign banner (existing ramen banner, editable, seasonal).
11. **Na szybki obiad** rail (dania gotowe + zupki instant).
12. **Popularne marki**: 8–10 text chips/wordmarks (no third-party logos) → brand filter.
13. **Sklep i odbiór**: address, hours table, "Wyznacz trasę" (Google Maps link), store photo when the owner sends one (no placeholder photo).
14. **O Asia Deli Go**: 2 sentences + "Czytaj więcej" (the current SEO text collapsed; stays in HTML for SEO).
15. Footer: add payment row (BLIK, Przelewy24, gotówka/karta przy odbiorze), hours; drop the duplicate trust strip; social icons only if accounts exist.

Desktop: same order; hero full width with rounded corners; USP strip overlaps the hero bottom edge
slightly (card lift); rails show 5–6 cards with arrows; Kuchnie = 5 in a row; Sklep i odbiór = 2 columns
(info | map card).

Not now (needs real data — do not fake): Nowości, Promocje, Bestsellery rails (auto-appear later
when ≥6 items qualify), reviews/stars, Instagram, newsletter (no backend list for the storefront yet).

## 3. Visual system (fix the "demo" look)

- Colour: logo red (`#D7262E`-ish, sample from logo) as a sparing accent (CTA, badges, section
  eyebrow), brand green stays primary for "Do koszyka"; alternate section backgrounds white / warm
  cream (`#FBF7F0`) instead of all-white with pale-green borders everywhere.
- Type: one display face for H2 (current serif) at one size scale (28/22 px), body sans; section
  eyebrow in small caps red ("POLECANE", "KUCHNIE AZJI").
- Consistent radii (16 px cards, 24 px hero), one shadow token, 24/40 px vertical rhythm mobile/desktop.
- Imagery: one art direction — warm studio packshots (the category tiles) + appetising dish photos for
  hero and cuisines; generated with the same pipeline as `sauces-oils.webp`, **no text in images**.
- Product card (shared with category pages — lands here, reviewed again in the "other pages" step):
  brand eyebrow, 2-line name, price + unit price, full-width "Do koszyka" (Frisco), badges slot.

## 4. Architecture

- `src/app/[locale]/(shop)/page.tsx` is 1 407 lines with ADG branches. New sections become
  components in `src/components/home/` (`UspStrip`, `HeroSlides`, `CategoryRow`, `CuisineCards`,
  `ProductRail`, `PickupSteps`, `StoreInfo`, `BrandChips`, `AboutCollapsible`); page.tsx only orders them.
- Config: extend `homepage` with typed sections (`usp`, `cuisines`, `rails[]` {title, source:
  ids|leaves|country|brand, ids?, limit}, `pickupSteps`, `storeInfo`, `brands[]`); hero slides gain
  `headline/subline/ctaText/ctaLink` (fields exist, unused) + text-free art. Defaults in
  `storefront-config-shared.ts`, zod in admin `validation.ts`, EN copy in `configured-content-localization.ts`.
- Rails reuse the existing products GraphQL query with filters; one server fetch per rail, cached
  like today's Polecane; diversity rule in a pure, unit-tested helper.
- Admin: phase 3 adds editors for hero text, Polecane product picker, rails and USP copy; until then
  config edits are JSON (same as wave 2).
- Non-ADG tenants keep today's page (sections are opt-in by config).

## 5. Phases (each ends with a dev preview + screenshots for Paul)

| Phase | Content | Size |
|---|---|---|
| A | USP strip (P1) · hero HTML overlay + 4:3 mobile + real CTAs (art reused, text-free crops) (P2) · Kategorie = 10 tree groups, scroll row (P4) · Polecane diversity + curated IDs (P3) · About collapsible + footer payments (P7) · visual tokens | M |
| B | Kuchnie Azji · Jak działa odbiór · Sklep i odbiór · country rails · Na szybki obiad · Popularne marki (P5, P6) | M |
| C | New art: 4 hero backgrounds + mobile crops, 5 cuisine photos · admin editors · product card refresh | M–L |

Tests: node unit tests for the diversity helper and config defaults; contract test (config ↔ admin
copies, every link = live slug, no text-baked hero art: mobile art ratio ≤ 1.5); Playwright
(iphone-12 + desktop) per section incl. "USP strip items share one height and the strip is ≤ 90 px
on 390 px", "no section above the first rail exceeds 60 % of the viewport"; update existing specs
that pin the old blocks. Baseline reds on trunk stay as listed in the wave-2 ledger.

## 6. Decisions taken without asking (Paul: "tự duyệt")

- No fake social proof / Nowości / Promocje until data exists — cost: the page is a bit shorter.
- Brand wordmarks as text, not logos — trademark safety; cost: less visual.
- Store photo only when the owner sends one.
- P24 stays in sandbox (Paul 28/09: not announced yet, waiting for the owner).

Open (nice-to-have, not blocking): does the shop have a Google Business profile, Instagram/Facebook,
a real storefront photo, and are the hours Pon–Sob 7:00–19:00 correct?
