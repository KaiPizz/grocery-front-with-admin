# ADG wave 2 — 2-level category tree + landing page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (main session writes the code; the data script rewrites the Asia Deli Go catalog, so every DB step is dry-run first). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the approved 10-group × 54-leaf Asia Deli Go category tree in the eNail DB (`categories.parent_id`), re-tag products onto leaves and fix junk `storage_zone`/`brand` values with one idempotent, backed-up script; then make the storefront read the tree from GraphQL (adapter, group/leaf pages with a sidebar tree, 2-level mega menu, mobile accordion, 301s, sitemap) and rebuild the landing page (trust row from config, group tiles re-pointed, "Polecane" instead of "Nowości", SEO text), with the admin panel able to edit the new config fields.

**Architecture:** Backend: no schema change and no runtime change — one script under `backend/src/scripts/adg/` built from pure planner functions (`planCategoryTree`, `planProductChanges`) unit-tested with Jest, plus an executor that snapshots the salon into `adg_category_backup_<ts>_*` tables and applies all ops in one transaction (`--dry-run`, `--apply`, `--restore <ts>`). Storefront: `src/lib/public-taxonomy.ts` becomes a tree adapter over the flat `categories` GraphQL list (`parent { id }`, `level`, `displayOrder`, `translation(languageCode: "en") { name }`); `buildPublicCategories`/`findPublicCategory` keep their signatures, groups get `children`, leaves get `parent`; URLs stay flat `/categories/<slug>`; listings keep sending the group's leaf ids through `filter.categories` (exact-match filter in `storefront-product.service.ts:552`, unchanged). Landing content comes from new optional config fields with defaults in `withStorefrontConfigDefaults`, mirrored in the admin panel schema/editors.

**Tech Stack:** NestJS 10 + TypeORM + Jest + ts-node (backend); Next 16 App Router, React 19, next-intl, urql, Playwright, node `--test` (storefront, Node 22 type stripping); admin-panel (Next, `tsx --test`).

**Spec:** `docs/superpowers/specs/2026-09-27-adg-category-tree-and-landing-design.md` (approved tree in §2; data facts in `/var/tmp/rf-build/claude-1000/-var-www-www-enail/34fe6b74-5a73-46aa-9385-bb31d62bec5d/scratchpad/cat_counts.txt` and `adg-category-tree-draft.md`). Wave 1 conventions: `docs/superpowers/plans/2026-09-27-adg-cuisines-lean-filters.md`.

## Global Constraints

- Salon scope: every SQL statement of the script carries `salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'` (constant `ADG_SALON_ID`, also written in `category-tree.json`; the planner refuses a tree file whose `salonId` differs). Visible products = `status = 'active' AND is_active AND is_visible AND deleted_at IS NULL` (1 779 on dev at plan time).
- `categories` slug uniqueness is per salon (`@Index(["salonId","slug"], {unique:true})`); the old leaf `dania-gotowe` must be renamed to `dania-gotowe-i-curry` BEFORE the group `dania-gotowe` is inserted (op ordering in Task 1).
- `CategoryService.create/update` (`backend/src/modules/product/services/category.service.ts`) does NOT maintain `path`/`level`; the entity documents `path` as `/uuid1/uuid2/`. The script writes `level` 0/1 and `path` `/<groupId>/` and `/<groupId>/<leafId>/` explicitly; the storefront adapter derives leaf-ness from `parent.id` presence, never from `level` alone, so later dashboard edits cannot break the tree.
- The storefront `categories` query only returns `is_active = true` rows ordered by `display_order, name` (`storefront-category.service.ts:56-78`), `first: 200`.
- `translation(languageCode: "en") { name }` on `Category` is backed by `name_translations.en` (`translation.service.ts:105`) and falls back to `name`; the adapter still keeps an EN fallback table for the 10 groups in `PUBLIC_CATEGORY_DEFINITIONS`.
- The storefront `ProductFilterInput` (`backend/src/modules/storefront-api/inputs/product-filter.input.ts`) has `categories`, `brands`, `search`, price — no `ids`/`slugs`; the storefront `Product` type does not expose `createdAt`. Hence "Polecane" is driven by featured LEAF slugs (config `homepage.featured.categorySlugs`, fixed code fallback for ADG), not by product ids nor by a created-date check (see Task 7).
- `product-retag.json` is a data input produced separately (array of `{ "productId": "<uuid>", "leaf": "<leaf slug>" }`); the code never depends on its content. Unknown leaf slug or unknown/foreign product id aborts the run before any write.
- Idempotency: a second `--apply` must plan 0 ops (Task 3 asserts it on dev).
- Deploy tree `/var/www/www/enail` is never edited. Backend work happens in `/var/www/www/enail/.worktrees/adg-category-tree` created by `scripts/session.sh start feat/adg-category-tree --purpose "ADG 2-level category tree data script"`; every backend commit message ends with the trailer line `Session: adg-category-tree (claude)`.
- eNail Jest: always one spec file with `--maxWorkers=1` (package.json sets `maxWorkers: 4`; never run the whole suite).
- Dev DB writes are fine (`docker exec enail-postgres psql -U enail -d enail`); production apply only after Paul's explicit OK and only with the backup step (Task 10).
- Storefront: never edit files while a Playwright run is in progress; one Playwright run at a time (ports 3018/4199); `catalog-display-localization.regression-1.spec.ts` runs only on `pixel-7`; urql `cacheExchange` returns cached results for repeated variables (use distinct variables per assertion); WebKit exposes SSR buttons before hydration (poll/retry like `tests/cuisines-menu.spec.ts`); server-rendered pages fetch GraphQL from `tests/config-server.mjs` (port 4199), client-side fetches are intercepted by `mockMobileStorefront` — both fixtures must carry the new category fields.
- Hook `pre-git-safety` blocks compound shell commands containing git mutation words: run single `git -C <root> <cmd>` commands, never `cd x && git …`. Hook `pre-sql-safety` blocks any command text containing the SQL verb that empties a table (it also matches the Tailwind class of the same name) — use `line-clamp-1` in new JSX and never paste that word into a shell command.
- Locales `pl` (default, no prefix) and `en`; every new UI string lands in both `src/messages/pl.json` and `src/messages/en.json`.
- Kenmito and the generic tenant must keep their current landing (`HomeFulfillmentTrust` non-guided branch, "Nowości"); new behaviour is gated on config fields present only in the ADG config (or the ADG brand fallback).
- No push/merge/deploy/production migration in this plan except the owner-run steps listed in Task 10.

## Review Focus

1. Second `--apply` on the same DB plans 0 ops and creates no backup table; after the first apply the verification SQL holds (sum of leaf counts = 1 779, 0 products on level-0 categories, 0 categories with level ≥ 2, 0 duplicate slugs). Pinned in Task 1 (`apply-category-tree.lib.spec.ts`, "second run plans nothing") and Task 3 Steps 5–6.
2. The script touches only salon `e73271a9…`: fixtures contain a foreign-salon category with the same slug and it must appear in no op. Pinned in Task 1 ("ignores other salons").
3. A group page sends exactly its leaf ids in `filter.categories` (never the group id), a leaf page sends exactly its own id, a leafless group lists its own id. Pinned in Task 4 (`category-tree.test.mjs`, "leafless group lists its own id") and Task 5 (`category-tree-pages.spec.ts`, "group page filters by leaf ids").
4. `/categories/sosy-pasty-i-przyprawy` (pl and `/en/`) answers 301 to `sosy-i-oleje`, `sushi-i-algi` and `grzyby-warzywa-i-tofu` to `do-gotowania-i-sushi`, and a renamed leaf (`ramyun-ramen`) permanently redirects to `ramyun-w-paczce`. Pinned in Task 5 ("old group and leaf slugs redirect").
5. With the ADG config the landing shows the 4-item trust row and the "Polecane" heading fed by the featured leaves; with the generic config it still shows "Nowości" and no trust row. Pinned in Task 7 (`landing-wave2.spec.ts`, "generic storefront keeps Nowości and has no trust row or seo text").

---

### Task 1: Backend planner library — `planCategoryTree` + `category-tree.json`

**Files:**
- Create: `backend/src/scripts/adg/category-tree.json`
- Create: `backend/src/scripts/adg/apply-category-tree.lib.ts`
- Test: `backend/src/scripts/adg/apply-category-tree.lib.spec.ts`

(All backend paths under `/var/www/www/enail/.worktrees/adg-category-tree/`.)

**Interfaces:**
- Consumes: `category-tree.json` shape `CategoryTreeFile = { salonId: string; groups: TreeGroup[] }`, `TreeGroup = { slug; name; nameEn; displayOrder; leaves: TreeLeaf[] }`, `TreeLeaf = { slug; name; nameEn; displayOrder; from?: string; mergeFrom?: string[] }` (`from` = existing row reused, id kept; `mergeFrom` = existing rows whose products move into this leaf and which are then deactivated).
- Consumes: `ExistingCategory = { id: string; salonId: string; slug: string | null; name: string; parentId: string | null; level: number; isActive: boolean; nameTranslations: Record<string, string>; displayOrder: number; productCount: number }` (`productCount` counts products of any status with `deleted_at IS NULL`).
- Produces: `planCategoryTree(existing: ExistingCategory[], tree: CategoryTreeFile): CategoryOp[]` with
  `CategoryOp = { type: 'rename_leaf'; id; slug; name; nameTranslations; displayOrder } | { type: 'create_group'; id; slug; name; nameTranslations; displayOrder } | { type: 'normalize_group'; id; name; nameTranslations; displayOrder } | { type: 'create_leaf'; id; groupSlug; slug; name; nameTranslations; displayOrder } | { type: 'reparent_leaf'; id; groupSlug } | { type: 'merge_leaf'; fromId; fromSlug; intoSlug } | { type: 'deactivate'; id; slug }`, emitted in exactly that type order (rename → create_group → normalize_group → create_leaf → reparent → merge → deactivate). New ids come from `randomUUID()` so the executor can write `path` immediately.
- Throws `PlanError` when: two leaves share a slug; a `from`/`mergeFrom` slug is missing in the DB; an active salon category not referenced by the tree still has products (`productCount > 0`); `tree.salonId !== ADG_SALON_ID`.

Mapping decisions (written into `category-tree.json`, the single source of truth for old → new):

| old row (slug) | becomes | note |
|---|---|---|
| `dania-gotowe` | leaf `dania-gotowe-i-curry` | slug collision with group `dania-gotowe`: the LEAF keeps the row id; the GROUP is a new row |
| `napoje` | leaf `soki-herbaty-gotowe-i-napoje-owocowe` | largest drink bucket keeps the row; `napoje-gazowane`, `napoje-mleczne-i-probiotyczne` are new rows fed by `product-retag.json` |
| `słodycze-przekąski` | leaf `ciastka-wafle-i-choco-pie` | largest sweets bucket keeps the row; the other 6 sweets leaves are new rows |
| `sosy-marynaty` | leaf `majonez-ketchup-i-inne-sosy` (merges `sosy-marynaty-oleje`) | remainder bucket keeps the row; `sosy-rybne-i-ostrygowe`, `sosy-ostre-i-chili`, `sosy-do-sushi-teriyaki-i-ponzu` are new rows |
| `koreańskie-kosmetyki` | leaf `kremy-i-serum` | largest cosmetics bucket keeps the row; `maseczki`, `oczyszczanie`, `filtry-uv-i-zele-aloesowe` are new |
| `ramyun-ramen` | `ramyun-w-paczce`; `duża-micha` → `ramyun-w-kubku-i-misce`; `buldak-i-ramyun-ostre` new | |
| 22 merge sources | deactivated after their products move | `makaron-gryczany`, `makarony` → `makaron-pszenny-udon-i-soba`; `makaron-szklisty` → `makaron-ryzowy-i-szklisty`; `japońskie-ciasto-ryżowe` → `kluski-tteok-i-mochi-ryzowe`; `sosy-marynaty-oleje` → `majonez-ketchup-i-inne-sosy`; `przyprawy-jednoskładnikowe` → `przyprawy-i-furikake`; `ocet-ryżowy-do-sushi` → `octy`; `sezam`, `sól` → `wasabi-sezam-i-sol`; `syropy` → `kawy-i-syropy`; `wakame-miyeok`, `kombu-dasima` → `algi-nori-wakame-kombu`; `grzyby-mun`, `inne-grzyby-azjatyckie` → `grzyby-suszone`; `miski`, `naczynia`, `zaparzacze-do-kawy` → `miski-kubki-i-naczynia`; `maty-do-zwijania`, `foremki`, `zestawy-do-sushi`, `moździerze` → `parowary-maty-foremki-i-zestawy-do-sushi`; `prezenty` → `prezenty-i-gadzety` |

38 reused rows + 16 new leaves = 54 leaves; 10 new group rows; 22 merged rows deactivated; the ~12 active zero-product categories not in the tree get `deactivate`. Retag rows (`product-retag.json`) are applied AFTER merges, so a retag decision always wins over a merge.

- [ ] **Step 1: Write `category-tree.json`** (full file; `displayOrder` = position):

```json
{
  "salonId": "e73271a9-53e3-4a20-a02e-791726b452aa",
  "groups": [
    { "slug": "makaron-i-ryz", "name": "Makaron i ryż", "nameEn": "Noodles and rice", "displayOrder": 0, "leaves": [
      { "slug": "ramyun-w-paczce", "name": "Ramyun w paczce", "nameEn": "Ramyun in a pack", "displayOrder": 0, "from": "ramyun-ramen" },
      { "slug": "ramyun-w-kubku-i-misce", "name": "Ramyun w kubku i misce", "nameEn": "Cup and bowl ramyun", "displayOrder": 1, "from": "duża-micha" },
      { "slug": "buldak-i-ramyun-ostre", "name": "Buldak i ramyun ostre", "nameEn": "Buldak and spicy ramyun", "displayOrder": 2 },
      { "slug": "makaron-pszenny-udon-i-soba", "name": "Makaron pszenny, udon i soba", "nameEn": "Wheat noodles, udon and soba", "displayOrder": 3, "from": "makaron-pszenny", "mergeFrom": ["makaron-gryczany", "makarony"] },
      { "slug": "makaron-ryzowy-i-szklisty", "name": "Makaron ryżowy i szklisty", "nameEn": "Rice and glass noodles", "displayOrder": 4, "from": "makaron-ryżowy", "mergeFrom": ["makaron-szklisty"] },
      { "slug": "makaron-konjac", "name": "Makaron konjac", "nameEn": "Konjac noodles", "displayOrder": 5, "from": "makaron-konjac" },
      { "slug": "kluski-tteok-i-mochi-ryzowe", "name": "Kluski tteok i mochi ryżowe", "nameEn": "Tteok rice cakes and mochi", "displayOrder": 6, "from": "kluski-tteok-do-dań", "mergeFrom": ["japońskie-ciasto-ryżowe"] },
      { "slug": "ryz-i-ziarna", "name": "Ryż i ziarna", "nameEn": "Rice and grains", "displayOrder": 7, "from": "ryż-i-inne-ziarna" }
    ] },
    { "slug": "sosy-i-oleje", "name": "Sosy i oleje", "nameEn": "Sauces and oils", "displayOrder": 1, "leaves": [
      { "slug": "sos-sojowy", "name": "Sos sojowy", "nameEn": "Soy sauce", "displayOrder": 0, "from": "sos-sojowy" },
      { "slug": "sosy-rybne-i-ostrygowe", "name": "Sosy rybne i ostrygowe", "nameEn": "Fish and oyster sauces", "displayOrder": 1 },
      { "slug": "sosy-ostre-i-chili", "name": "Sosy ostre i chili", "nameEn": "Hot and chili sauces", "displayOrder": 2 },
      { "slug": "sosy-do-sushi-teriyaki-i-ponzu", "name": "Sosy do sushi, teriyaki i ponzu", "nameEn": "Sushi, teriyaki and ponzu sauces", "displayOrder": 3 },
      { "slug": "majonez-ketchup-i-inne-sosy", "name": "Majonez, ketchup i inne sosy", "nameEn": "Mayonnaise, ketchup and other sauces", "displayOrder": 4, "from": "sosy-marynaty", "mergeFrom": ["sosy-marynaty-oleje"] },
      { "slug": "oleje", "name": "Oleje", "nameEn": "Oils", "displayOrder": 5, "from": "oleje" }
    ] },
    { "slug": "pasty-przyprawy-i-buliony", "name": "Pasty, przyprawy i buliony", "nameEn": "Pastes, spices and stocks", "displayOrder": 2, "leaves": [
      { "slug": "pasty-gochujang-curry-hot-pot", "name": "Pasty: gochujang, curry, hot pot", "nameEn": "Pastes: gochujang, curry, hot pot", "displayOrder": 0, "from": "pasty-smakowe" },
      { "slug": "pasta-miso", "name": "Pasta miso", "nameEn": "Miso paste", "displayOrder": 1, "from": "pasta-miso" },
      { "slug": "przyprawy-i-furikake", "name": "Przyprawy i furikake", "nameEn": "Spices and furikake", "displayOrder": 2, "from": "przyprawy", "mergeFrom": ["przyprawy-jednoskładnikowe"] },
      { "slug": "octy", "name": "Octy", "nameEn": "Vinegars", "displayOrder": 3, "from": "octy-i-winne-przyprawy", "mergeFrom": ["ocet-ryżowy-do-sushi"] },
      { "slug": "buliony-i-dashi", "name": "Buliony i dashi", "nameEn": "Stocks and dashi", "displayOrder": 4, "from": "buliony" },
      { "slug": "wasabi-sezam-i-sol", "name": "Wasabi, sezam i sól", "nameEn": "Wasabi, sesame and salt", "displayOrder": 5, "from": "wasabi", "mergeFrom": ["sezam", "sól"] }
    ] },
    { "slug": "kimchi-i-kiszonki", "name": "Kimchi i kiszonki", "nameEn": "Kimchi and pickles", "displayOrder": 3, "leaves": [
      { "slug": "kimchi", "name": "Kimchi", "nameEn": "Kimchi", "displayOrder": 0, "from": "kimchi" },
      { "slug": "marynowane-warzywa-i-owoce", "name": "Marynowane warzywa i owoce", "nameEn": "Pickled vegetables and fruit", "displayOrder": 1, "from": "owoce-marynowane-warzywa" },
      { "slug": "imbir-marynowany", "name": "Imbir marynowany", "nameEn": "Pickled ginger", "displayOrder": 2, "from": "imbir-marynowany" }
    ] },
    { "slug": "przekaski-i-slodycze", "name": "Przekąski i słodycze", "nameEn": "Snacks and sweets", "displayOrder": 4, "leaves": [
      { "slug": "chipsy-i-krakersy", "name": "Chipsy i krakersy", "nameEn": "Chips and crackers", "displayOrder": 0 },
      { "slug": "ciastka-wafle-i-choco-pie", "name": "Ciastka, wafle i Choco Pie", "nameEn": "Cookies, wafers and Choco Pie", "displayOrder": 1, "from": "słodycze-przekąski" },
      { "slug": "pocky-pepero-i-czekolada", "name": "Pocky, Pepero i czekolada", "nameEn": "Pocky, Pepero and chocolate", "displayOrder": 2 },
      { "slug": "zelki-i-cukierki", "name": "Żelki i cukierki", "nameEn": "Gummies and candy", "displayOrder": 3 },
      { "slug": "mochi-orzechy-i-suszone-owoce", "name": "Mochi, orzechy i suszone owoce", "nameEn": "Mochi, nuts and dried fruit", "displayOrder": 4 },
      { "slug": "przekaski-z-alg", "name": "Przekąski z alg", "nameEn": "Seaweed snacks", "displayOrder": 5 },
      { "slug": "przekaski-slone-azjatyckie", "name": "Przekąski słone azjatyckie", "nameEn": "Savory Asian snacks", "displayOrder": 6 }
    ] },
    { "slug": "napoje-herbaty-i-kawy", "name": "Napoje, herbaty i kawy", "nameEn": "Drinks, tea and coffee", "displayOrder": 5, "leaves": [
      { "slug": "herbaty", "name": "Herbaty", "nameEn": "Teas", "displayOrder": 0, "from": "herbaty" },
      { "slug": "kawy-i-syropy", "name": "Kawy i syropy", "nameEn": "Coffee and syrups", "displayOrder": 1, "from": "kawy", "mergeFrom": ["syropy"] },
      { "slug": "napoje-gazowane", "name": "Napoje gazowane", "nameEn": "Soft drinks", "displayOrder": 2 },
      { "slug": "soki-herbaty-gotowe-i-napoje-owocowe", "name": "Soki, herbaty gotowe i napoje owocowe", "nameEn": "Juices, ready teas and fruit drinks", "displayOrder": 3, "from": "napoje" },
      { "slug": "napoje-mleczne-i-probiotyczne", "name": "Napoje mleczne i probiotyczne", "nameEn": "Milk and probiotic drinks", "displayOrder": 4 }
    ] },
    { "slug": "dania-gotowe", "name": "Dania gotowe i zupy instant", "nameEn": "Ready meals and instant soups", "displayOrder": 6, "leaves": [
      { "slug": "dania-gotowe-i-curry", "name": "Dania gotowe i curry", "nameEn": "Ready meals and curry", "displayOrder": 0, "from": "dania-gotowe" },
      { "slug": "zupy-instant", "name": "Zupy instant: pho, tom yum, pad thai", "nameEn": "Instant soups: pho, tom yum, pad thai", "displayOrder": 1 }
    ] },
    { "slug": "do-gotowania-i-sushi", "name": "Do gotowania i sushi", "nameEn": "Cooking and sushi essentials", "displayOrder": 7, "leaves": [
      { "slug": "algi-nori-wakame-kombu", "name": "Algi: nori, wakame, kombu", "nameEn": "Seaweed: nori, wakame, kombu", "displayOrder": 0, "from": "arkusze-nori-gim", "mergeFrom": ["wakame-miyeok", "kombu-dasima"] },
      { "slug": "grzyby-suszone", "name": "Grzyby suszone", "nameEn": "Dried mushrooms", "displayOrder": 1, "from": "grzyby-shiitake", "mergeFrom": ["grzyby-mun", "inne-grzyby-azjatyckie"] },
      { "slug": "tofu", "name": "Tofu", "nameEn": "Tofu", "displayOrder": 2, "from": "tofu" },
      { "slug": "maki-panierki-i-tapioka", "name": "Mąki, panierki i tapioka", "nameEn": "Flours, breading and tapioca", "displayOrder": 3, "from": "mąki-panierki-tapioka" },
      { "slug": "mleczko-kokosowe", "name": "Mleczko kokosowe", "nameEn": "Coconut milk", "displayOrder": 4, "from": "mleczko-kokosowe" },
      { "slug": "papier-ryzowy", "name": "Papier ryżowy", "nameEn": "Rice paper", "displayOrder": 5, "from": "papier-ryżowy" }
    ] },
    { "slug": "akcesoria-kuchenne", "name": "Akcesoria kuchenne", "nameEn": "Kitchen accessories", "displayOrder": 8, "leaves": [
      { "slug": "paleczki-i-sztucce", "name": "Pałeczki i sztućce", "nameEn": "Chopsticks and cutlery", "displayOrder": 0, "from": "pałeczki-i-sztućce" },
      { "slug": "noze", "name": "Noże", "nameEn": "Knives", "displayOrder": 1, "from": "noże" },
      { "slug": "patelnie-wok-i-grill", "name": "Patelnie wok i grill", "nameEn": "Woks and grill pans", "displayOrder": 2, "from": "patelnie-wok-grill" },
      { "slug": "patelnie-tamago", "name": "Patelnie tamago", "nameEn": "Tamago pans", "displayOrder": 3, "from": "patelnie-tamago" },
      { "slug": "miski-kubki-i-naczynia", "name": "Miski, kubki i naczynia", "nameEn": "Bowls, cups and tableware", "displayOrder": 4, "from": "komplety-do-sushi-i-herbaty", "mergeFrom": ["miski", "naczynia", "zaparzacze-do-kawy"] },
      { "slug": "parowary-maty-foremki-i-zestawy-do-sushi", "name": "Parowary, maty, foremki i zestawy do sushi", "nameEn": "Steamers, mats, molds and sushi kits", "displayOrder": 5, "from": "parowary-bambusowe", "mergeFrom": ["maty-do-zwijania", "foremki", "zestawy-do-sushi", "moździerze"] },
      { "slug": "prezenty-i-gadzety", "name": "Prezenty i gadżety", "nameEn": "Gifts and gadgets", "displayOrder": 6, "from": "koty-szczęścia-i-inne-gadżety", "mergeFrom": ["prezenty"] }
    ] },
    { "slug": "kosmetyki-koreanskie", "name": "Kosmetyki koreańskie", "nameEn": "Korean cosmetics", "displayOrder": 9, "leaves": [
      { "slug": "maseczki", "name": "Maseczki", "nameEn": "Sheet masks", "displayOrder": 0 },
      { "slug": "kremy-i-serum", "name": "Kremy i serum", "nameEn": "Creams and serums", "displayOrder": 1, "from": "koreańskie-kosmetyki" },
      { "slug": "oczyszczanie", "name": "Oczyszczanie", "nameEn": "Cleansing", "displayOrder": 2 },
      { "slug": "filtry-uv-i-zele-aloesowe", "name": "Filtry UV i żele aloesowe", "nameEn": "Sunscreens and aloe gels", "displayOrder": 3 }
    ] }
  ]
}
```

