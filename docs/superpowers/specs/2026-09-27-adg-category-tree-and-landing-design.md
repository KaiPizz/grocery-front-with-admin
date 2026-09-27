# Asia Deli Go — đợt 2: cây danh mục 2 tầng + landing page (thiết kế)

Ngày: 2026-09-27 · Trạng thái: Paul đã duyệt cây danh mục (mục 2) và giao "tiếp tục làm"; phần còn lại chờ Paul đọc spec này.
Tiếp nối đợt 1 (`docs/superpowers/plans/2026-09-27-adg-cuisines-lean-filters.md`, nhánh `feat/cuisines-lean-filters-20260927`, chưa land). Đợt 1 + đợt 2 land chung.

## 1. Mục tiêu và bối cảnh

- Khách asiadeligo.com duyệt được catalog 1 779 sản phẩm theo cây danh mục **2 tầng, ~10 nhóm × 3–8 lá**, thay cho 10 nhóm phẳng (nhóm "Sosy, pasty i przyprawy" 518 sản phẩm một trang).
- Landing page bớt sơ sài, học cách bố cục của kimchi.pl/nasushi.pl (cùng công ty, IdoSell) nhưng chỉ lấy phần ADG có dữ liệu thật.
- Dữ liệu: 60 danh mục DB của ADG chính là **lá** của kimchi.pl (tên y hệt), cha bị mất lúc clone (`iai_category_path` trống 100%, bảng `scraped_products` rỗng). `categories` đã có `parent_id`, `level`, `path`, `name_translations`, `image_url`, `display_order`; GraphQL storefront trả `parent` + `level`; dashboard eNail có ô chọn cha. Bộ lọc `categoryIds` trong `storefront-product.service.ts` khớp **chính xác** `p.categoryId` (không mở rộng con) — storefront hiện đã gửi nhiều id một lúc (`rawCategoryIds`) nên giữ nguyên cách này.
- Không có sản phẩm đông lạnh online (0 tên chứa "mrożon"; 11 mã gắn FROZEN là rác), 63 CHILLED trong đó ~40 sai. Hero đang hứa "krewetki, gyoza, ha cao mrożone" → nội dung không khớp catalog.
- Mọi sản phẩm `created_at` = 2026-05-21 ⇒ "Nowości" trên home là giả.

## 2. Cây danh mục (đã duyệt 27/09)

Số ≈ là phần gắn lại bằng LLM + Paul duyệt. Slug giữ nguyên nếu nhóm còn tồn tại; slug mới ghi rõ; slug biến mất có 301.

| # | Nhóm (slug) | Lá (số SP) |
|---|---|---|
| 1 | Makaron i ryż (`makaron-i-ryz`, giữ) | Ramyun w paczce ≈128 · Ramyun w kubku i misce 28 · Buldak i ramyun ostre 34 · Makaron pszenny, udon i soba 36 · Makaron ryżowy i szklisty 23 · Makaron konjac 13 · Kluski tteok i mochi ryżowe 15 · Ryż i ziarna 44 |
| 2 | Sosy i oleje (`sosy-i-oleje`, mới) | Sos sojowy 63 · Sosy rybne i ostrygowe 29 · Sosy ostre i chili 33 · Sosy do sushi, teriyaki i ponzu 18 · Majonez, ketchup i inne sosy ≈59 · Oleje 27 |
| 3 | Pasty, przyprawy i buliony (`pasty-przyprawy-i-buliony`, mới) | Pasty: gochujang, curry, hot pot 73 · Pasta miso 17 · Przyprawy i furikake 70 · Octy 28 · Buliony i dashi 27 · Wasabi, sezam i sól 24 |
| 4 | Kimchi i kiszonki (`kimchi-i-kiszonki`, giữ) | Kimchi 16 · Marynowane warzywa i owoce 42 · Imbir marynowany 9 |
| 5 | Przekąski i słodycze (`przekaski-i-slodycze`, giữ) | Chipsy i krakersy ≈75 · Ciastka, wafle i Choco Pie ≈93 · Pocky, Pepero i czekolada ≈29 · Żelki i cukierki ≈64 · Mochi, orzechy i suszone owoce ≈14 · Przekąski z alg 10 · Przekąski słone azjatyckie ≈74 |
| 6 | Napoje, herbaty i kawy (`napoje-herbaty-i-kawy`, giữ) | Herbaty 68 · Kawy i syropy 41 · Napoje gazowane ≈26 · Soki, herbaty gotowe i napoje owocowe ≈44 · Napoje mleczne i probiotyczne ≈11 |
| 7 | Dania gotowe i zupy instant (`dania-gotowe`, giữ) | Dania gotowe 47 · Zupy instant: pho, tom yum, pad thai ≈7 |
| 8 | Do gotowania i sushi (`do-gotowania-i-sushi`, mới) | Algi: nori, wakame, kombu 22 · Grzyby suszone 16 · Tofu 13 · Mąki, panierki i tapioka 30 · Mleczko kokosowe 20 · Papier ryżowy 9 |
| 9 | Akcesoria kuchenne (`akcesoria-kuchenne`, giữ) | Pałeczki i sztućce 32 · Noże 26 · Patelnie wok i grill 23 · Patelnie tamago 7 · Miski, kubki i naczynia 65 · Parowary, maty, foremki i zestawy do sushi 21 · Prezenty i gadżety 7 |
| 10 | Kosmetyki koreańskie (`kosmetyki-koreanskie`, giữ) | Maseczki 12 · Kremy i serum 13 · Oczyszczanie 4 · Filtry UV i żele aloesowe 8 |

301: `sosy-pasty-i-przyprawy` → `sosy-i-oleje`; `sushi-i-algi` và `grzyby-warzywa-i-tofu` → `do-gotowania-i-sushi`. Menu "Kuchnie" (đợt 1) là trục thứ hai theo xuất xứ, giữ nguyên.

## 3. Nguồn sự thật: DB `categories` với `parent_id`

- **Nhóm** = category `level 0` (`parent_id NULL`), **lá** = category `level 1`. Không có tầng 3. Tên EN trong `name_translations.en`, ảnh nhóm trong `image_url`, thứ tự `display_order`.
- Lá cũ được **giữ id** khi tên chỉ đổi (vd `ramyun-ramen` → "Ramyun w paczce"), gắn `parent_id`; lá mới (vd "Chipsy i krakersy") tạo mới. 12 category ADG không có sản phẩm hiển thị: `is_active = false` nếu không nằm trong cây.
- Sản phẩm luôn gắn vào **lá** (`products.category_id` = lá). Trang nhóm lọc bằng danh sách id lá của nhóm (cách storefront đang làm với `rawCategoryIds`).
- Áp cây bằng **một script idempotent** trong eNail: `backend/src/scripts/adg/apply-category-tree.ts` đọc `backend/src/scripts/adg/category-tree.json` (cây, slug, tên PL/EN, lá cũ → lá mới) và `product-retag.json` (id sản phẩm → slug lá, chỉ phần ≈650 đã duyệt). Chế độ `--dry-run` in bảng thay đổi; chế độ ghi chạy trong một transaction, trước đó chụp `categories` + `(product_id, category_id)` của salon vào bảng `adg_category_backup_<ts>` để rollback bằng một câu SQL. Script chạy dev trước, prod sau khi Paul gật, qua SSH theo runbook (không phải migration schema, nên không đi lane migration).
- Dashboard eNail (`/app/products/categories`) là nơi Paul sửa cây về sau; storefront không hardcode cây nữa.

## 4. Storefront

- `src/lib/public-taxonomy.ts` (12 nơi import) thu về **một adapter** `buildCategoryTree(rawCategories)` dựng cây từ danh sách phẳng GraphQL (`parent.id`, `level`, `displayOrder`, `products.totalCount`), giữ nguyên chữ ký `buildPublicCategories`/`findPublicCategory` cho các trang cũ để diff nhỏ; `PUBLIC_CATEGORY_DEFINITIONS` chỉ còn phần localization EN dự phòng khi DB thiếu `name_translations`. Danh mục ẩn theo `HIDDEN_CATEGORY_KEYWORDS` giữ nguyên.
- GraphQL: `PUBLIC_CATEGORY_NAVIGATION_QUERY` lấy thêm `parent { id } level displayOrder`. Không đổi backend GraphQL (đã có field).
- URL: `/categories/<slug-nhóm>` và `/categories/<slug-lá>` (phẳng, slug duy nhất trong salon). Trang nhóm: đầu trang là **hàng ô lá** (ảnh tròn hoặc chip, số SP), bên trái desktop là **cây danh mục** (nhóm mở, lá có số), listing = mọi lá của nhóm; trang lá: breadcrumb `Nhóm › Lá`, cây bên trái với lá đang chọn, listing 1 lá. Bộ lọc đợt 1 (marka, kraj, cena, dostępne) giữ nguyên trên cả hai.
- `CategoryMegaMenu` (desktop "Kategorie"): 10 cột/nhóm, mỗi cột liệt kê lá. Drawer mobile: nhóm có thể mở ra lá (accordion), không quá 2 mức.
- Sitemap và SEO copy (`category-seo.ts`, `catalog-display-localization.ts`, `SearchAutocomplete`, `CategoryHubClient`, `category-hub.ts`) chuyển sang adapter; sitemap liệt kê nhóm + lá.
- 301 trong `next.config` redirects cho 3 slug cũ (cả `/pl/...` và `/en/...`).

## 5. Landing page