- [ ] **Step 2: Write the failing spec** `apply-category-tree.lib.spec.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADG_SALON_ID,
  PlanError,
  planCategoryTree,
  type CategoryOp,
  type CategoryTreeFile,
  type ExistingCategory,
} from "./apply-category-tree.lib";

const OTHER_SALON = "11111111-1111-4111-8111-111111111111";
const tree = JSON.parse(readFileSync(join(__dirname, "category-tree.json"), "utf8")) as CategoryTreeFile;

function row(override: Partial<ExistingCategory> & { slug: string }): ExistingCategory {
  return {
    id: `id-${override.slug}`,
    salonId: ADG_SALON_ID,
    name: override.slug,
    parentId: null,
    level: 0,
    isActive: true,
    nameTranslations: {},
    displayOrder: 0,
    productCount: 1,
    ...override,
  };
}

// The 60 flat leaves of the dev mirror, by slug (name = slug is enough for the planner).
const FLAT_SLUGS = [
  "słodycze-przekąski", "ramyun-ramen", "sosy-marynaty", "napoje", "pasty-smakowe", "herbaty", "przyprawy",
  "dania-gotowe", "komplety-do-sushi-i-herbaty", "sos-sojowy", "ryż-i-inne-ziarna", "owoce-marynowane-warzywa",
  "koreańskie-kosmetyki", "kawy", "makaron-pszenny", "pałeczki-i-sztućce", "mąki-panierki-tapioka",
  "octy-i-winne-przyprawy", "buliony", "oleje", "noże", "sosy-marynaty-oleje", "patelnie-wok-grill",
  "mleczko-kokosowe", "pasta-miso", "kimchi", "makaron-ryżowy", "kluski-tteok-do-dań", "tofu", "makaron-konjac",
  "sezam", "arkusze-nori-gim", "imbir-marynowany", "makaron-szklisty", "papier-ryżowy", "wasabi", "grzyby-shiitake",
  "miski", "duża-micha", "wakame-miyeok", "parowary-bambusowe", "patelnie-tamago", "przyprawy-jednoskładnikowe",
  "syropy", "kombu-dasima", "koty-szczęścia-i-inne-gadżety", "maty-do-zwijania", "grzyby-mun", "foremki",
  "moździerze", "inne-grzyby-azjatyckie", "sól", "naczynia", "zaparzacze-do-kawy", "prezenty", "makarony",
  "makaron-gryczany", "zestawy-do-sushi", "japońskie-ciasto-ryżowe", "ocet-ryżowy-do-sushi",
];

function flatDb(): ExistingCategory[] {
  return [
    ...FLAT_SLUGS.map((slug) => row({ slug })),
    row({ slug: "pozostałe-produkty", productCount: 0 }),
    row({ slug: "dania-gotowe", id: "foreign-dania", salonId: OTHER_SALON }),
  ];
}

// Pure in-memory replay of the ops so the idempotency test does not need a DB.
function applyPlanToFixture(db: ExistingCategory[], ops: CategoryOp[]): ExistingCategory[] {
  const rows = new Map(db.map((r) => [r.id, { ...r }]));
  const idBySlug = () => new Map([...rows.values()].filter((r) => r.salonId === ADG_SALON_ID).map((r) => [r.slug, r.id]));
  for (const op of ops) {
    switch (op.type) {
      case "rename_leaf": Object.assign(rows.get(op.id)!, { slug: op.slug, name: op.name, nameTranslations: op.nameTranslations, displayOrder: op.displayOrder, isActive: true }); break;
      case "create_group": rows.set(op.id, row({ id: op.id, slug: op.slug, name: op.name, nameTranslations: op.nameTranslations, displayOrder: op.displayOrder, productCount: 0 })); break;
      case "normalize_group": Object.assign(rows.get(op.id)!, { name: op.name, nameTranslations: op.nameTranslations, displayOrder: op.displayOrder, parentId: null, level: 0, isActive: true }); break;
      case "create_leaf": rows.set(op.id, row({ id: op.id, slug: op.slug, name: op.name, nameTranslations: op.nameTranslations, displayOrder: op.displayOrder, parentId: idBySlug().get(op.groupSlug)!, level: 1, productCount: 0 })); break;
      case "reparent_leaf": Object.assign(rows.get(op.id)!, { parentId: idBySlug().get(op.groupSlug)!, level: 1 }); break;
      case "merge_leaf": { const from = rows.get(op.fromId)!; const into = rows.get(idBySlug().get(op.intoSlug)!)!; into.productCount += from.productCount; from.productCount = 0; from.isActive = false; break; }
      case "deactivate": rows.get(op.id)!.isActive = false; break;
    }
  }
  return [...rows.values()];
}

describe("planCategoryTree", () => {
  it("creates 10 groups, reuses 38 rows, creates 16 leaves, merges 22 and deactivates the empty stray", () => {
    const ops = planCategoryTree(flatDb(), tree);
    const count = (type: CategoryOp["type"]) => ops.filter((op) => op.type === type).length;
    expect(count("create_group")).toBe(10);
    expect(count("rename_leaf")).toBe(38);
    expect(count("create_leaf")).toBe(16);
    expect(count("reparent_leaf")).toBe(38);
    expect(count("merge_leaf")).toBe(22);
    expect(count("deactivate")).toBe(1);
    expect(ops.find((op) => op.type === "deactivate")).toMatchObject({ slug: "pozostałe-produkty" });
  });

  it("renames the old dania-gotowe leaf before creating the dania-gotowe group", () => {
    const ops = planCategoryTree(flatDb(), tree);
    const rename = ops.findIndex((op) => op.type === "rename_leaf" && op.slug === "dania-gotowe-i-curry");
    const create = ops.findIndex((op) => op.type === "create_group" && op.slug === "dania-gotowe");
    expect(rename).toBeGreaterThanOrEqual(0);
    expect(create).toBeGreaterThan(rename);
    expect(ops[rename]).toMatchObject({ id: "id-dania-gotowe" });
  });

  it("writes pl and en name translations on every created or renamed row", () => {
    for (const op of planCategoryTree(flatDb(), tree)) {
      if (op.type === "create_group" || op.type === "create_leaf" || op.type === "rename_leaf") {
        expect(op.nameTranslations.pl).toBe(op.name);
        expect(op.nameTranslations.en.length).toBeGreaterThan(0);
      }
    }
  });

  it("ignores other salons", () => {
    const ops = planCategoryTree(flatDb(), tree);
    expect(ops.some((op) => "id" in op && op.id === "foreign-dania")).toBe(false);
    expect(ops.some((op) => op.type === "merge_leaf" && op.fromId === "foreign-dania")).toBe(false);
  });

  it("second run plans nothing", () => {
    const after = applyPlanToFixture(flatDb(), planCategoryTree(flatDb(), tree));
    expect(planCategoryTree(after, tree)).toEqual([]);
  });

  it("refuses to drop an unreferenced category that still has products", () => {
    const db = [...flatDb(), row({ slug: "kategoria-x", productCount: 3 })];
    expect(() => planCategoryTree(db, tree)).toThrow(PlanError);
    expect(() => planCategoryTree(db, tree)).toThrow(/kategoria-x/);
  });

  it("refuses a tree whose salonId differs from ADG_SALON_ID", () => {
    expect(() => planCategoryTree(flatDb(), { ...tree, salonId: OTHER_SALON })).toThrow(PlanError);
  });
});
```
- [ ] **Step 2b: Run** `cd /var/www/www/enail/.worktrees/adg-category-tree/backend && npx jest src/scripts/adg/apply-category-tree.lib.spec.ts --maxWorkers=1`
  `Expected: FAIL — Cannot find module './apply-category-tree.lib'`
- [ ] **Step 3: Implement the planner** in `apply-category-tree.lib.ts` (planner part; the executor functions are appended in Task 2 in the same file):

```ts
import { randomUUID } from "node:crypto";

export const ADG_SALON_ID = "e73271a9-53e3-4a20-a02e-791726b452aa";

export interface TreeLeaf { slug: string; name: string; nameEn: string; displayOrder: number; from?: string; mergeFrom?: string[] }
export interface TreeGroup { slug: string; name: string; nameEn: string; displayOrder: number; leaves: TreeLeaf[] }
export interface CategoryTreeFile { salonId: string; groups: TreeGroup[] }

export interface ExistingCategory {
  id: string; salonId: string; slug: string | null; name: string; parentId: string | null; level: number;
  isActive: boolean; nameTranslations: Record<string, string>; displayOrder: number; productCount: number;
}

type Names = { name: string; nameTranslations: Record<string, string>; displayOrder: number };
export type CategoryOp =
  | ({ type: "rename_leaf"; id: string; slug: string } & Names)
  | ({ type: "create_group"; id: string; slug: string } & Names)
  | ({ type: "normalize_group"; id: string } & Names)
  | ({ type: "create_leaf"; id: string; groupSlug: string; slug: string } & Names)
  | { type: "reparent_leaf"; id: string; groupSlug: string }
  | { type: "merge_leaf"; fromId: string; fromSlug: string; intoSlug: string }
  | { type: "deactivate"; id: string; slug: string };

const OP_ORDER: CategoryOp["type"][] = ["rename_leaf", "create_group", "normalize_group", "create_leaf", "reparent_leaf", "merge_leaf", "deactivate"];

export class PlanError extends Error {}

function names(pl: string, en: string, displayOrder: number): Names {
  return { name: pl, nameTranslations: { pl, en }, displayOrder };
}

function sameNames(row: ExistingCategory, n: Names): boolean {
  return row.name === n.name && row.displayOrder === n.displayOrder
    && row.nameTranslations?.pl === n.nameTranslations.pl && row.nameTranslations?.en === n.nameTranslations.en;
}

/** Slug of the leaf that reuses the row whose old slug equals a group slug (dania-gotowe → dania-gotowe-i-curry). */
function leafSlugFor(tree: CategoryTreeFile, fromSlug: string): string | null {
  for (const g of tree.groups) for (const l of g.leaves) if (l.from === fromSlug) return l.slug;
  return null;
}

export function planCategoryTree(existing: ExistingCategory[], tree: CategoryTreeFile): CategoryOp[] {
  if (tree.salonId !== ADG_SALON_ID) throw new PlanError(`tree.salonId ${tree.salonId} is not ${ADG_SALON_ID}`);
  const rows = existing.filter((r) => r.salonId === ADG_SALON_ID);
  const bySlug = new Map<string, ExistingCategory>();
  for (const r of rows) if (r.slug) bySlug.set(r.slug, r);

  const leafSlugs = new Set<string>();
  const fromSlugs = new Set<string>();
  for (const g of tree.groups) for (const l of g.leaves) {
    if (leafSlugs.has(l.slug)) throw new PlanError(`duplicate leaf slug ${l.slug}`);
    leafSlugs.add(l.slug);
    if (l.from) fromSlugs.add(l.from);
  }

  const ops: CategoryOp[] = [];
  const referenced = new Set<string>(); // ids the tree keeps or handles
  const groupIdBySlug = new Map<string, string>();

  for (const g of tree.groups) {
    const n = names(g.name, g.nameEn, g.displayOrder);
    const candidate = bySlug.get(g.slug);
    // A row carrying the group slug but referenced as a leaf `from` (dania-gotowe) is still the LEAF as long as
    // the leaf's new slug does not exist yet; once dania-gotowe-i-curry exists, the dania-gotowe row is the group.
    const stillTheLeaf = candidate !== undefined && fromSlugs.has(g.slug) && !bySlug.has(leafSlugFor(tree, g.slug) ?? "");
    const groupRow = candidate && !stillTheLeaf ? candidate : undefined;
    if (!groupRow) {
      const id = randomUUID();
      ops.push({ type: "create_group", id, slug: g.slug, ...n });
      groupIdBySlug.set(g.slug, id);
    } else {
      groupIdBySlug.set(g.slug, groupRow.id);
      referenced.add(groupRow.id);
      if (!sameNames(groupRow, n) || groupRow.parentId !== null || groupRow.level !== 0 || !groupRow.isActive) {
        ops.push({ type: "normalize_group", id: groupRow.id, ...n });
      }
    }
  }

  for (const g of tree.groups) {
    const groupId = groupIdBySlug.get(g.slug)!;
    for (const l of g.leaves) {
      const n = names(l.name, l.nameEn, l.displayOrder);
      const leafRow = bySlug.get(l.slug) ?? (l.from ? bySlug.get(l.from) : undefined);
      if (l.from && !leafRow) throw new PlanError(`leaf ${l.slug}: from slug ${l.from} not found`);
      if (!leafRow) {
        ops.push({ type: "create_leaf", id: randomUUID(), groupSlug: g.slug, slug: l.slug, ...n });
      } else {
        referenced.add(leafRow.id);
        if (leafRow.slug !== l.slug || !sameNames(leafRow, n) || !leafRow.isActive) {
          ops.push({ type: "rename_leaf", id: leafRow.id, slug: l.slug, ...n });
        }
        if (leafRow.parentId !== groupId || leafRow.level !== 1) {
          ops.push({ type: "reparent_leaf", id: leafRow.id, groupSlug: g.slug });
        }
      }
      for (const src of l.mergeFrom ?? []) {
        const srcRow = bySlug.get(src);
        if (!srcRow) throw new PlanError(`leaf ${l.slug}: mergeFrom slug ${src} not found`);
        if (srcRow === leafRow) throw new PlanError(`leaf ${l.slug}: mergeFrom ${src} is the leaf itself`);
        referenced.add(srcRow.id);
        if (srcRow.isActive || srcRow.productCount > 0) {
          ops.push({ type: "merge_leaf", fromId: srcRow.id, fromSlug: src, intoSlug: l.slug });
        }
      }
    }
  }

  const strays = rows.filter((r) => r.isActive && !referenced.has(r.id));
  const blocking = strays.filter((r) => r.productCount > 0);
  if (blocking.length > 0) {
    throw new PlanError(`unreferenced categories still hold products: ${blocking.map((r) => `${r.slug} (${r.productCount})`).join(", ")}`);
  }
  for (const r of strays) ops.push({ type: "deactivate", id: r.id, slug: r.slug ?? r.id });

  return ops.sort((a, b) => OP_ORDER.indexOf(a.type) - OP_ORDER.indexOf(b.type));
}
```

  `Array.prototype.sort` is stable in Node ≥ 12, so ops of one type keep tree order.