1. **Hàng tin cậy** thay khối "Jak odebrać zamówienie" (`HomeFulfillmentTrust`): 4 ô, nội dung từ config `commercial.trustRow[]` (icon, tiêu đề, mô tả, PL/EN), mặc định: Odbiór osobisty w Warszawie · Potwierdzenie ręczne w godzinach otwarcia · Płatność online (Przelewy24, BLIK) lub przy odbiorze · Ponad 1 700 produktów z Azji. Không còn 3 bước.
2. **Ô danh mục ảnh lớn**: khối `categoryHub` hiện tại đổi thành 6–10 ô lớn (ảnh nhóm từ `categories.image_url`, fallback ảnh hub trong config), 2 hàng trên desktop, cuộn ngang trên mobile; các ô trỏ về nhóm mới.
3. **Hero có slot theo mùa**: giữ hero hiện tại; admin đã có `promoBanners` — đợt này chỉ đổi nội dung: hero "Smak Azji" bỏ dòng hứa hàng đông lạnh (không có online) hoặc Paul thêm sản phẩm đông lạnh vào catalog trước; banner mùa (Tết Trung thu, Tết) là nội dung Paul nhập trong admin, không cần code.
4. **"Nowości" → "Polecane"**: khối `horizontal` trong config có `productIds` (Paul chọn trong admin); nếu trống, storefront tự lấy theo lá "Buldak", "Kimchi", "Pocky…" (quy tắc cố định trong code, ghi rõ trong spec test). Bỏ nhãn "Nowości" khi mọi sản phẩm cùng ngày tạo (`created_at` trùng > 90 % catalog).
5. **SEO text** cuối trang: 2 đoạn PL/EN từ config `homepage.seoText`, mặc định do tôi viết, Paul sửa trong admin.
Không làm đợt này: newsletter, Instagram feed, opinie/Ceneo, đếm ngược wysyłka, chương trình khách hàng thân thiết.

## 6. Vệ sinh dữ liệu (Paul yêu cầu "lọc các mã rác")

- `storage_zone`: 11 FROZEN sai (6 gochugaru, 5 Mori-nu silken tofu) → `AMBIENT`; CHILLED xét theo lá: giữ Kimchi 7, Kluski tteok 5, Udon świeży 1; chuyển `AMBIENT` cho Napoje 8, Sos sojowy 6, Pasty 5, Sosy 4 + 5, Mleczko kokosowe 2, Oleje 2, Anko 1, krewetki suszone 1; **hỏi Paul** Imbir marynowany 7 và Pasta miso 2 (tuỳ cách tiệm trữ). Vì thẻ sản phẩm đợt 1 hiện huy hiệu "mrożone/chłodzone", cờ sai giờ lộ ra với khách.
- Marka: `KAMEDA`→`Kameda`, `OURHOME`→`Ourhome` (5 SP).
- Danh sách sửa nằm trong `product-hygiene.json`, cùng script, cùng backup, cùng dry-run.

## 7. Quy trình gắn lại ≈650 sản phẩm

1. Xuất phạm vi (Słodycze, Sosy, Napoje, Ramyun/Dania gotowe, Kosmetyki, Komplety, Makarony, Przyprawy) ra bảng.
2. LLM (subagent Sonnet) gợi ý lá + độ tin cậy + lý do 1 dòng, theo đúng danh sách lá ở mục 2; cấm lá ngoài danh sách.
3. Bảng duyệt cho Paul: nhóm theo lá đề xuất, dòng tin cậy thấp lên đầu, cột "sửa thành". Paul duyệt → `product-retag.json`.
4. Dry-run dev → áp dev → preview → Paul xem → land → áp prod.

## 8. Triển khai và thứ tự

1. eNail worktree `feat/adg-category-tree`: script + JSON + spec test dry-run; áp lên DB dev. Không cần migration.
2. Storefront (tiếp trên nhánh đợt 1): adapter, trang danh mục, mega menu, drawer, 301, landing; Playwright fixture `mobile-fixtures.ts` thêm `parent/level`.
3. Preview ADG dev (`deploy/adg-dev.sh --from <worktree> --only storefront`), admin dev cập nhật `categoryHub`/`trustRow`.
4. Paul duyệt → land storefront + backend → prod: (a) áp script dữ liệu (backup trước), (b) lane storefront, (c) lane backend (nếu có thay đổi backend runtime; hiện không có), (d) Paul chỉnh admin live (categoryHub, trustRow, hero).
Rollback: script `--restore <ts>` trả `categories` + `category_id` từ bảng backup; storefront rollback bằng release trước.

## 9. Kiểm thử

- Backend: spec cho script (dry-run trên fixture: tạo cha, gắn `parent_id`, không đụng salon khác, idempotent khi chạy 2 lần).
- Storefront: node contract test cho `buildCategoryTree` (cây từ danh sách phẳng, ẩn hidden, đếm tổng nhóm = tổng lá); Playwright: `categories-browsing` (nhóm → lá → breadcrumb), mega menu 2 tầng, drawer accordion, 301 ba slug cũ, landing (hàng tin cậy, không còn "Nowości" khi ngày tạo trùng), sitemap chứa lá.
- Kiểm dữ liệu sau khi áp: tổng sản phẩm theo lá = 1 779, 0 sản phẩm gắn vào nhóm (level 0), 0 category level ≥ 2.

## 10. Ngoài phạm vi

Tầng 3, tìm kiếm theo synonym, sản phẩm đông lạnh mới (Paul quyết riêng), Bestsellery (12 đơn online), đánh giá khách.