- [ ] **Step 4: Run** the spec → `Expected: PASS (7 tests)`; `npx tsc -p tsconfig.json --noEmit` → clean.
- [ ] **Step 5: Commit** — `git -C /var/www/www/enail/.worktrees/adg-category-tree add backend/src/scripts/adg/category-tree.json backend/src/scripts/adg/apply-category-tree.lib.ts backend/src/scripts/adg/apply-category-tree.lib.spec.ts` then `git -C /var/www/www/enail/.worktrees/adg-category-tree commit -m "feat(adg): category tree planner + approved 10x54 tree file" -m "Session: adg-category-tree (claude)"`

### Task 2: Backend product planner + executor + CLI (`--dry-run`, `--apply`, `--restore`)

**Files:**
- Modify: `backend/src/scripts/adg/apply-category-tree.lib.ts` (append `planProductChanges`, `loadExistingCategories`, `loadProducts`, `backupTs`, `snapshotSalon`, `applyOps`, `restoreSnapshot`, `verifyTree`)
- Create: `backend/src/scripts/adg/apply-category-tree.ts` (CLI)
- Create: `backend/src/scripts/adg/product-retag.json` (placeholder `[]` until Paul's file lands; replaced in Task 3)
- Create: `backend/src/scripts/adg/product-hygiene.json` (placeholder `{ "storageZone": [], "brand": [] }`; generated in Task 3)
- Test: `backend/src/scripts/adg/apply-category-tree.lib.spec.ts` (add `planProductChanges` cases)

**Interfaces:**
- Consumes: `RetagRow = { productId: string; leaf: string }`; `HygieneFile = { storageZone: Array<{ productId: string; from: string; to: string }>; brand: Array<{ productId: string; from: string; to: string }> }`; `ExistingProduct = { id: string; salonId: string; categoryId: string | null; storageZone: string | null; brand: string | null }`.
- Produces: `planProductChanges(products: ExistingProduct[], retag: RetagRow[], hygiene: HygieneFile, leafIdBySlug: Map<string, string>): { ops: ProductOp[]; skipped: string[] }` with `ProductOp = { type: 'retag_product'; productId; fromCategoryId: string | null; toCategoryId: string } | { type: 'set_storage_zone'; productId; from; to } | { type: 'set_brand'; productId; from; to }`; throws `PlanError` on unknown leaf slug, unknown product id, or product of another salon. A hygiene row whose current value equals `to` is a no-op; one whose current value is neither `from` nor `to` is skipped and reported, so re-runs after a manual edit stay safe.
- Produces: `snapshotSalon(manager: EntityManager, salonId: string, ts: string)` creating `adg_category_backup_<ts>_categories` (`SELECT * FROM categories WHERE salon_id = $1`) and `adg_category_backup_<ts>_products` (`SELECT id, category_id, storage_zone, brand FROM products WHERE salon_id = $1`); `applyOps(manager, salonId, categoryOps, productOps)`; `restoreSnapshot(manager, salonId, ts)`; `verifyTree(manager, salonId): Promise<{ visibleTotal: number; leafSum: number; productsOnGroups: number; deepCategories: number; duplicateSlugs: number }>`.
- CLI: `npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --dry-run | --apply | --restore <ts>` (run from the backend dir; DB settings come from `@/config/typeorm.config`, the same DataSource `import-legacy-customer-addresses.ts` uses); exit code 0 only when the plan applied and `verifyTree` holds (`productsOnGroups = 0`, `deepCategories = 0`, `duplicateSlugs = 0`, `leafSum = visibleTotal`), otherwise the transaction is rolled back and exit code 1.
- Every SQL statement in the executor is a single line with its `WHERE salon_id = $1` clause on that same line (the repo's `pre-sql-safety` hook and reviewers read them line by line).

- [ ] **Step 1: Add the failing product-planner cases** to the spec (extend the import with `planProductChanges`):

```ts
describe("planProductChanges", () => {
  const leafIdBySlug = new Map([["kimchi", "leaf-kimchi"], ["buldak-i-ramyun-ostre", "leaf-buldak"]]);
  const products = [
    { id: "p1", salonId: ADG_SALON_ID, categoryId: "leaf-old", storageZone: "FROZEN", brand: "KAMEDA" },
    { id: "p2", salonId: ADG_SALON_ID, categoryId: "leaf-kimchi", storageZone: "CHILLED", brand: null },
    { id: "p3", salonId: OTHER_SALON, categoryId: "leaf-old", storageZone: null, brand: null },
  ];

  it("retags only products whose leaf changes and applies hygiene guarded by the current value", () => {
    const { ops, skipped } = planProductChanges(products, [
      { productId: "p1", leaf: "buldak-i-ramyun-ostre" },
      { productId: "p2", leaf: "kimchi" },
    ], {
      storageZone: [{ productId: "p1", from: "FROZEN", to: "AMBIENT" }, { productId: "p2", from: "AMBIENT", to: "CHILLED" }],
      brand: [{ productId: "p1", from: "KAMEDA", to: "Kameda" }],
    }, leafIdBySlug);
    expect(ops).toEqual([
      { type: "retag_product", productId: "p1", fromCategoryId: "leaf-old", toCategoryId: "leaf-buldak" },
      { type: "set_storage_zone", productId: "p1", from: "FROZEN", to: "AMBIENT" },
      { type: "set_brand", productId: "p1", from: "KAMEDA", to: "Kameda" },
    ]);
    expect(skipped).toEqual([]);
  });

  it("skips and reports a hygiene row whose current value drifted", () => {
    const { ops, skipped } = planProductChanges(products, [], {
      storageZone: [{ productId: "p2", from: "FROZEN", to: "AMBIENT" }], brand: [],
    }, leafIdBySlug);
    expect(ops).toEqual([]);
    expect(skipped).toEqual(["storage_zone p2: expected FROZEN, found CHILLED"]);
  });

  it("aborts on unknown leaf, unknown product, or a product of another salon", () => {
    const empty = { storageZone: [], brand: [] };
    expect(() => planProductChanges(products, [{ productId: "p1", leaf: "nope" }], empty, leafIdBySlug)).toThrow(/nope/);
    expect(() => planProductChanges(products, [{ productId: "missing", leaf: "kimchi" }], empty, leafIdBySlug)).toThrow(/missing/);
    expect(() => planProductChanges(products, [{ productId: "p3", leaf: "kimchi" }], empty, leafIdBySlug)).toThrow(/p3/);
  });
});
```
- [ ] **Step 2: Run** `npx jest src/scripts/adg/apply-category-tree.lib.spec.ts --maxWorkers=1` → `Expected: FAIL — planProductChanges is not a function`
- [ ] **Step 3: Implement** (append to the lib; add `import type { EntityManager } from "typeorm";` at the top):

```ts
export interface RetagRow { productId: string; leaf: string }
export interface HygieneRow { productId: string; from: string; to: string }
export interface HygieneFile { storageZone: HygieneRow[]; brand: HygieneRow[] }
export interface ExistingProduct { id: string; salonId: string; categoryId: string | null; storageZone: string | null; brand: string | null }
export type ProductOp =
  | { type: "retag_product"; productId: string; fromCategoryId: string | null; toCategoryId: string }
  | { type: "set_storage_zone"; productId: string; from: string; to: string }
  | { type: "set_brand"; productId: string; from: string; to: string };

export function planProductChanges(
  products: ExistingProduct[], retag: RetagRow[], hygiene: HygieneFile, leafIdBySlug: Map<string, string>,
): { ops: ProductOp[]; skipped: string[] } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const ops: ProductOp[] = [];
  const skipped: string[] = [];
  const own = (id: string): ExistingProduct => {
    const p = byId.get(id);
    if (!p) throw new PlanError(`product ${id} not found`);
    if (p.salonId !== ADG_SALON_ID) throw new PlanError(`product ${id} belongs to salon ${p.salonId}`);
    return p;
  };
  for (const row of retag) {
    const toCategoryId = leafIdBySlug.get(row.leaf);
    if (!toCategoryId) throw new PlanError(`retag ${row.productId}: unknown leaf ${row.leaf}`);
    const p = own(row.productId);
    if (p.categoryId !== toCategoryId) ops.push({ type: "retag_product", productId: p.id, fromCategoryId: p.categoryId, toCategoryId });
  }
  const guard = (rows: HygieneRow[], type: "set_storage_zone" | "set_brand", read: (p: ExistingProduct) => string | null, label: string) => {
    for (const row of rows) {
      const p = own(row.productId);
      const current = read(p);
      if (current === row.to) continue;
      if (current !== row.from) { skipped.push(`${label} ${p.id}: expected ${row.from}, found ${current}`); continue; }
      ops.push({ type, productId: p.id, from: row.from, to: row.to });
    }
  };
  guard(hygiene.storageZone, "set_storage_zone", (p) => p.storageZone, "storage_zone");
  guard(hygiene.brand, "set_brand", (p) => p.brand, "brand");
  return { ops, skipped };
}

export async function loadExistingCategories(manager: EntityManager, salonId: string): Promise<ExistingCategory[]> {
  const rows: Array<Record<string, unknown>> = await manager.query(
    `SELECT c.id, c.salon_id, c.slug, c.name, c.parent_id, c.level, c.is_active, c.name_translations, c.display_order, (SELECT count(*)::int FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS product_count FROM categories c WHERE c.salon_id = $1`,
    [salonId],
  );
  return rows.map((r) => ({
    id: r.id as string, salonId: r.salon_id as string, slug: r.slug as string | null, name: r.name as string,
    parentId: r.parent_id as string | null, level: Number(r.level), isActive: Boolean(r.is_active),
    nameTranslations: (r.name_translations as Record<string, string>) ?? {}, displayOrder: Number(r.display_order),
    productCount: Number(r.product_count),
  }));
}

export async function loadProducts(manager: EntityManager, salonId: string): Promise<ExistingProduct[]> {
  const rows: Array<Record<string, unknown>> = await manager.query(
    `SELECT id, salon_id, category_id, storage_zone, brand FROM products WHERE salon_id = $1 AND deleted_at IS NULL`,
    [salonId],
  );
  return rows.map((r) => ({ id: r.id as string, salonId: r.salon_id as string, categoryId: r.category_id as string | null, storageZone: r.storage_zone as string | null, brand: r.brand as string | null }));
}

export function backupTs(now = new Date()): string {
  return now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHmmss
}

function assertTs(ts: string) { if (!/^\d{14}$/.test(ts)) throw new PlanError(`bad backup ts ${ts}`); }

export async function snapshotSalon(manager: EntityManager, salonId: string, ts: string): Promise<void> {
  assertTs(ts);
  await manager.query(`CREATE TABLE adg_category_backup_${ts}_categories AS SELECT * FROM categories WHERE salon_id = $1`, [salonId]);
  await manager.query(`CREATE TABLE adg_category_backup_${ts}_products AS SELECT id, category_id, storage_zone, brand FROM products WHERE salon_id = $1`, [salonId]);
}

export async function applyOps(manager: EntityManager, salonId: string, categoryOps: CategoryOp[], productOps: ProductOp[]): Promise<void> {
  const groupIdBySlug = async (slug: string): Promise<string> => {
    const [row] = await manager.query(`SELECT id FROM categories WHERE salon_id = $1 AND slug = $2 AND parent_id IS NULL`, [salonId, slug]);
    if (!row) throw new PlanError(`group ${slug} missing at apply time`);
    return row.id as string;
  };
  for (const op of categoryOps) {
    switch (op.type) {
      case "rename_leaf":
        await manager.query(`UPDATE categories SET slug = $3, name = $4, name_translations = $5::jsonb, display_order = $6, is_active = true, updated_at = now() WHERE salon_id = $1 AND id = $2`, [salonId, op.id, op.slug, op.name, JSON.stringify(op.nameTranslations), op.displayOrder]);
        break;
      case "create_group":
        await manager.query(`INSERT INTO categories (id, salon_id, parent_id, name, name_translations, slug_translations, slug, path, level, display_order, is_active) VALUES ($1, $2, NULL, $3, $4::jsonb, '{}'::jsonb, $5, $6, 0, $7, true)`, [op.id, salonId, op.name, JSON.stringify(op.nameTranslations), op.slug, `/${op.id}/`, op.displayOrder]);
        break;
      case "normalize_group":
        await manager.query(`UPDATE categories SET name = $3, name_translations = $4::jsonb, display_order = $5, parent_id = NULL, path = '/' || id || '/', level = 0, is_active = true, updated_at = now() WHERE salon_id = $1 AND id = $2`, [salonId, op.id, op.name, JSON.stringify(op.nameTranslations), op.displayOrder]);
        break;
      case "create_leaf": {
        const gid = await groupIdBySlug(op.groupSlug);
        await manager.query(`INSERT INTO categories (id, salon_id, parent_id, name, name_translations, slug_translations, slug, path, level, display_order, is_active) VALUES ($1, $2, $3, $4, $5::jsonb, '{}'::jsonb, $6, $7, 1, $8, true)`, [op.id, salonId, gid, op.name, JSON.stringify(op.nameTranslations), op.slug, `/${gid}/${op.id}/`, op.displayOrder]);
        break;
      }
      case "reparent_leaf": {
        const gid = await groupIdBySlug(op.groupSlug);
        await manager.query(`UPDATE categories SET parent_id = $3, path = '/' || $3 || '/' || id || '/', level = 1, updated_at = now() WHERE salon_id = $1 AND id = $2`, [salonId, op.id, gid]);
        break;
      }
      case "merge_leaf": {
        const [into] = await manager.query(`SELECT id FROM categories WHERE salon_id = $1 AND slug = $2 AND parent_id IS NOT NULL`, [salonId, op.intoSlug]);
        if (!into) throw new PlanError(`merge target ${op.intoSlug} missing at apply time`);
        await manager.query(`UPDATE products SET category_id = $3, updated_at = now() WHERE salon_id = $1 AND category_id = $2`, [salonId, op.fromId, into.id]);
        await manager.query(`UPDATE categories SET is_active = false, updated_at = now() WHERE salon_id = $1 AND id = $2`, [salonId, op.fromId]);
        break;
      }
      case "deactivate":
        await manager.query(`UPDATE categories SET is_active = false, updated_at = now() WHERE salon_id = $1 AND id = $2`, [salonId, op.id]);
        break;
    }
  }
  for (const op of productOps) {
    switch (op.type) {
      case "retag_product":
        await manager.query(`UPDATE products SET category_id = $3, updated_at = now() WHERE salon_id = $1 AND id = $2`, [salonId, op.productId, op.toCategoryId]);
        break;
      case "set_storage_zone":
        await manager.query(`UPDATE products SET storage_zone = $3, updated_at = now() WHERE salon_id = $1 AND id = $2 AND storage_zone = $4`, [salonId, op.productId, op.to, op.from]);
        break;
      case "set_brand":
        await manager.query(`UPDATE products SET brand = $3, updated_at = now() WHERE salon_id = $1 AND id = $2 AND brand = $4`, [salonId, op.productId, op.to, op.from]);
        break;
    }
  }
  await manager.query(`UPDATE categories c SET product_count = (SELECT count(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) WHERE c.salon_id = $1`, [salonId]);
}

export async function restoreSnapshot(manager: EntityManager, salonId: string, ts: string): Promise<void> {
  assertTs(ts);
  const cats = `adg_category_backup_${ts}_categories`;
  const prods = `adg_category_backup_${ts}_products`;
  // Order matters: products first (no product may reference a row the apply created), then delete the created rows
  // (frees the group slug dania-gotowe), then give the old rows their old slugs/parents back.
  await manager.query(`UPDATE products p SET category_id = b.category_id, storage_zone = b.storage_zone, brand = b.brand, updated_at = now() FROM ${prods} b WHERE p.id = b.id AND p.salon_id = $1`, [salonId]);
  await manager.query(`DELETE FROM categories WHERE salon_id = $1 AND id NOT IN (SELECT id FROM ${cats})`, [salonId]);
  await manager.query(`UPDATE categories c SET name = b.name, slug = b.slug, parent_id = b.parent_id, path = b.path, level = b.level, display_order = b.display_order, is_active = b.is_active, name_translations = b.name_translations, product_count = b.product_count, updated_at = b.updated_at FROM ${cats} b WHERE c.id = b.id AND c.salon_id = $1`, [salonId]);
}

export async function verifyTree(manager: EntityManager, salonId: string) {
  const visible = `p.salon_id = $1 AND p.status = 'active' AND p.is_active AND p.is_visible AND p.deleted_at IS NULL`;
  const [a] = await manager.query(`SELECT count(*)::int AS n FROM products p WHERE ${visible}`, [salonId]);
  const [b] = await manager.query(`SELECT count(*)::int AS n FROM products p JOIN categories c ON c.id = p.category_id WHERE ${visible} AND c.parent_id IS NOT NULL AND c.is_active`, [salonId]);
  const [c] = await manager.query(`SELECT count(*)::int AS n FROM products p JOIN categories c ON c.id = p.category_id WHERE ${visible} AND c.parent_id IS NULL`, [salonId]);
  const [d] = await manager.query(`SELECT count(*)::int AS n FROM categories WHERE salon_id = $1 AND level >= 2`, [salonId]);
  const [e] = await manager.query(`SELECT count(*)::int AS n FROM (SELECT slug FROM categories WHERE salon_id = $1 GROUP BY slug HAVING count(*) > 1) d`, [salonId]);
  return { visibleTotal: a.n, leafSum: b.n, productsOnGroups: c.n, deepCategories: d.n, duplicateSlugs: e.n };
}
```
- [ ] **Step 4: Write the CLI** `apply-category-tree.ts`:

```ts
/**
 * Asia Deli Go 2-level category tree + product re-tag + hygiene.
 *   npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --apply
 *   npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --restore 20260928101500
 * Touches only salon e73271a9-53e3-4a20-a02e-791726b452aa. --apply snapshots the salon into
 * adg_category_backup_<ts>_{categories,products} and runs every op in one transaction.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DataSource } from "typeorm";
import {
  ADG_SALON_ID, PlanError, applyOps, backupTs, loadExistingCategories, loadProducts, planCategoryTree,
  planProductChanges, restoreSnapshot, snapshotSalon, verifyTree,
  type CategoryOp, type CategoryTreeFile, type HygieneFile, type RetagRow,
} from "./apply-category-tree.lib";

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(__dirname, name), "utf8")) as T;
}

function summarize(ops: Array<{ type: string }>): Record<string, number> {
  return ops.reduce<Record<string, number>>((acc, op) => ({ ...acc, [op.type]: (acc[op.type] ?? 0) + 1 }), {});
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const mode = args.includes("--apply") ? "apply" : args.includes("--restore") ? "restore" : args.includes("--dry-run") ? "dry-run" : null;
  if (!mode) { console.error("usage: --dry-run | --apply | --restore <ts>"); return 2; }

  const dataSource: DataSource = (await import("@/config/typeorm.config")).default;
  dataSource.setOptions({ logging: false });
  await dataSource.initialize();
  try {
    if (mode === "restore") {
      const ts = args[args.indexOf("--restore") + 1];
      await dataSource.transaction((m) => restoreSnapshot(m, ADG_SALON_ID, ts));
      console.log(`restored salon ${ADG_SALON_ID} from adg_category_backup_${ts}_*`);
      console.table(await verifyTree(dataSource.manager, ADG_SALON_ID));
      return 0;
    }

    const tree = readJson<CategoryTreeFile>("category-tree.json");
    const retag = readJson<RetagRow[]>("product-retag.json");
    const hygiene = readJson<HygieneFile>("product-hygiene.json");

    const existing = await loadExistingCategories(dataSource.manager, ADG_SALON_ID);
    const categoryOps = planCategoryTree(existing, tree);

    // Leaf ids after the category ops: reused rows keep their id, new leaves carry the planned id.
    const leafIdBySlug = new Map<string, string>();
    for (const g of tree.groups) for (const l of g.leaves) {
      const created = categoryOps.find((op): op is Extract<CategoryOp, { type: "create_leaf" }> => op.type === "create_leaf" && op.slug === l.slug);
      const reused = existing.find((r) => r.slug === l.slug) ?? (l.from ? existing.find((r) => r.slug === l.from) : undefined);
      const id = created?.id ?? reused?.id;
      if (!id) throw new PlanError(`leaf ${l.slug}: no row and no create op`);
      leafIdBySlug.set(l.slug, id);
    }
    const products = await loadProducts(dataSource.manager, ADG_SALON_ID);
    const { ops: productOps, skipped } = planProductChanges(products, retag, hygiene, leafIdBySlug);

    console.log(`salon ${ADG_SALON_ID}: ${categoryOps.length} category ops, ${productOps.length} product ops`);
    console.table({ ...summarize(categoryOps), ...summarize(productOps) });
    for (const op of categoryOps) console.log(JSON.stringify(op));
    if (skipped.length) { console.log("skipped hygiene rows:"); for (const s of skipped) console.log(`  ${s}`); }
    if (categoryOps.length + productOps.length === 0) { console.log("nothing to do (idempotent)"); return 0; }
    if (mode === "dry-run") return 0;

    const ts = backupTs();
    await dataSource.transaction(async (m) => {
      await snapshotSalon(m, ADG_SALON_ID, ts);
      await applyOps(m, ADG_SALON_ID, categoryOps, productOps);
      const v = await verifyTree(m, ADG_SALON_ID);
      console.table(v);
      if (v.productsOnGroups !== 0 || v.deepCategories !== 0 || v.duplicateSlugs !== 0 || v.leafSum !== v.visibleTotal) {
        throw new PlanError("verification failed, transaction rolled back");
      }
    });
    console.log(`applied; rollback with --restore ${ts}`);
    return 0;
  } finally {
    await dataSource.destroy();
  }
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err instanceof PlanError ? `PLAN ERROR: ${err.message}` : err);
  process.exit(1);
});
```
- [ ] **Step 5: Run** the spec → `Expected: PASS (10 tests)`; `npx tsc -p tsconfig.json --noEmit` → clean; `npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --dry-run` against dev → prints the op table (`create_group 10, rename_leaf 38, create_leaf 16, reparent_leaf 38, merge_leaf 22, deactivate ≈12`, product ops 0 with the placeholder inputs) and exits 0 without writing: `docker exec enail-postgres psql -U enail -d enail -Atc "SELECT count(*) FROM categories WHERE salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND parent_id IS NOT NULL"` is still `0`.
- [ ] **Step 6: Commit** — `git -C /var/www/www/enail/.worktrees/adg-category-tree add backend/src/scripts/adg` then `git -C /var/www/www/enail/.worktrees/adg-category-tree commit -m "feat(adg): apply-category-tree script — retag/hygiene planner, transactional executor, backup and restore" -m "Session: adg-category-tree (claude)"`

### Task 3: Hygiene input, dev apply, verification

**Files:**
- Modify: `backend/src/scripts/adg/product-hygiene.json` (generated)
- Modify: `backend/src/scripts/adg/product-retag.json` (Paul's reviewed file copied in verbatim)
- Create: `backend/src/scripts/adg/README.md` (runbook: commands, backup naming, restore order, verification SQL, recorded `<ts>` values)

**Interfaces:**
- Consumes: `product-retag.json` as delivered (array of `{ productId, leaf }`); every `leaf` must be one of the 54 slugs in `category-tree.json`.
- Produces: `product-hygiene.json` from the SQL below, executed BEFORE the apply (it keys on the old leaf slugs).

- [ ] **Step 1: Generate `product-hygiene.json`** on dev (spec §6 rules; `imbir-marynowany` and `pasta-miso` CHILLED rows are deliberately excluded pending Paul's answer):

```bash
docker exec enail-postgres psql -U enail -d enail -At -c "
WITH v AS (
  SELECT p.id, p.storage_zone, p.brand, c.slug
    FROM products p JOIN categories c ON c.id = p.category_id
   WHERE p.salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa' AND p.deleted_at IS NULL
),
zone AS (
  SELECT id, storage_zone AS f, 'AMBIENT' AS t FROM v WHERE storage_zone = 'FROZEN'
  UNION ALL
  SELECT id, storage_zone, 'AMBIENT' FROM v WHERE storage_zone = 'CHILLED'
     AND slug NOT IN ('kimchi','kluski-tteok-do-dań','makaron-pszenny','imbir-marynowany','pasta-miso')
),
brand AS (
  SELECT id, brand AS f, initcap(lower(brand)) AS t FROM v WHERE brand IN ('KAMEDA','OURHOME')
)
SELECT json_build_object(
  'storageZone', (SELECT coalesce(json_agg(json_build_object('productId', id, 'from', f, 'to', t)), '[]'::json) FROM zone),
  'brand',       (SELECT coalesce(json_agg(json_build_object('productId', id, 'from', f, 'to', t)), '[]'::json) FROM brand)
);" > /var/www/www/enail/.worktrees/adg-category-tree/backend/src/scripts/adg/product-hygiene.json
```
  `Expected:` 11 `FROZEN→AMBIENT` rows, ≈34 `CHILLED→AMBIENT` rows, 5 brand rows — check with `node -e "const h=require('./product-hygiene.json'); console.log(h.storageZone.length, h.brand.length)"` run inside `backend/src/scripts/adg`.
- [ ] **Step 2: Copy Paul's `product-retag.json`** into `backend/src/scripts/adg/` and validate it from that directory: `node -e "const t=require('./category-tree.json'); const leaves=new Set(t.groups.flatMap(g=>g.leaves.map(l=>l.slug))); const r=require('./product-retag.json'); const bad=r.filter(x=>!leaves.has(x.leaf)); const dup=r.length-new Set(r.map(x=>x.productId)).size; console.log(r.length, 'rows; bad leaves:', bad.length, 'dup ids:', dup)"` → `Expected: bad leaves: 0, dup ids: 0`.
- [ ] **Step 3: Dry-run** `npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --dry-run` → table + per-op lines; save the output to `/var/tmp/rf-build/claude-1000/-var-www-www-enail/34fe6b74-5a73-46aa-9385-bb31d62bec5d/scratchpad/adg-tree-dryrun-dev.log`; the `skipped hygiene rows` list must be empty and `retag_product` must equal the number of retag rows whose product is not already on that leaf.
- [ ] **Step 4: Apply on dev** `... --apply` → `Expected:` verification table `productsOnGroups 0, deepCategories 0, duplicateSlugs 0, leafSum = visibleTotal = 1779`, and the line `applied; rollback with --restore <ts>` (record `<ts>` in the README).
- [ ] **Step 5: Verify with SQL** (all must hold):

```bash
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT c.slug, count(p.id) FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.status='active' AND p.is_active AND p.is_visible AND p.deleted_at IS NULL WHERE c.salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND c.is_active AND c.parent_id IS NOT NULL GROUP BY c.slug ORDER BY 2 DESC"
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT count(p.id) FROM categories c JOIN products p ON p.category_id=c.id WHERE c.salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND c.parent_id IS NOT NULL AND p.status='active' AND p.is_active AND p.is_visible AND p.deleted_at IS NULL"
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT count(*) FROM products p JOIN categories c ON c.id=p.category_id WHERE c.salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND c.parent_id IS NULL AND p.deleted_at IS NULL"
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT count(*) FROM categories WHERE salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND level >= 2"
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT slug FROM categories WHERE salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' GROUP BY slug HAVING count(*)>1"
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT count(*) FROM categories WHERE salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND is_active AND parent_id IS NULL"
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT storage_zone, count(*) FROM products WHERE salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND deleted_at IS NULL GROUP BY 1"
docker exec enail-postgres psql -U enail -d enail -Atc "SELECT brand, count(*) FROM products WHERE salon_id='e73271a9-53e3-4a20-a02e-791726b452aa' AND brand IN ('KAMEDA','OURHOME','Kameda','Ourhome') GROUP BY 1"
```
  `Expected:` 54 leaf rows in the first query; `1779`; `0`; `0`; no rows; `10`; no `FROZEN` row; only `Kameda`/`Ourhome`.
- [ ] **Step 6: Idempotency** — run `--apply` again → `Expected:` `nothing to do (idempotent)`, exit 0, and `docker exec enail-postgres psql -U enail -d enail -Atc "SELECT count(*) FROM pg_tables WHERE tablename LIKE 'adg_category_backup_%'"` still `2`.
- [ ] **Step 7: Restore rehearsal** — `--restore <ts>` → verification table shows `leafSum 0, productsOnGroups 1779` (old flat state) and the Step 5 group-count query returns the old ~70 active flat rows; then `--apply` again → same result as Step 4 (new `<ts2>`; write it in the README). Finish in the applied state so the dev storefront preview (Task 9) runs on the tree.
- [ ] **Step 8: Write the README** (commands above, backup table naming, the restore order note, the two `<ts>` values, the SQL block) and commit — `git -C /var/www/www/enail/.worktrees/adg-category-tree add backend/src/scripts/adg` then `git -C /var/www/www/enail/.worktrees/adg-category-tree commit -m "chore(adg): retag + hygiene inputs and runbook for the category tree apply" -m "Session: adg-category-tree (claude)"`

### Task 4: Storefront tree adapter (`public-taxonomy.ts`), GraphQL fields, fixtures

**Files:**
- Modify: `src/lib/public-taxonomy.ts` (rewrite below `HIDDEN_CATEGORY_KEYWORDS`; `PUBLIC_CATEGORY_DEFINITIONS` shrinks to 10 group entries with names/descriptions only)
- Modify: `src/lib/graphql/operations/grocery.ts` (`CATEGORIES_QUERY`, `PUBLIC_CATEGORIES_QUERY`, `PUBLIC_CATEGORY_NAVIGATION_QUERY` gain `level displayOrder parent { id } translation(languageCode: "en") { name }`; `PUBLIC_CATEGORIES_QUERY` also `backgroundImage { url alt }`)
- Modify: `tests/mobile-fixtures.ts` (group fixtures + `parent`/`level`/`displayOrder`/`translation` on every category node, incl. the slim navigation node)
- Modify: `tests/config-server.mjs` (same for SSR)
- Modify: `src/components/search/SearchAutocomplete.tsx:108-124` (add `...category.children.map((leaf) => leaf.name)` to the searchable text); `src/lib/catalog-display-localization.ts:56-83` keeps its call (a lone product category becomes a leafless group and still yields its own slug)
- Modify: `tests/categories-browsing.spec.ts` (delete the 4 definition-mapping tests at lines 130–213 and the `ASIA_DELI_GO_PUBLIC_RAW_SLUGS` constant; the `PUBLIC_CATEGORY_DEFINITIONS` import goes with them)
- Test: `tests/category-tree.test.mjs` (node `--test`)

**Interfaces:**
- Produces (exact shapes):

```ts
export interface PublicTaxonomyRawCategory {
  id: string; slug: string; name: string; description?: string | null;
  level?: number | null; displayOrder?: number | null;
  parent?: { id: string } | null;
  translation?: { name?: string | null } | null;
  backgroundImage?: { url?: string | null; alt?: string | null } | null;
  products?: { totalCount: number } | null;
}
export interface PublicCategoryLeaf {
  id: string; slug: string; name: string; description: string;
  products: { totalCount: number | null };
  backgroundImageUrl: string | null;
}
export interface PublicCategory extends PublicCategoryLeaf {
  kind: 'group' | 'leaf';
  parent: { id: string; slug: string; name: string } | null;
  children: PublicCategoryLeaf[];
  rawCategoryIds: string[];   // group: leaf ids (own id when leafless); leaf: [own id]
  rawCategorySlugs: string[];
}
export function buildCategoryTree(categories: PublicTaxonomyRawCategory[], locale?: string, options?: BuildPublicCategoriesOptions): PublicCategory[]; // groups only, sorted by displayOrder then name
export const buildPublicCategories = buildCategoryTree;  // kept for the 12 importers
export function findPublicCategory(categories, slug, locale?, options?): PublicCategory | null; // group or leaf
export const PUBLIC_CATEGORY_DEFINITIONS: Array<{ slug: string; names: { pl: string; en: string }; descriptions: { pl: string; en: string } }>; // the 10 groups
```
- Rules: a node is a leaf iff `parent?.id` resolves to another visible node; a node whose `parent.id` is unknown is treated as a group (nothing disappears); `HIDDEN_CATEGORY_KEYWORDS` unchanged; `requireProductCount` (default true) drops nodes without a numeric count, `includeEmpty` (default false) drops zero-count nodes; group count = sum of its kept leaves, or its own count when leafless; group/leaf `name` for `en` = `translation.name` → definition `names.en` → `name`; `description` = DB `description` → definition (by locale) → `''`.
- Fixture groups (both fixtures): `cat-group-noodles` (`makaron-i-ryz`, "Makaron i ryż", parent of `cat-ramen`, `cat-rice-empty`), `cat-group-kimchi` (`kimchi-i-kiszonki`, "Kimchi i kiszonki", `translation: { name: 'Kimchi and pickles' }`, parent of `cat-kimchi`, `cat-pickled-vegetables`), `cat-group-cooking` (`do-gotowania-i-sushi`, "Do gotowania i sushi", parent of `cat-tofu-empty`), `cat-group-cosmetics` (`kosmetyki-koreanskie`, "Kosmetyki koreańskie", parent of `cat-korean-cosmetics-empty`); `cat-ready-meals` (`dania-gotowe`), `cat-household`, `cat-fruit`, `cat-bakery` stay level 0 without children (leafless groups) → 8 groups in the fixture.

- [ ] **Step 1: Write the failing node test** `tests/category-tree.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCategoryTree, buildPublicCategories, findPublicCategory } from '../src/lib/public-taxonomy.ts';

const raw = [
  { id: 'g-kimchi', slug: 'kimchi-i-kiszonki', name: 'Kimchi i kiszonki', description: null, level: 0, displayOrder: 1, parent: null, translation: { name: 'Kimchi and pickles' }, products: { totalCount: 0 } },
  { id: 'l-kimchi', slug: 'kimchi', name: 'Kimchi', description: 'Kimchi z kapusty', level: 1, displayOrder: 0, parent: { id: 'g-kimchi' }, translation: null, products: { totalCount: 16 } },
  { id: 'l-pickles', slug: 'marynowane-warzywa-i-owoce', name: 'Marynowane warzywa i owoce', description: null, level: 1, displayOrder: 1, parent: { id: 'g-kimchi' }, translation: { name: 'Pickled vegetables and fruit' }, products: { totalCount: 42 } },
  { id: 'g-meals', slug: 'dania-gotowe', name: 'Dania gotowe', description: null, level: 0, displayOrder: 0, parent: null, translation: null, products: { totalCount: 60 } },
  { id: 'l-empty', slug: 'imbir-marynowany', name: 'Imbir marynowany', description: null, level: 1, displayOrder: 2, parent: { id: 'g-kimchi' }, translation: null, products: { totalCount: 0 } },
  { id: 'hidden', slug: 'pozostale-produkty', name: 'Pozostałe produkty', description: null, level: 0, displayOrder: 9, parent: null, translation: null, products: { totalCount: 3 } },
];

test('groups come out in displayOrder with their leaves, counts summed, hidden dropped', () => {
  const tree = buildCategoryTree(raw, 'pl');
  assert.deepEqual(tree.map((g) => g.slug), ['dania-gotowe', 'kimchi-i-kiszonki']);
  const kimchi = tree[1];
  assert.equal(kimchi.kind, 'group');
  assert.deepEqual(kimchi.children.map((l) => l.slug), ['kimchi', 'marynowane-warzywa-i-owoce']);
  assert.equal(kimchi.products.totalCount, 58);
  assert.deepEqual(kimchi.rawCategoryIds, ['l-kimchi', 'l-pickles']);
  assert.equal(tree.some((g) => g.slug === 'pozostale-produkty'), false);
});

test('leafless group lists its own id', () => {
  const meals = buildCategoryTree(raw, 'pl').find((g) => g.slug === 'dania-gotowe');
  assert.deepEqual(meals.rawCategoryIds, ['g-meals']);
  assert.deepEqual(meals.children, []);
  assert.equal(meals.products.totalCount, 60);
});

test('includeEmpty keeps zero-count leaves; default drops them', () => {
  const withEmpty = buildCategoryTree(raw, 'pl', { includeEmpty: true }).find((g) => g.slug === 'kimchi-i-kiszonki');
  assert.equal(withEmpty.children.length, 3);
  assert.equal(buildCategoryTree(raw, 'pl').find((g) => g.slug === 'kimchi-i-kiszonki').children.length, 2);
});

test('findPublicCategory returns a leaf with its parent and only its own id', () => {
  const leaf = findPublicCategory(raw, 'kimchi', 'pl');
  assert.equal(leaf.kind, 'leaf');
  assert.deepEqual(leaf.parent, { id: 'g-kimchi', slug: 'kimchi-i-kiszonki', name: 'Kimchi i kiszonki' });
  assert.deepEqual(leaf.rawCategoryIds, ['l-kimchi']);
  assert.equal(leaf.description, 'Kimchi z kapusty');
  assert.equal(findPublicCategory(raw, 'nie-ma', 'pl'), null);
});

test('english names come from translation, then the group fallback table, then the Polish name', () => {
  const tree = buildCategoryTree(raw, 'en');
  const kimchi = tree.find((g) => g.slug === 'kimchi-i-kiszonki');
  assert.equal(kimchi.name, 'Kimchi and pickles');
  assert.equal(kimchi.children[1].name, 'Pickled vegetables and fruit');
  assert.equal(kimchi.children[0].name, 'Kimchi');
  assert.equal(tree.find((g) => g.slug === 'dania-gotowe').name, 'Ready meals and instant soups');
});

test('a node whose parent is unknown does not disappear', () => {
  const orphan = { id: 'x', slug: 'orphan', name: 'Orphan', description: null, level: 1, displayOrder: 5, parent: { id: 'gone' }, translation: null, products: { totalCount: 2 } };
  assert.equal(buildCategoryTree([...raw, orphan], 'pl').some((g) => g.slug === 'orphan'), true);
});

test('buildPublicCategories is the same function (importers keep working)', () => {
  assert.equal(buildPublicCategories, buildCategoryTree);
});
```
- [ ] **Step 2: Run** `node --test tests/category-tree.test.mjs` → `Expected: FAIL — buildCategoryTree is not exported / kind undefined`
- [ ] **Step 3: Implement** the adapter (replace everything below the `HIDDEN_CATEGORY_KEYWORDS` block; `normalizeText`, `getSearchText`, `isHiddenCategory` stay; `PublicCategoryDefinition` loses `rawSlugs`/`keywords`):

```ts
export const PUBLIC_CATEGORY_DEFINITIONS: PublicCategoryDefinition[] = [
  { slug: 'makaron-i-ryz', names: { pl: 'Makaron i ryż', en: 'Noodles and rice' }, descriptions: { pl: 'Ramyun, udon, soba, makaron ryżowy, tteok i ryż.', en: 'Ramyun, udon, soba, rice noodles, tteok, and rice.' } },
  { slug: 'sosy-i-oleje', names: { pl: 'Sosy i oleje', en: 'Sauces and oils' }, descriptions: { pl: 'Sos sojowy, sosy rybne i ostrygowe, ostre, do sushi, majonezy i oleje.', en: 'Soy, fish, oyster, hot and sushi sauces, mayonnaise, and oils.' } },
  { slug: 'pasty-przyprawy-i-buliony', names: { pl: 'Pasty, przyprawy i buliony', en: 'Pastes, spices and stocks' }, descriptions: { pl: 'Gochujang, curry, miso, przyprawy, octy, buliony, wasabi i sezam.', en: 'Gochujang, curry, miso, spices, vinegars, stocks, wasabi, and sesame.' } },
  { slug: 'kimchi-i-kiszonki', names: { pl: 'Kimchi i kiszonki', en: 'Kimchi and pickles' }, descriptions: { pl: 'Kimchi, marynowane warzywa i owoce, imbir marynowany.', en: 'Kimchi, pickled vegetables and fruit, pickled ginger.' } },
  { slug: 'przekaski-i-slodycze', names: { pl: 'Przekąski i słodycze', en: 'Snacks and sweets' }, descriptions: { pl: 'Chipsy, ciastka, Pocky, żelki, mochi i słone przekąski z Azji.', en: 'Chips, cookies, Pocky, gummies, mochi, and savory Asian snacks.' } },
  { slug: 'napoje-herbaty-i-kawy', names: { pl: 'Napoje, herbaty i kawy', en: 'Drinks, tea and coffee' }, descriptions: { pl: 'Herbaty, kawy, napoje gazowane, soki i napoje mleczne.', en: 'Teas, coffee, soft drinks, juices, and milk drinks.' } },
  { slug: 'dania-gotowe', names: { pl: 'Dania gotowe i zupy instant', en: 'Ready meals and instant soups' }, descriptions: { pl: 'Dania gotowe, curry i zupy instant.', en: 'Ready meals, curry, and instant soups.' } },
  { slug: 'do-gotowania-i-sushi', names: { pl: 'Do gotowania i sushi', en: 'Cooking and sushi essentials' }, descriptions: { pl: 'Algi, grzyby suszone, tofu, mąki, mleczko kokosowe i papier ryżowy.', en: 'Seaweed, dried mushrooms, tofu, flours, coconut milk, and rice paper.' } },
  { slug: 'akcesoria-kuchenne', names: { pl: 'Akcesoria kuchenne', en: 'Kitchen accessories' }, descriptions: { pl: 'Pałeczki, noże, woki, miski, parowary i zestawy do sushi.', en: 'Chopsticks, knives, woks, bowls, steamers, and sushi kits.' } },
  { slug: 'kosmetyki-koreanskie', names: { pl: 'Kosmetyki koreańskie', en: 'Korean cosmetics' }, descriptions: { pl: 'Maseczki, kremy, serum, oczyszczanie i filtry UV.', en: 'Sheet masks, creams, serums, cleansing, and sunscreens.' } },
];

function definitionFor(slug: string) {
  return PUBLIC_CATEGORY_DEFINITIONS.find((definition) => definition.slug === slug) ?? null;
}

function localizedName(node: PublicTaxonomyRawCategory, locale: string) {
  if (locale === 'en') {
    const translated = node.translation?.name?.trim();
    if (translated) return translated;
    const definition = definitionFor(node.slug);
    if (definition) return definition.names.en;
  }
  return node.name;
}

function localizedDescription(node: PublicTaxonomyRawCategory, locale: string) {
  const own = node.description?.trim();
  if (own) return own;
  const definition = definitionFor(node.slug);
  if (!definition) return '';
  return locale === 'en' ? definition.descriptions.en : definition.descriptions.pl;
}

function toLeaf(node: PublicTaxonomyRawCategory, locale: string): PublicCategoryLeaf {
  const count = node.products?.totalCount;
  return {
    id: node.id,
    slug: node.slug,
    name: localizedName(node, locale),
    description: localizedDescription(node, locale),
    products: { totalCount: typeof count === 'number' ? count : null },
    backgroundImageUrl: node.backgroundImage?.url?.trim() || null,
  };
}

function keepNode(node: PublicTaxonomyRawCategory, requireProductCount: boolean, includeEmpty: boolean) {
  const count = node.products?.totalCount;
  const hasKnownCount = typeof count === 'number';
  if (requireProductCount && !hasKnownCount) return false;
  if (!includeEmpty && hasKnownCount && count <= 0) return false;
  return true;
}

export function buildCategoryTree(
  categories: PublicTaxonomyRawCategory[],
  locale = 'pl',
  options: BuildPublicCategoriesOptions = {},
): PublicCategory[] {
  const requireProductCount = options.requireProductCount ?? true;
  const includeEmpty = options.includeEmpty ?? false;
  const visible = categories.filter((node) => node.slug && node.name && !isHiddenCategory(node));
  const byId = new Map(visible.map((node) => [node.id, node]));
  const isLeafNode = (node: PublicTaxonomyRawCategory) => Boolean(node.parent?.id && node.parent.id !== node.id && byId.has(node.parent.id));
  const byOrder = (left: PublicTaxonomyRawCategory, right: PublicTaxonomyRawCategory) => (
    (left.displayOrder ?? 0) - (right.displayOrder ?? 0) || left.name.localeCompare(right.name, locale)
  );
  const leavesByParent = new Map<string, PublicTaxonomyRawCategory[]>();
  for (const node of visible) {
    if (!isLeafNode(node)) continue;
    const siblings = leavesByParent.get(node.parent!.id) ?? [];
    siblings.push(node);
    leavesByParent.set(node.parent!.id, siblings);
  }

  const groups: PublicCategory[] = [];
  for (const node of visible.filter((candidate) => !isLeafNode(candidate)).sort(byOrder)) {
    const children = (leavesByParent.get(node.id) ?? [])
      .filter((leaf) => keepNode(leaf, requireProductCount, includeEmpty))
      .sort(byOrder)
      .map((leaf) => toLeaf(leaf, locale));
    const base = toLeaf(node, locale);
    let totalCount: number | null;
    if (children.length > 0) {
      totalCount = children.every((leaf) => leaf.products.totalCount !== null)
        ? children.reduce((sum, leaf) => sum + (leaf.products.totalCount ?? 0), 0)
        : null;
    } else {
      totalCount = base.products.totalCount;
    }
    if (requireProductCount && totalCount === null) continue;
    if (!includeEmpty && totalCount !== null && totalCount <= 0) continue;
    groups.push({
      ...base,
      products: { totalCount },
      kind: 'group',
      parent: null,
      children,
      rawCategoryIds: children.length > 0 ? children.map((leaf) => leaf.id) : [node.id],
      rawCategorySlugs: children.length > 0 ? children.map((leaf) => leaf.slug) : [node.slug],
    });
  }
  return groups;
}

export const buildPublicCategories = buildCategoryTree;

export function findPublicCategory(
  categories: PublicTaxonomyRawCategory[],
  slug: string,
  locale = 'pl',
  options: BuildPublicCategoriesOptions = {},
): PublicCategory | null {
  const groups = buildCategoryTree(categories, locale, options);
  const group = groups.find((candidate) => candidate.slug === slug);
  if (group) return group;
  for (const parent of groups) {
    const leaf = parent.children.find((candidate) => candidate.slug === slug);
    if (leaf) {
      return {
        ...leaf,
        kind: 'leaf',
        parent: { id: parent.id, slug: parent.slug, name: parent.name },
        children: [],
        rawCategoryIds: [leaf.id],
        rawCategorySlugs: [leaf.slug],
      };
    }
  }
  return null;
}
```
- [ ] **Step 4: Update the three queries** in `grocery.ts` — inside each category `node { … }` add:

```graphql
          level
          displayOrder
          parent { id }
          translation(languageCode: "en") { name }
```
  and in `PUBLIC_CATEGORIES_QUERY` also `backgroundImage { url alt }` (the navigation query stays image-free and count-free, per its comment).
- [ ] **Step 5: Fixtures** — in `tests/mobile-fixtures.ts` replace `buildCategoryFixtures`/`buildCategoryNode`:

```ts
const CATEGORY_GROUPS = [
  { id: 'cat-group-noodles', name: 'Makaron i ryż', slug: 'makaron-i-ryz', translation: null },
  { id: 'cat-group-kimchi', name: 'Kimchi i kiszonki', slug: 'kimchi-i-kiszonki', translation: { name: 'Kimchi and pickles' } },
  { id: 'cat-group-cooking', name: 'Do gotowania i sushi', slug: 'do-gotowania-i-sushi', translation: null },
  { id: 'cat-group-cosmetics', name: 'Kosmetyki koreańskie', slug: 'kosmetyki-koreanskie', translation: null },
] as const;

const LEAF_PARENT_ID: Record<string, string> = {
  'cat-kimchi': 'cat-group-kimchi',
  'cat-pickled-vegetables': 'cat-group-kimchi',
  'cat-ramen': 'cat-group-noodles',
  'cat-rice-empty': 'cat-group-noodles',
  'cat-tofu-empty': 'cat-group-cooking',
  'cat-korean-cosmetics-empty': 'cat-group-cosmetics',
};

type CategoryFixture = (typeof PRODUCTS)[number]['category'] & { translation?: { name: string } | null };

function buildCategoryFixtures(products: Array<(typeof PRODUCTS)[number]>): CategoryFixture[] {
  const categories = new Map<string, CategoryFixture>();
  for (const group of CATEGORY_GROUPS) categories.set(group.id, { ...group });
  for (const product of products) categories.set(product.category.id, product.category);
  categories.set('cat-household', { id: 'cat-household', name: 'Household', slug: 'household' });
  categories.set('cat-tofu-empty', { id: 'cat-tofu-empty', name: 'Tofu', slug: 'tofu' });
  categories.set('cat-korean-cosmetics-empty', { id: 'cat-korean-cosmetics-empty', name: 'Korean cosmetics', slug: 'koreańskie-kosmetyki' });
  categories.set('cat-rice-empty', { id: 'cat-rice-empty', name: 'Ryż', slug: 'ryż-i-inne-ziarna' });
  return Array.from(categories.values());
}

function buildCategoryNode(category: CategoryFixture, products: Array<(typeof PRODUCTS)[number]>, index = 0) {
  const parentId = LEAF_PARENT_ID[category.id] ?? null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    level: parentId ? 1 : 0,
    displayOrder: index,
    description: null,
    backgroundImage: getCategoryBackgroundImage(category),
    parent: parentId ? { id: parentId, slug: parentId, name: parentId } : null,
    translation: category.translation ?? null,
    children: { edges: [] },
    products: {
      totalCount: getProductsForCategory(products, category.id).length,
    },
  };
}
```
  `buildCategoryEdge` passes `index` through; the slim navigation branch (line ~1381) returns `id, slug, name, description, level, displayOrder, parent, translation`. Mirror the same in `tests/config-server.mjs` (`categories` array gains the four group rows; `buildCategoryNode(category, index)` adds `level`, `displayOrder`, `parent`, `translation`; the slim branch returns the same field list).
- [ ] **Step 6: Run** `node --test tests/category-tree.test.mjs` → `Expected: PASS (7 tests)`; `npx tsc --noEmit` → clean (widen the local `CategoryNode` interfaces of the importers with the optional fields, or type them as `PublicTaxonomyRawCategory`); `grep -rn "'public:" src` → no matches; `npx playwright test tests/categories-browsing.spec.ts tests/mobile-products-page.spec.ts --project=iphone-12 --workers=1 --reporter=line` → green except the mega-menu promo test at line ~534 (rewritten in Task 6; note its name).
- [ ] **Step 7: Commit** — `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters add grocery-storefront/src/lib/public-taxonomy.ts grocery-storefront/src/lib/graphql/operations/grocery.ts grocery-storefront/src/components/search/SearchAutocomplete.tsx grocery-storefront/tests/mobile-fixtures.ts grocery-storefront/tests/config-server.mjs grocery-storefront/tests/category-tree.test.mjs grocery-storefront/tests/categories-browsing.spec.ts` (plus any importer with a widened interface), then `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters commit -m "feat(taxonomy): build the 2-level category tree from the flat GraphQL list (parent, level, displayOrder, en translation)"`

### Task 5: Category pages (group / leaf), tree sidebar, redirects, sitemap

**Files:**
- Modify: `src/app/[locale]/(shop)/categories/[slug]/page.tsx` (fetch `PUBLIC_CATEGORIES_QUERY`; group: breadcrumb + leaf tiles row; leaf: breadcrumb; tree navigation)
- Modify: `src/app/[locale]/(shop)/categories/page.tsx` + `src/components/categories/CategoryHubClient.tsx` (hub card shows up to 4 leaf names under the description, `+N` via `t('moreLeaves')`)
- Modify: `src/components/product-listing/ProductListingClient.tsx` (`CategoryNavigationItem` gains `children?` and `expanded?`; sidebar nests leaves; mobile chip row flattens)
- Modify: `src/app/[locale]/(shop)/products/page.tsx:151-162` (pass `children` for each group)
- Modify: `src/lib/category-seo.ts` (`RENAMED_CATEGORY_REDIRECTS`; `resolveMergedCategoryTarget` consults both maps; delete `isPublicHubSlug`)
- Modify: `src/app/[locale]/(shop)/categories/[slug]/layout.tsx` (no logic change; `getCategoryCopy` reads the 10 definitions, leaves fall through to `fetchDbCategory`)
- Modify: `next.config.js` (3 group 301s × 3 prefixes)
- Create: `src/lib/category-sitemap.ts`; Modify: `src/app/sitemap.ts` (groups + indexable leaves from the tree; drop `PUBLIC_CATEGORY_DEFINITIONS` and `isPublicHubSlug` imports)
- Modify: `src/messages/pl.json`, `src/messages/en.json` (`categories.breadcrumb` "Ścieżka"/"Breadcrumb", `categories.leafTiles` "Podkategorie"/"Subcategories", `categories.moreLeaves` "+{count} więcej"/"+{count} more")
- Test: `tests/category-sitemap.test.mjs`, `tests/category-tree-pages.spec.ts`

**Interfaces:**
- `CategoryNavigationItem = { id; slug; name; count: number | null; children?: Array<{ id; slug; name; count: number | null }>; expanded?: boolean }`; the desktop sidebar renders a nested `<ul data-testid="category-tree-leaves">` under an item when `expanded && children?.length`; the mobile chip row uses `categoryNavigation.flatMap((item) => item.expanded && item.children ? [item, ...item.children] : [item])`.
- `collectCategorySitemapPaths(groups: Array<Pick<PublicCategory, 'slug' | 'children' | 'products'>>, minLeafProducts: number): Array<{ path: string; priority: number }>` — groups always (`0.8`), leaves with `products.totalCount >= minLeafProducts` (`0.7`); paths `/categories/<encodeURIComponent(slug)>`.
- `RENAMED_CATEGORY_REDIRECTS` (old slug → new slug) = exactly the `from`/`mergeFrom` pairs of `category-tree.json` whose slug changed: `ramyun-ramen→ramyun-w-paczce`, `duża-micha→ramyun-w-kubku-i-misce`, `makaron-pszenny→makaron-pszenny-udon-i-soba`, `makaron-gryczany→makaron-pszenny-udon-i-soba`, `makarony→makaron-pszenny-udon-i-soba`, `makaron-ryżowy→makaron-ryzowy-i-szklisty`, `makaron-szklisty→makaron-ryzowy-i-szklisty`, `kluski-tteok-do-dań→kluski-tteok-i-mochi-ryzowe`, `japońskie-ciasto-ryżowe→kluski-tteok-i-mochi-ryzowe`, `ryż-i-inne-ziarna→ryz-i-ziarna`, `sosy-marynaty→majonez-ketchup-i-inne-sosy`, `sosy-marynaty-oleje→majonez-ketchup-i-inne-sosy`, `pasty-smakowe→pasty-gochujang-curry-hot-pot`, `przyprawy→przyprawy-i-furikake`, `przyprawy-jednoskładnikowe→przyprawy-i-furikake`, `octy-i-winne-przyprawy→octy`, `ocet-ryżowy-do-sushi→octy`, `buliony→buliony-i-dashi`, `wasabi→wasabi-sezam-i-sol`, `sezam→wasabi-sezam-i-sol`, `sól→wasabi-sezam-i-sol`, `owoce-marynowane-warzywa→marynowane-warzywa-i-owoce`, `słodycze-przekąski→ciastka-wafle-i-choco-pie`, `kawy→kawy-i-syropy`, `syropy→kawy-i-syropy`, `napoje→soki-herbaty-gotowe-i-napoje-owocowe`, `arkusze-nori-gim→algi-nori-wakame-kombu`, `wakame-miyeok→algi-nori-wakame-kombu`, `kombu-dasima→algi-nori-wakame-kombu`, `grzyby-shiitake→grzyby-suszone`, `grzyby-mun→grzyby-suszone`, `inne-grzyby-azjatyckie→grzyby-suszone`, `mąki-panierki-tapioka→maki-panierki-i-tapioka`, `papier-ryżowy→papier-ryzowy`, `pałeczki-i-sztućce→paleczki-i-sztucce`, `noże→noze`, `patelnie-wok-grill→patelnie-wok-i-grill`, `komplety-do-sushi-i-herbaty→miski-kubki-i-naczynia`, `miski→miski-kubki-i-naczynia`, `naczynia→miski-kubki-i-naczynia`, `zaparzacze-do-kawy→miski-kubki-i-naczynia`, `parowary-bambusowe→parowary-maty-foremki-i-zestawy-do-sushi`, `maty-do-zwijania→parowary-maty-foremki-i-zestawy-do-sushi`, `foremki→parowary-maty-foremki-i-zestawy-do-sushi`, `zestawy-do-sushi→parowary-maty-foremki-i-zestawy-do-sushi`, `moździerze→parowary-maty-foremki-i-zestawy-do-sushi`, `koty-szczęścia-i-inne-gadżety→prezenty-i-gadzety`, `prezenty→prezenty-i-gadzety`, `koreańskie-kosmetyki→kremy-i-serum`. In the existing `MERGED_CATEGORY_REDIRECTS`: `sosy-i-marynaty→majonez-ketchup-i-inne-sosy`, `ryż-do-sushi-i-nie-tylko→ryz-i-ziarna`, `pasty→pasty-gochujang-curry-hot-pot`, `zupy-buliony→kluski-tteok-i-mochi-ryzowe`, `słodycze-japońskie→ciastka-wafle-i-choco-pie`, `świeże-produkty→przyprawy-i-furikake`; the `marynowane-warzywa-i-owoce` entry is deleted (it is now a live slug); `sosy-sojowe→sos-sojowy` and `oleje-sezamowe→oleje` stay.
- `next.config.js` redirects: for `[old, new]` in `[['sosy-pasty-i-przyprawy','sosy-i-oleje'],['sushi-i-algi','do-gotowania-i-sushi'],['grzyby-warzywa-i-tofu','do-gotowania-i-sushi']]`: `/categories/<old>` → `/categories/<new>`, `/pl/categories/<old>` → `/categories/<new>`, `/en/categories/<old>` → `/en/categories/<new>`, all `statusCode: 301` (same shape as `productSlugRedirects`).
- `[slug]/page.tsx` data flow: one `PUBLIC_CATEGORIES_QUERY` request (tags `${channel}:public-categories`, revalidate 300) → `tree = buildCategoryTree(raw, locale, { requireProductCount: false, includeEmpty: true })`, `current = findPublicCategory(raw, categorySlug, locale, { requireProductCount: false, includeEmpty: true })`; products via `PRODUCT_LISTING_QUERY` with `filter: { categories: current.rawCategoryIds }` (unchanged); `categoryNavigation = tree.map((group) => ({ id, slug, name, count: group.products.totalCount, expanded: group.slug === (current.kind === 'leaf' ? current.parent!.slug : current.slug), children: group.children.map((leaf) => ({ id: leaf.id, slug: leaf.slug, name: leaf.name, count: leaf.products.totalCount })) }))`; the `CATEGORY_BY_SLUG_QUERY` branch stays as the fallback for slugs outside the tree.
- Header: `<nav aria-label={t('breadcrumb')} data-testid="category-breadcrumb">` — group: `Kategorie › <group>`; leaf: `Kategorie › <group Link> › <leaf>`. Group page leaf tiles: `<ul data-testid="category-leaf-tiles">` of `<Link href={`/categories/${leaf.slug}`}>` with the name and `t('productCount', { count })`.

- [ ] **Step 1: Write the failing node test** `tests/category-sitemap.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectCategorySitemapPaths } from '../src/lib/category-sitemap.ts';

const groups = [
  { slug: 'kimchi-i-kiszonki', products: { totalCount: 5 }, children: [
    { id: 'a', slug: 'kimchi', products: { totalCount: 3 } },
    { id: 'b', slug: 'imbir marynowany', products: { totalCount: 2 } },
  ] },
  { slug: 'household', products: { totalCount: 0 }, children: [] },
];

test('groups always, leaves only from the index threshold, slugs encoded', () => {
  assert.deepEqual(collectCategorySitemapPaths(groups, 3), [
    { path: '/categories/kimchi-i-kiszonki', priority: 0.8 },
    { path: '/categories/kimchi', priority: 0.7 },
    { path: '/categories/household', priority: 0.8 },
  ]);
});

test('a leaf below the threshold is not listed even when its group is', () => {
  assert.equal(collectCategorySitemapPaths(groups, 3).some((entry) => entry.path.includes('imbir')), false);
});
```
- [ ] **Step 2: Run** `node --test tests/category-sitemap.test.mjs` → `Expected: FAIL — cannot find module`
- [ ] **Step 3: Implement** `src/lib/category-sitemap.ts`:

```ts
import type { PublicCategory } from '@/lib/public-taxonomy';

export interface CategorySitemapPath { path: string; priority: number }

export function collectCategorySitemapPaths(
  groups: Array<Pick<PublicCategory, 'slug' | 'children' | 'products'>>,
  minLeafProducts: number,
): CategorySitemapPath[] {
  const entries: CategorySitemapPath[] = [];
  for (const group of groups) {
    entries.push({ path: `/categories/${encodeURIComponent(group.slug)}`, priority: 0.8 });
    for (const leaf of group.children) {
      if ((leaf.products.totalCount ?? 0) < minLeafProducts) continue;
      entries.push({ path: `/categories/${encodeURIComponent(leaf.slug)}`, priority: 0.7 });
    }
  }
  return entries;
}
```
  In `sitemap.ts` replace `getIndexableDbCategorySlugs` and the two category loops with one `getCategorySitemapPaths()` that fetches `PUBLIC_CATEGORIES_QUERY`, builds `buildCategoryTree(nodes, 'pl', { requireProductCount: false, includeEmpty: true })` and returns `collectCategorySitemapPaths(groups, CATEGORY_MIN_PRODUCTS_FOR_INDEX)`; per locale prefix push `sitemapEntry(origin, localizedPath(localePrefix, entry.path), 'weekly', entry.priority)`.
- [ ] **Step 4: Write the failing Playwright spec** `tests/category-tree-pages.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

type ProductVariables = { filter?: { categories?: unknown } };
const categoriesOf = (variables: ProductVariables) => (Array.isArray(variables.filter?.categories) ? variables.filter!.categories.map(String) : []);

test.describe('category tree pages', () => {
  test('group page filters by leaf ids and shows leaf tiles', async ({ page }) => {
    const queries: ProductVariables[] = [];
    await mockMobileStorefront(page, { onProductsQuery: (variables) => queries.push(JSON.parse(JSON.stringify(variables))) });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/categories/kimchi-i-kiszonki');

    const tiles = page.getByTestId('category-leaf-tiles');
    await expect(tiles.getByRole('link')).toHaveCount(2);
    await expect(tiles.getByRole('link', { name: /^kimchi/i })).toHaveAttribute('href', '/categories/kimchi');
    await expect(page.getByTestId('product-card')).toHaveCount(2);

    // SSR goes to config-server; the first client request after a filter change must carry both leaf ids and never the group id.
    await page.getByTestId('filter-in-stock-only').check();
    await expect.poll(() => queries.some((variables) => JSON.stringify([...categoriesOf(variables)].sort()) === JSON.stringify(['cat-kimchi', 'cat-pickled-vegetables']))).toBe(true);
    expect(queries.some((variables) => categoriesOf(variables).includes('cat-group-kimchi'))).toBe(false);
  });

  test('leaf page shows the breadcrumb, filters by its own id and marks itself in the tree', async ({ page }) => {
    const queries: ProductVariables[] = [];
    await mockMobileStorefront(page, { onProductsQuery: (variables) => queries.push(JSON.parse(JSON.stringify(variables))) });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/categories/kimchi');

    const breadcrumb = page.getByTestId('category-breadcrumb');
    await expect(breadcrumb).toContainText('Kimchi i kiszonki');
    await expect(breadcrumb.getByRole('link', { name: 'Kimchi i kiszonki' })).toHaveAttribute('href', '/categories/kimchi-i-kiszonki');
    await expect(page.getByTestId('product-card')).toHaveCount(1);

    const sidebar = page.getByTestId('desktop-category-sidebar');
    await expect(sidebar.getByTestId('category-tree-leaves')).toHaveCount(1); // only the current group is expanded
    const leaves = sidebar.getByTestId('category-tree-leaves');
    await expect(leaves.getByRole('link')).toHaveCount(2);
    await expect(leaves.getByRole('link', { name: /^kimchi/i })).toHaveAttribute('aria-current', 'page');

    await page.getByTestId('filter-in-stock-only').check();
    await expect.poll(() => queries.some((variables) => JSON.stringify(categoriesOf(variables)) === JSON.stringify(['cat-kimchi']))).toBe(true);
  });

  test('old group and leaf slugs redirect', async ({ page }) => {
    await mockMobileStorefront(page);
    for (const [from, to] of [
      ['/categories/sosy-pasty-i-przyprawy', '/categories/sosy-i-oleje'],
      ['/pl/categories/sushi-i-algi', '/categories/do-gotowania-i-sushi'],
      ['/en/categories/grzyby-warzywa-i-tofu', '/en/categories/do-gotowania-i-sushi'],
    ]) {
      const response = await page.request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(301);
      expect(response.headers()['location'], from).toBe(to);
    }
    const renamedLeaf = await page.request.get('/categories/ramyun-ramen', { maxRedirects: 0 });
    expect([301, 307, 308]).toContain(renamedLeaf.status());
    expect(renamedLeaf.headers()['location']).toMatch(/\/categories\/ramyun-w-paczce$/);
  });

  test('sitemap lists groups and only leaves above the index threshold', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain('/categories/kimchi-i-kiszonki</loc>');
    expect(xml).toContain('/en/categories/makaron-i-ryz</loc>');
    expect(xml).not.toContain('/categories/kimchi</loc>'); // fixture leaf has 1 product (< 3)
    expect(xml).not.toContain('sosy-pasty-i-przyprawy');
  });

  test('mobile: group page shows breadcrumb and leaf tiles', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/pl/categories/kimchi-i-kiszonki');
    await expect(page.getByTestId('category-leaf-tiles').getByRole('link')).toHaveCount(2);
    await expect(page.getByTestId('category-breadcrumb')).toContainText('Kimchi i kiszonki');
  });
});
```
- [ ] **Step 5: Run** `npx playwright test tests/category-tree-pages.spec.ts --project=iphone-12 --workers=1 --reporter=line` → `Expected: FAIL (missing test ids, 404 on redirects, old sitemap)`
- [ ] **Step 6: Implement** the page, listing sidebar, hub chips, redirects and sitemap as specified in Interfaces. Sidebar nesting in `ProductListingClient.tsx` `renderDesktopSidebar()` — the `map` callback variable `category` becomes `item`, and right after the group `<Link>` add:

```tsx
{item.expanded && item.children && item.children.length > 0 && (
  <ul className="ml-3 space-y-1 border-l pl-2" style={{ borderColor: 'var(--color-border)' }} data-testid="category-tree-leaves">
    {item.children.map((leaf) => {
      const isLeafActive = currentCategorySlug === leaf.slug;
      return (
        <li key={leaf.id}>
          <Link
            href={`/categories/${leaf.slug}`}
            className="flex min-h-[2.4rem] items-center justify-between gap-2 rounded-[0.8rem] px-2.5 py-1.5 text-sm hover-surface"
            style={{ color: isLeafActive ? 'var(--color-primary)' : 'var(--color-foreground)', backgroundColor: isLeafActive ? 'var(--color-accent)' : 'transparent' }}
            aria-current={isLeafActive ? 'page' : undefined}
          >
            <span className="min-w-0 line-clamp-1">{leaf.name}</span>
            {typeof leaf.count === 'number' && <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>{leaf.count}</span>}
          </Link>
        </li>
      );
    })}
  </ul>
)}
```
  The group link keeps `aria-current` only when `currentCategorySlug === item.slug`. `next.config.js`:

```js
const categorySlugRedirects = [
  { oldSlug: 'sosy-pasty-i-przyprawy', newSlug: 'sosy-i-oleje' },
  { oldSlug: 'sushi-i-algi', newSlug: 'do-gotowania-i-sushi' },
  { oldSlug: 'grzyby-warzywa-i-tofu', newSlug: 'do-gotowania-i-sushi' },
];
// redirects(): return [
//   ...productSlugRedirects.flatMap(/* unchanged */),
//   ...categorySlugRedirects.flatMap(({ oldSlug, newSlug }) => [
//     { source: `/categories/${oldSlug}`, destination: `/categories/${newSlug}`, statusCode: 301 },
//     { source: `/pl/categories/${oldSlug}`, destination: `/categories/${newSlug}`, statusCode: 301 },
//     { source: `/en/categories/${oldSlug}`, destination: `/en/categories/${newSlug}`, statusCode: 301 },
//   ]),
// ];
```
- [ ] **Step 7: Run** `node --test tests/category-sitemap.test.mjs tests/category-tree.test.mjs` → PASS; `npx playwright test tests/category-tree-pages.spec.ts tests/categories-browsing.spec.ts tests/mobile-products-page.spec.ts tests/lean-filters.spec.ts --project=iphone-12 --workers=1 --reporter=line` → green (in `categories-browsing.spec.ts` update assertions that counted hub cards: the fixture hub now has 8 groups); `npx tsc --noEmit`, `npm run lint` → clean.
- [ ] **Step 8: Commit** — `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters add grocery-storefront/src/app grocery-storefront/src/components/product-listing/ProductListingClient.tsx grocery-storefront/src/components/categories/CategoryHubClient.tsx grocery-storefront/src/lib/category-seo.ts grocery-storefront/src/lib/category-sitemap.ts grocery-storefront/src/messages grocery-storefront/next.config.js grocery-storefront/tests/category-sitemap.test.mjs grocery-storefront/tests/category-tree-pages.spec.ts grocery-storefront/tests/categories-browsing.spec.ts` then `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters commit -m "feat(categories): group and leaf pages with breadcrumb, leaf tiles and a tree sidebar; 301s for retired slugs; sitemap from the tree"`

### Task 6: Mega menu by group and the mobile drawer accordion

**Files:**
- Modify: `src/components/layout/CategoryMegaMenu.tsx` (one column per group with its leaves; remove the promo tile, `splitIntoColumns`, `COLUMN_COUNT`)
- Create: `src/components/layout/MobileCategoryAccordion.tsx`
- Modify: `src/components/layout/Header.tsx` (mount the accordion inside the drawer right after the `mobileShopItems` block, before `mobile-cuisine-links`)
- Modify: `src/messages/pl.json`, `src/messages/en.json` (`categories.groupToggle` "Rozwiń {name}"/"Expand {name}", `categories.moreLeaves` from Task 5 reused)
- Modify: `tests/categories-browsing.spec.ts` (mega-menu test around line 534: drop the promo-tile assertions, assert group blocks instead)
- Test: `tests/category-menus.spec.ts`

**Interfaces:**
- `CategoryMegaMenu` keeps its props and `data-testid="category-mega-menu"`. Body: `<div className="grid gap-6 md:grid-cols-5">` of `<div data-testid="category-mega-menu-group">` per group in tree order; inside: `<Link data-testid="category-mega-menu-group-link" href={`/categories/${group.slug}`}>` (group name + `t('productCount')`), then `<ul>` of up to 8 `<Link data-testid="category-mega-menu-leaf">` and, when `group.children.length > 8`, a `<Link data-testid="category-mega-menu-more" href=group>` with `t('moreLeaves', { count: children.length - 8 })`. Groups come from `buildCategoryTree(nodes, locale, { requireProductCount: false })` (same source and options the menu already uses for `buildPublicCategories`).
- `MobileCategoryAccordion({ open, onNavigate }: { open: boolean; onNavigate: () => void })`: `useQuery({ query: PUBLIC_CATEGORY_NAVIGATION_QUERY, variables: { channel }, pause: !open })`; `<nav data-testid="mobile-category-accordion" aria-label={t('allCategories')}>`; per group a `<li>` with `<Link data-testid="mobile-category-group-link">` (name) and, when the group has leaves, a `<button type="button" data-testid="mobile-category-group" aria-expanded aria-controls={`mobile-category-leaves-${group.id}`} aria-label={t('groupToggle', { name })}>`; the leaf list `<ul id=... data-testid="mobile-category-leaves">` of `<Link data-testid="mobile-category-leaf" onClick={onNavigate}>`; `expandedId` state — only one group expanded at a time (toggle sets `expandedId === id ? null : id`); leafless groups render the link only. Names use `line-clamp-1`.
- `PUBLIC_CATEGORY_NAVIGATION_QUERY` already carries `level displayOrder parent { id } translation(languageCode: "en") { name }` after Task 4; the fixture slim branch returns those fields (Task 4 step for `mobile-fixtures.ts`).

- [ ] **Step 1: Write the failing spec** `tests/category-menus.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

test.describe('category menus (tree)', () => {
  test('desktop mega menu lists one block per group with its leaves', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: /kategorie/i }).hover();
    const menu = page.getByTestId('category-mega-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId('category-mega-menu-promo')).toHaveCount(0);
    await expect(menu.getByTestId('category-mega-menu-group')).toHaveCount(8);

    const kimchi = menu.getByTestId('category-mega-menu-group').filter({ hasText: 'Kimchi i kiszonki' });
    await expect(kimchi.getByTestId('category-mega-menu-group-link')).toHaveAttribute('href', '/categories/kimchi-i-kiszonki');
    await expect(kimchi.getByTestId('category-mega-menu-leaf')).toHaveCount(2);
    await expect(kimchi.getByTestId('category-mega-menu-leaf').first()).toHaveAttribute('href', '/categories/kimchi');

    const household = menu.getByTestId('category-mega-menu-group').filter({ hasText: 'Household' });
    await expect(household.getByTestId('category-mega-menu-leaf')).toHaveCount(0);
  });

  test('mobile drawer accordion expands one group at a time', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    // WebKit exposes the SSR trigger before hydration: retry the click until the drawer is open.
    await expect.poll(async () => {
      await page.getByRole('button', { name: /open menu/i }).first().click();
      return page.getByTestId('mobile-category-accordion').isVisible();
    }, { timeout: 15_000 }).toBe(true);

    const accordion = page.getByTestId('mobile-category-accordion');
    const toggles = accordion.getByTestId('mobile-category-group');
    await expect(toggles).toHaveCount(4); // groups with leaves: noodles, kimchi, cooking, cosmetics
    await expect(accordion.getByTestId('mobile-category-leaves')).toHaveCount(0);

    const kimchiToggle = toggles.filter({ has: page.locator('[aria-label*="Kimchi"]') }).first();
    await kimchiToggle.click();
    await expect(kimchiToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(accordion.getByTestId('mobile-category-leaves')).toHaveCount(1);
    await expect(accordion.getByTestId('mobile-category-leaf')).toHaveCount(2);

    const noodlesToggle = toggles.filter({ has: page.locator('[aria-label*="Noodles"]') }).first();
    await noodlesToggle.click();
    await expect(kimchiToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(noodlesToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(accordion.getByTestId('mobile-category-leaves')).toHaveCount(1);

    // A leafless group is a plain link, not a toggle.
    const householdLink = accordion.getByTestId('mobile-category-group-link').filter({ hasText: 'Household' });
    await expect(householdLink).toHaveAttribute('href', '/en/categories/household');

    await accordion.getByTestId('mobile-category-leaf').first().click();
    await expect(page).toHaveURL(/\/en\/categories\//);
    await expect(accordion).toBeHidden();
  });
});
```
  (Fixture group names: the Task 4 fixture stores `nameTranslations.en` as `Noodles & Rice`, `Kimchi & pickles`, `Cooking & sushi`, `Cosmetics`; PL names `Makaron i ryż`, `Kimchi i kiszonki`, `Do gotowania i sushi`, `Kosmetyki`. The `[aria-label*=...]` filters match the EN toggle labels because the drawer test runs on `/en`.)
- [ ] **Step 2: Run** `npx playwright test tests/category-menus.spec.ts --project=iphone-12 --workers=1 --reporter=line` → `Expected: FAIL — mobile-category-accordion missing; promo tile present`
- [ ] **Step 3: Implement** `MobileCategoryAccordion.tsx`:

```tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useQuery } from 'urql';

import { useChannel } from '@/components/ChannelProvider';
import { Link } from '@/i18n/navigation';
import { PUBLIC_CATEGORY_NAVIGATION_QUERY } from '@/lib/queries/grocery';
import { buildCategoryTree, type PublicTaxonomyRawCategory } from '@/lib/public-taxonomy';

interface CategoriesResponse { categories: { edges: Array<{ node: PublicTaxonomyRawCategory }> } | null }

export function MobileCategoryAccordion({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const t = useTranslations('categories');
  const locale = useLocale();
  const channel = useChannel();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [result] = useQuery<CategoriesResponse>({ query: PUBLIC_CATEGORY_NAVIGATION_QUERY, variables: { channel }, pause: !open });

  const groups = useMemo(
    () => buildCategoryTree(result.data?.categories?.edges.map((edge) => edge.node) ?? [], locale, { requireProductCount: false }),
    [locale, result.data],
  );

  if (groups.length === 0) return null;

  return (
    <nav data-testid="mobile-category-accordion" aria-label={t('allCategories')} className="mt-2 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
      <ul className="space-y-1">
        {groups.map((group) => {
          const expanded = expandedId === group.id;
          const hasLeaves = group.children.length > 0;
          return (
            <li key={group.id}>
              <div className="flex items-center gap-1">
                <Link
                  href={`/categories/${group.slug}`}
                  onClick={onNavigate}
                  data-testid="mobile-category-group-link"
                  className="flex min-h-11 min-w-0 flex-1 items-center rounded-[0.8rem] px-3 text-[15px] font-semibold hover-surface"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  <span className="line-clamp-1">{group.name}</span>
                </Link>
                {hasLeaves && (
                  <button
                    type="button"
                    data-testid="mobile-category-group"
                    aria-expanded={expanded}
                    aria-controls={`mobile-category-leaves-${group.id}`}
                    aria-label={t('groupToggle', { name: group.name })}
                    onClick={() => setExpandedId(expanded ? null : group.id)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.8rem] hover-surface"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                )}
              </div>
              {hasLeaves && expanded && (
                <ul id={`mobile-category-leaves-${group.id}`} data-testid="mobile-category-leaves" className="ml-4 space-y-0.5 border-l pl-2" style={{ borderColor: 'var(--color-border)' }}>
                  {group.children.map((leaf) => (
                    <li key={leaf.id}>
                      <Link
                        href={`/categories/${leaf.slug}`}
                        onClick={onNavigate}
                        data-testid="mobile-category-leaf"
                        className="flex min-h-10 items-center justify-between gap-2 rounded-[0.8rem] px-3 text-sm hover-surface"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        <span className="line-clamp-1">{leaf.name}</span>
                        {typeof leaf.products.totalCount === 'number' && (
                          <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>{leaf.products.totalCount}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```
  In `Header.tsx` mount `<MobileCategoryAccordion open={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />` directly after the `mobileShopItems` list (use the existing drawer state variable and setter names that `Dialog.Root open=... onOpenChange=...` already reads around line 633). If the header uses `useChannel` from a different module path, keep whatever `CategoryMegaMenu.tsx` imports today. In `CategoryMegaMenu.tsx` replace the columns/promo rendering with the group grid from Interfaces; delete `splitIntoColumns`, `COLUMN_COUNT`, the `category-mega-menu-promo` markup and its `getImageSrc` import if unused.
- [ ] **Step 4: Run** `npx playwright test tests/category-menus.spec.ts tests/categories-browsing.spec.ts tests/cuisines-menu.spec.ts tests/mobile-layout.spec.ts --project=iphone-12 --workers=1 --reporter=line` → PASS; then `npx playwright test tests/category-menus.spec.ts --project=pixel-7 --workers=1 --reporter=line` → PASS; `npx tsc --noEmit`, `npm run lint` → clean.
- [ ] **Step 5: Commit** — `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters add grocery-storefront/src/components/layout grocery-storefront/src/messages grocery-storefront/tests/category-menus.spec.ts grocery-storefront/tests/categories-browsing.spec.ts` then `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters commit -m "feat(navigation): mega menu grouped by category tree; mobile drawer accordion"`

### Task 7: Landing — trust row, "Polecane" featured shelf, SEO text

**Files:**
- Modify: `src/types/storefront-config.ts` (`TrustRowIcon`, `CommercialTrustRowItem`, `CommercialTrustRowConfig`, `HomepageFeaturedConfig`, `HomepageSeoTextConfig`; `CommercialConfig.trustRow`, `HomepageConfig.featured`, `HomepageConfig.seoText`)
- Modify: `src/lib/storefront-config-shared.ts` (`DEFAULT_TRUST_ROW`, defaults merge in `withStorefrontConfigDefaults`)
- Create: `src/lib/home-featured.ts`
- Modify: `src/app/[locale]/(shop)/page.tsx` (`HomeFulfillmentTrust` guided branch → trust row; featured query; heading; `HomeSeoText`)
- Modify: `src/messages/pl.json`, `src/messages/en.json` (`home.recommended` "Polecane"/"Recommended", `home.seeAllRecommended` "Zobacz polecane"/"See recommended"; delete `fulfillment.pickupGuide*` keys — 7 keys per locale)
- Modify: `tests/mobile-layout.spec.ts:107` (assert `home-trust-row` has 4 `li` instead of the `home-pickup-guide` steps) and `tests/landing-responsive-grid.spec.ts:223-224` (assert `home-trust-row` contains "Odbiór osobisty w Warszawie" instead of "Jak odebrać zamówienie")
- Test: `tests/home-featured.test.mjs`, `tests/landing-wave2.spec.ts`

**Interfaces:**
```ts
export type TrustRowIcon = 'map-pin' | 'check-circle' | 'credit-card' | 'package';
export interface CommercialTrustRowItem { id: string; icon: TrustRowIcon; title: string; description: string; titleEn: string; descriptionEn: string; enabled: boolean; order: number }
export interface CommercialTrustRowConfig { enabled: boolean; items: CommercialTrustRowItem[] }
export interface HomepageFeaturedConfig { categorySlugs: string[] }
export interface HomepageSeoTextConfig { enabled: boolean; headline: string; paragraphs: string[]; headlineEn: string; paragraphsEn: string[] }
// CommercialConfig gains `trustRow: CommercialTrustRowConfig`; HomepageConfig gains `featured: HomepageFeaturedConfig` and `seoText: HomepageSeoTextConfig`.
```
- `DEFAULT_TRUST_ROW: CommercialTrustRowConfig = { enabled: true, items: [ {id:'trust-pickup', icon:'map-pin', title:'Odbiór osobisty w Warszawie', description:'Zamów online, odbierz w sklepie', titleEn:'Pickup in Warsaw', descriptionEn:'Order online, collect in store', enabled:true, order:0}, {id:'trust-confirmation', icon:'check-circle', title:'Potwierdzenie ręczne w godzinach otwarcia', description:'Sklep potwierdza dostępność i termin odbioru', titleEn:'Confirmed by hand during opening hours', descriptionEn:'The shop confirms availability and pickup time', enabled:true, order:1}, {id:'trust-payment', icon:'credit-card', title:'Płatność online (Przelewy24, BLIK) lub przy odbiorze', description:'Wybierz wygodną formę płatności', titleEn:'Pay online (Przelewy24, BLIK) or on pickup', descriptionEn:'Choose the payment that suits you', enabled:true, order:2}, {id:'trust-catalog', icon:'package', title:'Ponad 1 700 produktów z Azji', description:'Korea, Japonia, Wietnam, Tajlandia i więcej', titleEn:'Over 1,700 products from Asia', descriptionEn:'Korea, Japan, Vietnam, Thailand and more', enabled:true, order:3} ] }`; `withStorefrontConfigDefaults` sets `commercial.trustRow = { enabled: input?.trustRow?.enabled ?? true, items: input?.trustRow?.items?.length ? input.trustRow.items : DEFAULT_TRUST_ROW.items }`, `homepage.featured = { categorySlugs: input?.featured?.categorySlugs ?? [] }`, `homepage.seoText = { enabled: false, headline: '', paragraphs: [], headlineEn: '', paragraphsEn: [], ...input?.seoText }`.
- `src/lib/home-featured.ts`: `export const ADG_DEFAULT_FEATURED_LEAVES = ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada'] as const;` `export function resolveFeaturedLeafIds(groups: Array<Pick<PublicCategory, 'slug' | 'id' | 'children'>>, configuredSlugs: string[], isAsiaDeliGo: boolean): string[]` — slugs = `configuredSlugs.length ? configuredSlugs : (isAsiaDeliGo ? ADG_DEFAULT_FEATURED_LEAVES : [])`; for each slug in order find a leaf (`group.children`) or a group with that slug; a group contributes its `rawCategoryIds`; unknown slugs are skipped; result deduplicated, order preserved.
- `page.tsx`: `const featuredIds = useMemo(() => resolveFeaturedLeafIds(buildCategoryTree(categories, locale, { requireProductCount: false }), siteConfig?.homepage?.featured?.categorySlugs ?? [], isAsiaDeliGo), [...])`; `const [featuredResult] = useQuery({ query: PRODUCT_LISTING_QUERY, pause: featuredIds.length === 0, variables: { channel, first: 8, filter: { categories: featuredIds } } })`; `const isRecommended = featuredIds.length > 0`; `productsForFreshPicks = isRecommended ? featuredProducts : (freshPicks.length > 0 ? freshPicks : products)`; both `freshPicks` headings render `isRecommended ? t('recommended') : t('newArrivals')` and the see-all link `isRecommended ? { href: `/categories/${firstFeaturedSlug}`, label: t('seeAllRecommended') } : { href: '/products', label: t('seeAllProducts') }`. The existing `CATEGORIES_QUERY` in the page gains the same four fields as `PUBLIC_CATEGORY_NAVIGATION_QUERY` (Task 4) so the tree adapter can run on its result. The `useQuery` for featured must run only after `categoriesResult.data` resolves (pause while `featuredIds.length === 0`), so the first client request for the shelf already carries the leaf ids — urql caches by variables, so no duplicate request is issued when config and categories are stable.
- `HomeFulfillmentTrust` guided branch (`guidedPickup === true`) renders `<ul data-testid="home-trust-row" className="grid grid-cols-2 gap-3 md:grid-cols-4">` of `<li data-testid="home-trust-row-item">` for `trustRow.items.filter(enabled).sort(order)` using icons `{ 'map-pin': MapPin, 'check-circle': CheckCircle2, 'credit-card': CreditCard, package: Package }` from `lucide-react`, title/description picked by locale (`isEnglishLocale(locale) ? item.titleEn || item.title : item.title`). `data-testid="home-pickup-guide"` and the three steps are removed. When `trustRow.enabled === false` the guided branch renders nothing. The non-guided branch (kenmito/generic) is unchanged.
- `HomeSeoText({ seoText, locale })` renders `<section data-testid="home-seo-text" className="container-grocery py-8">` with `<h2>` headline and `<p>` per paragraph (locale-picked, EN falls back to PL); returns null when `!seoText.enabled || paragraphs.length === 0`. Rendered once at the bottom of the page (outside the `md:hidden` / `hidden md:block` layout wrappers) so mobile and desktop share it.

- [ ] **Step 1: Write the failing node test** `tests/home-featured.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { ADG_DEFAULT_FEATURED_LEAVES, resolveFeaturedLeafIds } from '../src/lib/home-featured.ts';

const groups = [
  { id: 'g-noodles', slug: 'makaron-i-ryz', children: [{ id: 'l-buldak', slug: 'buldak-i-ramyun-ostre' }, { id: 'l-cup', slug: 'ramyun-w-kubku-i-misce' }], rawCategoryIds: ['l-buldak', 'l-cup'] },
  { id: 'g-kimchi', slug: 'kimchi-i-kiszonki', children: [{ id: 'l-kimchi', slug: 'kimchi' }], rawCategoryIds: ['l-kimchi'] },
];

test('configured slugs win over the ADG fallback and keep their order', () => {
  assert.deepEqual(resolveFeaturedLeafIds(groups, ['kimchi', 'buldak-i-ramyun-ostre'], true), ['l-kimchi', 'l-buldak']);
});

test('ADG without config falls back to the default leaves and skips unknown ones', () => {
  assert.deepEqual(ADG_DEFAULT_FEATURED_LEAVES, ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada']);
  assert.deepEqual(resolveFeaturedLeafIds(groups, [], true), ['l-buldak', 'l-kimchi']);
});

test('a non-ADG storefront with no config gets no featured ids (keeps Nowosci)', () => {
  assert.deepEqual(resolveFeaturedLeafIds(groups, [], false), []);
});

test('a group slug expands to its leaf ids without duplicates', () => {
  assert.deepEqual(resolveFeaturedLeafIds(groups, ['makaron-i-ryz', 'buldak-i-ramyun-ostre'], false), ['l-buldak', 'l-cup']);
});
```
- [ ] **Step 2: Run** `node --test tests/home-featured.test.mjs` → `Expected: FAIL — cannot find module`
- [ ] **Step 3: Implement** `src/lib/home-featured.ts`:

```ts
import type { PublicCategory } from '@/lib/public-taxonomy';

export const ADG_DEFAULT_FEATURED_LEAVES = ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada'] as const;

type FeaturedGroup = Pick<PublicCategory, 'id' | 'slug' | 'rawCategoryIds'> & { children: Array<Pick<PublicCategory['children'][number], 'id' | 'slug'>> };

export function resolveFeaturedLeafIds(groups: FeaturedGroup[], configuredSlugs: string[], isAsiaDeliGo: boolean): string[] {
  const slugs = configuredSlugs.length > 0 ? configuredSlugs : isAsiaDeliGo ? [...ADG_DEFAULT_FEATURED_LEAVES] : [];
  const ids: string[] = [];
  const push = (id: string) => { if (!ids.includes(id)) ids.push(id); };
  for (const slug of slugs) {
    const group = groups.find((candidate) => candidate.slug === slug);
    if (group) { group.rawCategoryIds.forEach(push); continue; }
    for (const candidate of groups) {
      const leaf = candidate.children.find((child) => child.slug === slug);
      if (leaf) { push(leaf.id); break; }
    }
  }
  return ids;
}
```
- [ ] **Step 4: Write the failing Playwright spec** `tests/landing-wave2.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

const ADG_CONFIG = JSON.parse(readFileSync(path.join(process.cwd(), 'public/config/asiandeligo.json'), 'utf8'));

async function mockAsiaDeliGoConfig(page: import('@playwright/test').Page) {
  await page.route('**/api/config/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADG_CONFIG) }));
}

type ProductVariables = { filter?: { categories?: unknown } };

test.describe('landing wave 2', () => {
  test('ADG pl: trust row replaces the pickup guide, shelf is Polecane, seo text renders', async ({ page }) => {
    const queries: ProductVariables[] = [];
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page, { onProductsQuery: (variables) => queries.push(JSON.parse(JSON.stringify(variables))) });
    await page.goto('/pl');

    const trustRow = page.getByTestId('home-trust-row').first();
    await expect(trustRow.getByTestId('home-trust-row-item')).toHaveCount(4);
    await expect(trustRow).toContainText('Odbiór osobisty w Warszawie');
    await expect(page.getByTestId('home-pickup-guide')).toHaveCount(0);

    const shelf = page.getByTestId('mobile-home-fresh-picks');
    await expect(shelf.getByRole('heading', { level: 2 })).toHaveText('Polecane');
    await expect(shelf).not.toContainText('Nowości');
    await expect.poll(() => queries.some((variables) => Array.isArray(variables.filter?.categories) && (variables.filter!.categories as string[]).includes('cat-kimchi'))).toBe(true);

    const seo = page.getByTestId('home-seo-text');
    await expect(seo.getByRole('heading', { level: 2 })).toContainText('Asia Deli Go');
    await expect(seo.getByRole('paragraph')).toHaveCount(2);
  });

  test('ADG en: trust row and seo text use the English copy', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en');
    await expect(page.getByTestId('home-trust-row').first()).toContainText('Pickup in Warsaw');
    await expect(page.getByTestId('mobile-home-fresh-picks').getByRole('heading', { level: 2 })).toHaveText('Recommended');
    await expect(page.getByTestId('home-seo-text').getByRole('paragraph').first()).not.toContainText('Warszawie');
  });

  test('generic storefront keeps Nowości and has no trust row or seo text', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/pl');
    await expect(page.getByTestId('mobile-home-fresh-picks').getByRole('heading', { level: 2 })).toHaveText('Nowości');
    await expect(page.getByTestId('home-trust-row')).toHaveCount(0);
    await expect(page.getByTestId('home-seo-text')).toHaveCount(0);
  });

  test('desktop ADG: Polecane heading and 4 trust items', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');
    await expect(page.getByTestId('desktop-home-fresh-picks').getByRole('heading', { level: 2 })).toHaveText('Polecane');
    await expect(page.locator('[data-testid="home-trust-row"]:visible').getByTestId('home-trust-row-item')).toHaveCount(4);
  });
});
```
  (The generic mock config has no `commercial.categoryHub` grid blocks, so `guidedPickup` is false and the non-guided trust items render — no `home-trust-row` test id there. The ADG static config gets `trustRow`, `featured` and `seoText` in Task 8 step 5; until then the last two ADG assertions fail — that is expected TDD order. Run Task 8 step 5 before the final green run of this spec.)
- [ ] **Step 5: Run** `npx playwright test tests/landing-wave2.spec.ts --project=iphone-12 --workers=1 --reporter=line` → `Expected: FAIL — home-trust-row missing, heading Nowości`
- [ ] **Step 6: Implement** types, defaults, page changes per Interfaces. Trust row JSX inside `HomeFulfillmentTrust` guided branch:

```tsx
const TRUST_ICONS = { 'map-pin': MapPin, 'check-circle': CheckCircle2, 'credit-card': CreditCard, package: Package } as const;
// HomeFulfillmentTrust props now include trustRow and english; guided branch:
if (guidedPickup) {
  if (!trustRow.enabled) return null;
  const items = trustRow.items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);
  if (items.length === 0) return null;
  return (
    <section className="container-grocery py-4" aria-label={tFulfillment('trustLabel')}>
      <ul data-testid="home-trust-row" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => {
          const Icon = TRUST_ICONS[item.icon] ?? Package;
          const title = english ? item.titleEn || item.title : item.title;
          const description = english ? item.descriptionEn || item.description : item.description;
          return (
            <li key={item.id} data-testid="home-trust-row-item" className="flex items-start gap-3 rounded-[1.25rem] border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}>
                <Icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</span>
                {description && <span className="block text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{description}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```
  `HomeFulfillmentTrust` gains props `trustRow: CommercialTrustRowConfig` and `english: boolean` (`isEnglishLocale(locale)` from `@/lib/catalog-display-localization`); `tFulfillment('trustLabel')` — add `fulfillment.trustLabel` "Dlaczego Asia Deli Go"/"Why Asia Deli Go" to both message files. Delete the `pickupGuide*` keys and the `home-pickup-guide` markup.
- [ ] **Step 7: Update** `tests/mobile-layout.spec.ts:107` (replace the `home-pickup-guide` `li` count with `await expect(page.getByTestId('home-trust-row').first().getByTestId('home-trust-row-item')).toHaveCount(4);`) and `tests/landing-responsive-grid.spec.ts:223-224` (replace the pickup-guide text assertions with `await expect(page.getByTestId('home-trust-row').first()).toContainText('Odbiór osobisty w Warszawie');`). Also `grep -rn "pickupGuide\|home-pickup-guide" src tests` must return nothing after this step.
- [ ] **Step 8: Run** `node --test tests/home-featured.test.mjs` → PASS; `npx playwright test tests/landing-wave2.spec.ts tests/mobile-layout.spec.ts tests/landing-responsive-grid.spec.ts tests/mobile-homepage.spec.ts tests/kenmito-launch-hardening.spec.ts --project=iphone-12 --workers=1 --reporter=line` → PASS (ADG-config assertions pass only once Task 8 step 5 is done; do that step first if running this before Task 8); `npx tsc --noEmit`, `npm run lint` → clean.
- [ ] **Step 9: Commit** — `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters add grocery-storefront/src/types/storefront-config.ts grocery-storefront/src/lib/storefront-config-shared.ts grocery-storefront/src/lib/home-featured.ts "grocery-storefront/src/app/[locale]/(shop)/page.tsx" grocery-storefront/src/messages grocery-storefront/tests/home-featured.test.mjs grocery-storefront/tests/landing-wave2.spec.ts grocery-storefront/tests/mobile-layout.spec.ts grocery-storefront/tests/landing-responsive-grid.spec.ts` then `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters commit -m "feat(landing): trust row from config, Polecane shelf from featured leaves, homepage seo text"`

### Task 8: Admin panel schema/editors, static configs, contract tests

**Files:**
- Modify (admin-panel `/home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters/admin-panel`): `src/types/config.ts` (same five types as Task 7 + the three new fields), `src/lib/defaults.ts` (`DEFAULT_CONFIG.commercial.trustRow` = `DEFAULT_TRUST_ROW` copy, `homepage.featured = { categorySlugs: [] }`, `homepage.seoText = { enabled: false, headline: '', paragraphs: [], headlineEn: '', paragraphsEn: [] }`), `src/lib/config-repository.ts:24-53` (`withConfigDefaults` merges the three new fields — items fallback to defaults when missing/empty, seoText spread over defaults, featured `categorySlugs` filtered to non-empty trimmed strings), `src/components/CommercialConfigEditor.tsx` (mount `TrustRowConfigEditor` under `CategoryHubConfigEditor`), `src/app/admin/homepage/page.tsx` (two new `FormCard`s: "Polecane na stronie głównej" with a comma-separated slug input bound to `homepage.featured.categorySlugs`, and "Tekst SEO" with enabled checkbox, PL/EN headline inputs, PL/EN textareas where one paragraph per blank-line-separated block), `src/i18n/translations/{pl,en,vi}.ts` (keys below), `src/lib/config-repository.test.ts` (new case)
- Create (admin-panel): `src/components/TrustRowConfigEditor.tsx` (copy the structure of `CategoryHubConfigEditor.tsx`: FieldLabel, INPUT_CLASS, reorder/normalizeOrder, enable checkbox per item; fields: icon `<select>` with the four `TrustRowIcon` values, title, description, titleEn, descriptionEn; add/remove item with `id: \`trust-${Date.now()}\``)
- Modify (storefront): `public/config/asiandeligo.json`, `tests/static-config-contract.test.mjs`
- Modify (admin-panel): `data/config-asiandeligo.json` (`published` and `draft` both)

**Interfaces:**
- i18n keys (pl / en / vi): `layout.commercial.trustRow.title` ("Pasek zaufania" / "Trust row" / "Thanh tin cậy"), `.hint` ("Cztery krótkie obietnice pod bannerem na stronie głównej." / "Four short promises under the hero." / "Bốn cam kết ngắn dưới banner."), `.enable` ("Pokaż pasek zaufania" / "Show trust row" / "Hiện thanh tin cậy"), `.addItem` ("Dodaj pozycję" / "Add item" / "Thêm mục"), `.icon` ("Ikona" / "Icon" / "Biểu tượng"), `.titlePl` ("Tytuł (PL)" / "Title (PL)" / "Tiêu đề (PL)"), `.descriptionPl` ("Opis (PL)" / "Description (PL)" / "Mô tả (PL)"), `.titleEn` ("Tytuł (EN)" / "Title (EN)" / "Tiêu đề (EN)"), `.descriptionEn` ("Opis (EN)" / "Description (EN)" / "Mô tả (EN)"); `homepage.featured.title` ("Polecane na stronie głównej" / "Featured on the homepage" / "Nổi bật trên trang chủ"), `homepage.featured.slugs` ("Slugi podkategorii (po przecinku)" / "Leaf category slugs (comma separated)" / "Slug danh mục con (phân cách bằng dấu phẩy)"), `homepage.featured.hint` ("Puste = sklep użyje domyślnych podkategorii." / "Empty = the storefront uses its default leaves." / "Trống = cửa hàng dùng danh mục mặc định."), `homepage.seoText.title` ("Tekst SEO" / "SEO text" / "Văn bản SEO"), `homepage.seoText.enable` ("Pokaż tekst SEO na dole strony głównej" / "Show SEO text at the bottom of the homepage" / "Hiện văn bản SEO ở cuối trang chủ"), `homepage.seoText.headlinePl`, `.headlineEn`, `.paragraphsPl`, `.paragraphsEn` ("Nagłówek (PL)"…, "Akapity (PL) — oddziel pustą linią" / "Paragraphs (PL) — separate with a blank line" / "Đoạn văn (PL) — cách nhau bằng dòng trống", and the EN variants).
- Static config edits (`public/config/asiandeligo.json` → `config.*`; admin `data/config-asiandeligo.json` → `published.*` and `draft.*`, keep `version` and bump it by 1 in the admin file):
  - `commercial.categoryHub.items`: `categorySlug` renames `sosy-pasty-i-przyprawy` → `sosy-i-oleje`, `sushi-i-algi` → `do-gotowania-i-sushi`, `grzyby-warzywa-i-tofu` → `pasty-przyprawy-i-buliony`; `imageUrl` values unchanged; the other seven items keep their slugs (they already match group slugs: `makaron-i-ryz`, `kimchi-i-kiszonki`, `slodycze-i-przekaski`, `napoje-kawa-i-herbata`, `dania-gotowe-i-mrozonki`, `kosmetyki`, `akcesoria-i-naczynia` — check each against the 10 group slugs in `category-tree.json` and fix any that differ).
  - `homepage.blocks[]` grid items: every `href` of the form `/pl/categories/<old>` for the three retired slugs is re-pointed to the new group slug (`/pl/categories/sosy-i-oleje`, `/pl/categories/do-gotowania-i-sushi`, `/pl/categories/pasty-przyprawy-i-buliony`).
  - add `commercial.trustRow` = `DEFAULT_TRUST_ROW` (verbatim items from Task 7).
  - add `homepage.featured = { "categorySlugs": ["buldak-i-ramyun-ostre", "kimchi", "pocky-pepero-i-czekolada"] }`.
  - add `homepage.seoText = { "enabled": true, "headline": "Asia Deli Go — azjatyckie produkty spożywcze w Warszawie", "paragraphs": ["Asia Deli Go to sklep z azjatyckimi produktami spożywczymi w Warszawie: koreański ramyun i kimchi, japońskie makarony, sosy i przyprawy, wietnamski papier ryżowy, tajskie pasty curry oraz słodycze i napoje z całej Azji. Zamawiasz online, my potwierdzamy dostępność i przygotowujemy odbiór w sklepie.", "W ofercie znajdziesz ponad 1 700 produktów pogrupowanych w przejrzyste kategorie — od makaronów i ryżu, przez kimchi i kiszonki, po akcesoria kuchenne i koreańskie kosmetyki. Płatność online przez Przelewy24 i BLIK albo przy odbiorze."], "headlineEn": "Asia Deli Go — Asian grocery store in Warsaw", "paragraphsEn": ["Asia Deli Go is an Asian grocery store in Warsaw: Korean ramyun and kimchi, Japanese noodles, sauces and seasonings, Vietnamese rice paper, Thai curry pastes plus sweets and drinks from all over Asia. Order online, we confirm availability and prepare your pickup in store.", "Browse over 1,700 products in clear categories — from noodles and rice, through kimchi and pickles, to kitchenware and Korean cosmetics. Pay online with Przelewy24 or BLIK, or on pickup."] }`.

- [ ] **Step 1: Add the failing contract assertions** to `tests/static-config-contract.test.mjs` (next to the categoryHub asserts at lines 105–111; `envelope` = parsed `public/config/asiandeligo.json`, `adminEnvelope` = parsed admin `data/config-asiandeligo.json`):

```js
test('ADG category hub points only at live group slugs', () => {
  const retired = ['sosy-pasty-i-przyprawy', 'sushi-i-algi', 'grzyby-warzywa-i-tofu'];
  const groupSlugs = new Set(JSON.parse(fs.readFileSync(process.env.ADG_CATEGORY_TREE_JSON ?? '/var/www/www/enail/.worktrees/adg-category-tree/backend/src/scripts/adg/category-tree.json', 'utf8')).groups.map((group) => group.slug));
  for (const item of envelope.config.commercial.categoryHub.items) {
    assert.ok(!retired.includes(item.categorySlug), `retired slug ${item.categorySlug}`);
    assert.ok(groupSlugs.has(item.categorySlug), `unknown group slug ${item.categorySlug}`);
  }
  const json = JSON.stringify(envelope.config.homepage.blocks);
  for (const slug of retired) assert.equal(json.includes(`/categories/${slug}`), false, `grid still links to ${slug}`);
});

test('ADG trust row, featured leaves and seo text are configured in both storefront and admin copies', () => {
  for (const [label, config] of [['storefront', envelope.config], ['admin published', adminEnvelope.published], ['admin draft', adminEnvelope.draft]]) {
    assert.equal(config.commercial.trustRow.enabled, true, label);
    assert.deepEqual(config.commercial.trustRow.items.map((item) => item.id), ['trust-pickup', 'trust-confirmation', 'trust-payment', 'trust-catalog'], label);
    for (const item of config.commercial.trustRow.items) {
      assert.ok(['map-pin', 'check-circle', 'credit-card', 'package'].includes(item.icon), `${label} ${item.id} icon`);
      assert.ok(item.title && item.titleEn, `${label} ${item.id} titles`);
    }
    assert.deepEqual(config.homepage.featured.categorySlugs, ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada'], label);
    assert.equal(config.homepage.seoText.enabled, true, label);
    assert.match(config.homepage.seoText.headline, /Asia Deli Go/, label);
    assert.equal(config.homepage.seoText.paragraphs.length, 2, label);
    assert.equal(config.homepage.seoText.paragraphsEn.length, 2, label);
  }
});

test('storefront and admin ADG configs agree on hub, trust row, featured and seo text', () => {
  for (const key of ['commercial.categoryHub', 'commercial.trustRow', 'homepage.featured', 'homepage.seoText']) {
    const pick = (config) => key.split('.').reduce((value, part) => value?.[part], config);
    assert.deepEqual(pick(adminEnvelope.published), pick(envelope.config), `${key} published`);
    assert.deepEqual(pick(adminEnvelope.draft), pick(envelope.config), `${key} draft`);
  }
});
```
  If the contract file already resolves the backend repo differently (check how `adminEnvelope` is loaded at the top of the file and follow that convention for the path), replace the `category-tree.json` path with the same style; the point is that the hub slugs are checked against the committed tree file, not against a hard-coded copy. If the backend worktree is not checked out at that path on the machine running the test, resolve `process.env.ADG_CATEGORY_TREE_JSON ?? <that path>` and `test.skip` with a message when the file is missing.
- [ ] **Step 2: Add the failing admin repository case** to `src/lib/config-repository.test.ts`:

```ts
test('withConfigDefaults fills trustRow items, featured slugs and seoText for old configs', () => {
  const merged = withConfigDefaults({ ...DEFAULT_CONFIG, commercial: { ...DEFAULT_CONFIG.commercial, trustRow: undefined }, homepage: { ...DEFAULT_CONFIG.homepage, featured: undefined, seoText: { enabled: true, headline: 'X' } } } as never);
  assert.equal(merged.commercial.trustRow.items.length, 4);
  assert.equal(merged.commercial.trustRow.items[0].id, 'trust-pickup');
  assert.deepEqual(merged.homepage.featured, { categorySlugs: [] });
  assert.deepEqual(merged.homepage.seoText, { enabled: true, headline: 'X', paragraphs: [], headlineEn: '', paragraphsEn: [] });
});
```
- [ ] **Step 3: Run** `node --test tests/static-config-contract.test.mjs` (storefront) and `npx tsx --test src/lib/config-repository.test.ts` (admin) → `Expected: FAIL on the new cases only`
- [ ] **Step 4: Implement** admin types/defaults/`withConfigDefaults`/editors/i18n. `withConfigDefaults` addition:

```ts
const trustRowInput = input.commercial?.trustRow;
const seoInput = input.homepage?.seoText;
// inside the returned object:
commercial: {
  ...DEFAULT_CONFIG.commercial,
  ...input.commercial,
  categoryHub: /* existing merge unchanged */,
  trustRow: {
    enabled: trustRowInput?.enabled ?? DEFAULT_CONFIG.commercial.trustRow.enabled,
    items: trustRowInput?.items?.length ? trustRowInput.items : DEFAULT_CONFIG.commercial.trustRow.items,
  },
},
homepage: {
  ...DEFAULT_CONFIG.homepage,
  ...input.homepage,
  featured: { categorySlugs: (input.homepage?.featured?.categorySlugs ?? []).map((slug) => slug.trim()).filter(Boolean) },
  seoText: { ...DEFAULT_CONFIG.homepage.seoText, ...seoInput },
},
```
- [ ] **Step 5: Edit the static configs** as listed in Interfaces (both repos; admin `published` and `draft`; bump admin `version`). Verify with `node -e "const c=require('./public/config/asiandeligo.json').config; console.log(c.commercial.categoryHub.items.map(i=>i.categorySlug).join(','), c.homepage.featured.categorySlugs.length, c.homepage.seoText.paragraphs.length)"` → `Expected:` 10 slugs none of which are retired, `3 2`.
- [ ] **Step 6: Run** `node --test tests/static-config-contract.test.mjs` → PASS; admin `npx tsx --test src/lib/config-repository.test.ts` → PASS; admin `npx tsc --noEmit` and `npm run lint` → clean; storefront `npx playwright test tests/landing-wave2.spec.ts tests/landing-responsive-grid.spec.ts --project=iphone-12 --workers=1 --reporter=line` → PASS (now that the ADG config carries trustRow/featured/seoText).
- [ ] **Step 7: Commit** — `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters add admin-panel/src admin-panel/data/config-asiandeligo.json grocery-storefront/public/config/asiandeligo.json grocery-storefront/tests/static-config-contract.test.mjs` then `git -C /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters commit -m "feat(admin): trust row, featured leaves and seo text editors; ADG config points at the new category groups"`

### Task 9: Full verification on dev and Paul's review

**Files:** none new. Uses the storefront worktree, the backend worktree (`/var/www/www/enail/.worktrees/adg-category-tree`) and the dev host.

- [ ] **Step 1: Storefront full checks** (from `grocery-storefront`): `npx tsc --noEmit`; `npm run lint`; `node --test tests/*.test.mjs` → all PASS; `npx playwright test --project=iphone-12 --workers=1 --reporter=line` → green; `npx playwright test --project=desktop-layout --workers=1 --reporter=line` → green; `npx playwright test tests/catalog-display-localization.regression-1.spec.ts tests/category-menus.spec.ts --project=pixel-7 --workers=1 --reporter=line` → green. One run at a time; do not edit files while a run is in progress.
- [ ] **Step 2: Admin checks** (from `admin-panel`): `npx tsc --noEmit`; `npm run lint`; `npx tsx --test src/lib/config-repository.test.ts` → PASS.
- [ ] **Step 3: Backend checks** (from the backend worktree): `npx jest src/scripts/adg/apply-category-tree.lib.spec.ts --maxWorkers=1` → PASS; `npx tsc --noEmit -p tsconfig.json` → clean. Dev DB already migrated in Task 3; re-run the 8 verification queries from Task 3 step 7 → same expected results.
- [ ] **Step 4: Deploy storefront + admin to dev**: `deploy/adg-dev.sh --from /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters` (both apps; the dev backend already serves the new tree). Then patch the dev admin live config so the dev site shows the wave-2 landing: copy `admin-panel/data/config-asiandeligo.json` over `/var/www/adg-dev/admin/shared/data/config-asiandeligo.json` (`published` and `draft`), keeping the dev file's `updatedAt`/`publishedAt` if the deploy script does not already sync it.
- [ ] **Step 5: Dev smoke (browser, dev URL)**: `/pl` shows the trust row (4 items), the group tiles from the grid block linking to the 10 group slugs, the "Polecane" shelf with products from `buldak-i-ramyun-ostre`/`kimchi`/`pocky-pepero-i-czekolada`, and the SEO text at the bottom; `/pl/categories/makaron-i-ryz` lists leaf tiles and products from every leaf; `/pl/categories/kimchi` shows the breadcrumb and the expanded group in the sidebar; `/pl/categories/sosy-pasty-i-przyprawy` → 301 to `/categories/sosy-i-oleje`; `/pl/categories/ramyun-ramen` → redirect to `/categories/ramyun-w-paczce`; mega menu hover shows 10 group columns; mobile drawer accordion expands one group at a time; `/sitemap.xml` lists the 10 groups and leaves with ≥ 3 products in pl and en; `/en` shows English trust row and "Recommended". Take screenshots of `/pl` (mobile + desktop), `/pl/categories/makaron-i-ryz`, the mega menu, and the mobile drawer into the scratchpad and attach them to the review message.
- [ ] **Step 6: Paul's review** — send the dev URL, the screenshots and these open questions: (a) `imbir-marynowany` (7 products) and `pasta-miso` (2) stay CHILLED per the hygiene rule in Task 3 — confirm or move to AMBIENT; (b) the hero slide that mentions frozen goods — keep, reword, or drop now that no product is FROZEN; (c) approve the trust-row and SEO-text copy (PL/EN) or send replacements — the copy lives in the two static configs (Task 8), so changes are config edits, not code. Do not start Task 10 before Paul's OK.
  - **Decided 2026-09-28** (Paul: "bạn tự duyệt", no product data beyond "same range as kimchi.pl"): (a) imbir + miso → AMBIENT, as kimchi.pl/asiafoods sell them shelf-stable; only 8 items stay CHILLED. (b) Hero slide 01 ("PRODUKTY MROŻONE") → `enabled: false`; slide 02 was already off. (c) Trust row kept (COD is on); categories carry Polish descriptions from the real product mix (eNail `9dd981c74`). Round grid: "Sushi i algi" → `algi-nori-wakame-kombu`, "Grzyby i tofu" → "Grzyby suszone" / `grzyby-suszone` (no two tiles on one href; contract-tested). Hub: `sosy-i-oleje` gets the new `sauces-oils.webp`, `pasty-przyprawy-i-buliony` gets `sauces-pastes.webp`.

### Task 10: Land and roll out to production (owner-gated)

**Files:** none new.

- [ ] **Step 1: Land the storefront branch** — after Paul's OK, with the session tooling: `scripts/session.sh land cuisines-lean-filters` from the storefront repo root (this squashes/merges the worktree branch into `main` the same way wave 1 landed; do not use raw merge/push commands). Backend: `scripts/session.sh land adg-category-tree` from `/var/www/www/enail`. Both land steps are owner-visible; if `session.sh land` asks for confirmation, that is Paul's call.
- [ ] **Step 2: Production data (Paul runs, or runs with Paul watching)** — the runbook is `backend/src/scripts/adg/README.md` § Production (one source; this step only summarises it). Run from the backend worktree on Netcup against the production database (SSH tunnel to Contabo's Docker PostgreSQL :5433, `DB_*` from the secret store — nothing is built or run on Contabo). Inputs are the three JSON files **as committed**: `product-hygiene.json` is the reviewed, evidence-based list (66 zone + 3 brand rows) and is NOT regenerated from production SQL — a row whose current value drifted is skipped and reported; there is no `--hygiene` flag. `npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --dry-run` → 125 category ops (10 groups, 54 leaves) and a product op count equal to dev's ± products added since the dev snapshot (unknown product ids abort the run — add or drop them consciously); then `--apply` (writes `adg_category_backup_<ts>_*` first and prints `<ts>`; record it in the deploy notes); then the 8 verification queries from Task 3 step 7 against prod → same expected shape (`54`, total product count of the salon unchanged before/after, `0`, `0`, no rows, `10`, no FROZEN, only Kameda/Ourhome). Idempotency: a second `--apply` reports `nothing to do`.
- [ ] **Step 3: Storefront release, right after step 2** — `deploy/deploy-asiandeligo-contabo.sh --commit <landed sha> --check-only` → clean; then `deploy/deploy-asiandeligo-contabo.sh --commit <landed sha> --yes` and `deploy/activate-asiandeligo-release.sh` (owner runs). Order is data first, storefront second (spec §8): the storefront renders both the flat list and the tree, and its leaf redirects fire only for slugs that are no longer live, so the minutes between the two steps only show the old storefront on the new tree. No backend release is required for this wave: the tree lives in data, the GraphQL schema is unchanged, and the storefront only reads fields (`level`, `displayOrder`, `parent`, `translation`, `backgroundImage`) that the production API already serves.
- [ ] **Step 4: Live admin config** — Paul applies the `trustRow`, `featured`, `seoText`, `categoryHub`/grid slug changes and the 2026-09-28 landing edits (hero slide 01 off, the two round-grid tiles re-pointed and "Grzyby suszone" retitled, hub/grid images `sauces-oils.webp`/`sauces-pastes.webp`) in the live admin panel (or copies `admin-panel/data/config-asiandeligo.json` `published` into the live data file), then publishes. Until this is done the production landing still shows the code fallback: default trust row (from `withStorefrontConfigDefaults`), the ADG default featured leaves, no SEO text, and the old hub slugs will 301 to the new groups — so the site is consistent at every step.
- [ ] **Step 5: Post-deploy checks (production URL)** — `curl -sI https://<prod>/pl/categories/sosy-pasty-i-przyprawy | grep -i '^location\|^HTTP'` → `301` + `/categories/sosy-i-oleje`; `curl -s https://<prod>/sitemap.xml | grep -c '/categories/'` → at least 20 (10 groups × 2 locales) and no retired slug; open `/pl`, `/pl/categories/makaron-i-ryz`, `/pl/categories/kimchi`, `/en` and repeat the Task 9 step 5 smoke; Google Search Console: request re-indexing of the 10 group URLs.
- [ ] **Step 6: Rollback plan** — data: `npx ts-node -r tsconfig-paths/register src/scripts/adg/apply-category-tree.ts --restore <ts> --check` first (prints what a restore would break today: products created on a category the restore deletes, rows of other tables referencing one, product/category rows edited after the apply), then `--restore <ts>` (Task 2 `restoreSnapshot`: restores product `category_id`/`storage_zone`/`brand`, deletes categories created by the run, restores the backed-up category rows; it refuses on any non-zero drift count, `--force` overrides and the affected products must then be re-categorised by hand) and re-run the verification queries expecting the pre-run counts; drop the `adg_category_backup_<ts>_*` tables about 30 days after the apply; storefront: re-activate the previous release with `deploy/activate-asiandeligo-release.sh <previous release>`; config: republish the previous admin version (the admin keeps `version` history). The three steps are independent — a storefront rollback alone still works against the new tree (the old adapter maps by keyword/slug and a node with an unknown parent is treated as a group), and a data rollback alone still works with the new storefront (a flat list renders as leafless groups).
