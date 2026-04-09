# Tổng quan hệ thống: Admin Panel + Grocery Storefront

> **Cập nhật lần cuối:** tháng 30/3/2026  
> **Tác giả:** claude sonnet 4.6 thinking

---

## 1. Tổng quan kiến trúc

Hệ thống gồm **2 Next.js app** chạy độc lập, giao tiếp qua HTTP REST API:

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER / USER                             │
└────────────────┬────────────────────────────┬───────────────────┘
                 │                            │
     ┌───────────▼──────────┐    ┌────────────▼─────────────┐
     │   ADMIN PANEL        │    │   GROCERY STOREFRONT     │
     │   localhost:4100     │    │   localhost:3008         │
     │   (Next.js 14)       │    │   (Next.js)              │
     │                      │    │                          │
     │  - Admin UI          │    │  - Trang cho khách hàng  │
     │  - Config REST API   │    │  - Đọc config từ admin   │
     │  - Media upload      │    │  - Products từ Zyra API  │
     └──────────┬───────────┘    └────────────┬─────────────┘
                │                             │
                │  GET /api/config/{slug}     │
                │◄────────────────────────────┘
                │
     ┌──────────▼───────────┐    ┌──────────────────────────┐
     │  data/config-        │    │   ZYRA / ZIRA AI API     │
     │  {slug}.json         │    │   zira-ai.com            │
     │  (file storage)      │    │   - Products, Cart, Auth │
     └──────────────────────┘    └──────────────────────────┘
```

**Điểm quan trọng:**
- **Admin Panel** = admin UI + config API trong 1 app (port **4100**)
- **Grocery Storefront** = giao diện khách hàng (port **3008**)
- **Zyra** = backend xử lý products/cart/auth — **KHÔNG** liên quan đến UI config
- Config được lưu dưới dạng **file JSON** tại `admin-panel/data/config-{slug}.json`

---

## 2. Cơ chế Draft → Published

Đây là khái niệm trung tâm. Mọi thay đổi đều đi qua 2 bước:

```
Admin chỉnh sửa
      │
      ▼
  [DRAFT]  ←── lưu trung gian, chỉ admin thấy
      │
      │  Nhấn "Publish"
      ▼
[PUBLISHED] ──► Storefront đọc từ đây → live cho khách hàng
```

**Mỗi slug có 1 file JSON chứa cả 2:**

```json
{
  "slug": "my-grocery-store",
  "published": { ...config đang live... },
  "draft": { ...config đang chỉnh... },
  "version": 5,
  "updatedAt": "2026-03-30T10:00:00Z"
}
```

- **Save Draft** → chỉ cập nhật `draft`, storefront không thay đổi
- **Publish** → copy `draft` vào `published`, storefront cập nhật sau tối đa **5 phút** (cache TTL)

---

## 3. Luồng thay đổi banner / màu sắc / nội dung

### 3.1 Admin Panel — phía ghi

```
Admin Panel UI (React)
        │
        │ useConfig() hook
        │  → fetchDraftConfig()  → GET /api/config/{slug}?draft=true
        │
        │ updateConfig() / updateBranding() / updateHero()...
        │  → thay đổi local state (chưa gửi đi)
        │
        │ save()
        │  → saveDraft()         → PUT /api/config/{slug}
        │                           Header: x-api-key: {ADMIN_API_KEY}
        │                           Body: full StorefrontConfig JSON
        │
        │ publish()
        │  → saveDraft() rồi     → PUT /api/config/{slug}
        │  → publishConfig()     → POST /api/config/{slug}/publish
        │                           Header: x-api-key: {ADMIN_API_KEY}
```

### 3.2 Grocery Storefront — phía đọc

```
Next.js Server (SSR) tại mỗi request:
        │
        │ fetchServerConfig()  → GET http://localhost:4100/api/config/{slug}
        │                         (không cần auth, public endpoint)
        │
        │ Truyền initialConfig vào <ConfigProvider>
        │
Client-side sau mount:
        │ ConfigProvider.refreshConfig()
        │  → fetch lại GET /api/config/{slug} (no-store)
        │  → cập nhật React Context nếu config mới hơn
        │
        │ useEffect trên config.branding.colors:
        │  → inject CSS variables vào document.documentElement
```

### 3.3 Màu sắc áp dụng như thế nào

Khi `config.branding.colors` thay đổi, `ConfigProvider` inject CSS vars:

```typescript
// ConfigProvider.tsx
Object.entries(config.branding.colors).forEach(([key, value]) => {
  root.style.setProperty(`--color-${camelToKebab(key)}`, value);
});
```

**Ví dụ mapping:**

| Config key          | CSS variable               | Dùng ở đâu                          |
|---------------------|---------------------------|--------------------------------------|
| `primary`           | `--color-primary`          | Nút, badge, link chính               |
| `primaryHover`      | `--color-primary-hover`    | Hover state của primary              |
| `checkoutBtnColor`  | `--color-checkout-btn-color` | Nút "Add to Cart" / Checkout       |
| `checkoutBtnHoverColor` | `--color-checkout-btn-hover-color` | Hover nút checkout        |
| `background`        | `--color-background`       | Nền trang                            |
| `foreground`        | `--color-foreground`       | Màu chữ chính                        |
| `accent`            | `--color-accent`           | Nền hero section, highlight          |
| `accentForeground`  | `--color-accent-foreground`| Chữ trên accent background           |
| `muted`             | `--color-muted`            | Background mờ, skeleton              |
| `mutedForeground`   | `--color-muted-foreground` | Text phụ, placeholder                |
| `border`            | `--color-border`           | Đường viền card, input               |
| `card`              | `--color-card`             | Background card sản phẩm             |
| `cardForeground`    | `--color-card-foreground`  | Text trong card                      |
| `destructive`       | `--color-destructive`      | Thông báo lỗi, xóa                   |
| `ring`              | `--color-ring`             | Focus ring                           |

---

## 4. API Endpoints đầy đủ

**Base URL (Admin Panel):** `http://localhost:4100`

### Config API

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/config/{slug}` | ❌ Public | Lấy **published** config. Cache 5 phút. Storefront dùng endpoint này. |
| `GET` | `/api/config/{slug}?draft=true` | ✅ x-api-key | Lấy **draft** config. Admin UI dùng khi load trang edit. |
| `PUT` | `/api/config/{slug}` | ✅ x-api-key | **Thay toàn bộ** draft bằng body JSON. |
| `PATCH` | `/api/config/{slug}` | ✅ x-api-key | **Merge partial** vào draft (chỉ gửi phần thay đổi). |
| `POST` | `/api/config/{slug}/publish` | ✅ x-api-key | **Publish:** copy draft → published. Storefront sẽ thấy thay đổi. |

### Media API

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/media/upload` | ✅ x-api-key | Upload ảnh (max 5MB, jpg/png/webp/svg/gif). Trả về URL tuyệt đối. |

### Auth API (Admin UI Login)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/auth/login` | Body credentials | Đăng nhập admin, set cookie `admin-session`. |
| `POST` | `/api/auth/logout` | Cookie | Xóa session cookie. |
| `GET` | `/api/health` | ❌ Public | Health check. |

### Ví dụ gọi API thủ công (curl)

```bash
# Lấy published config
curl http://localhost:4100/api/config/my-grocery-store

# Lấy draft config
curl -H "x-api-key: your-api-key" \
  http://localhost:4100/api/config/my-grocery-store?draft=true

# Cập nhật màu sắc (partial patch)
curl -X PATCH http://localhost:4100/api/config/my-grocery-store \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"branding": {"colors": {"primary": "#e11d48"}}}'

# Publish
curl -X POST http://localhost:4100/api/config/my-grocery-store/publish \
  -H "x-api-key: your-api-key"
```

---

## 5. Cấu trúc StorefrontConfig — Schema dùng chung

Đây là schema duy nhất. Admin Panel viết, Storefront đọc. Cả 2 project đều có file type mirror nhau:
- Admin: `src/types/config.ts`
- Storefront: `src/types/storefront-config.ts`

```typescript
StorefrontConfig {
  branding: {
    logoUrl: string | null          // URL ảnh logo
    faviconUrl: string | null       // URL favicon
    storeName: string               // Tên cửa hàng
    colors: { ...15 màu sắc... }   // CSS variables
  }

  homepage: {
    hero: {
      enabled: boolean              // Bật/tắt hero banner
      headline: string              // Tiêu đề lớn
      subtitle: string              // Mô tả phụ
      ctaText: string               // Text nút CTA
      ctaLink: string               // Link nút CTA
      backgroundImageUrl: string | null
    }
    promoBanners: PromoBannerItem[] // Danh sách banner quảng cáo
    sections: HomepageSectionItem[] // Thứ tự/bật-tắt sections
  }

  layout: {
    header: {
      navItems: NavItem[]           // Menu điều hướng
      showSearch: boolean
      showWishlist: boolean
      showLanguageSwitcher: boolean
      showThemeToggle: boolean
      cta?: { text, link, enabled } // Nút CTA trên header
    }
    footer: {
      tagline: string
      columns: FooterColumn[]       // Cột link footer
      copyrightText: string
    }
    priceDisplay?: {
      position: 'below-image' | 'overlay' | 'inline'
      showDiscountBadge: boolean
      showOriginalPrice: boolean
    }
    bannerPosition: 'above-products' | 'below-hero'
  }

  tracking: {
    facebookPixel:    { enabled, pixelId }
    googleAnalytics:  { enabled, measurementId }
    googleTagManager: { enabled, containerId }
    hotjar:           { enabled, siteId }
  }

  seo: {
    defaultTitle: string
    defaultDescription: string
    ogImageUrl: string | null
    canonical: string
  }

  general: {
    phone, email, address
    socialLinks: { platform, url }[]
    policyLinks: { privacy, terms, about }
  }
}
```

---

## 6. Cấu trúc file quan trọng

### Admin Panel (`d:\store_front\admin-panel`)

```
src/
├── app/
│   ├── admin/                    ← Admin UI pages (bảo vệ bởi middleware)
│   │   ├── branding/page.tsx     ← Chỉnh logo, màu, storeName
│   │   ├── homepage/page.tsx     ← Chỉnh hero, promo banners, sections
│   │   ├── layout-config/page.tsx← Chỉnh header nav, footer, price display
│   │   ├── tracking/page.tsx     ← FB Pixel, GA4, GTM, Hotjar
│   │   ├── seo/page.tsx          ← Title, description, OG image
│   │   ├── general/page.tsx      ← Số điện thoại, email, social links
│   │   ├── media/page.tsx        ← Upload ảnh
│   │   └── layout.tsx            ← Sidebar nav + top bar
│   └── api/
│       ├── config/[slug]/
│       │   ├── route.ts          ← GET/PUT/PATCH config
│       │   └── publish/route.ts  ← POST publish
│       ├── media/upload/route.ts ← POST upload ảnh
│       └── auth/                 ← Login/logout
├── hooks/
│   └── use-config.ts             ← Hook trung tâm: load/save/publish config
├── lib/
│   ├── api-client.ts             ← Hàm gọi config API (dùng trong admin UI)
│   ├── auth.ts                   ← requireApiKey() middleware
│   ├── config-repository.ts      ← Đọc/ghi file JSON (draft + published)
│   ├── defaults.ts               ← DEFAULT_CONFIG (fallback khi chưa có file)
│   ├── session.ts                ← Cookie session management
│   └── validation.ts             ← Zod schemas validate trước khi lưu
├── middleware.ts                 ← Bảo vệ /admin/* bằng session cookie
└── types/
    └── config.ts                 ← StorefrontConfig interfaces
```

### Grocery Storefront (`d:\store_front\grocery-storefront`)

```
src/
├── app/
│   ├── layout.tsx                ← fetchServerConfig() SSR + <ConfigProvider>
│   └── [locale]/                 ← Pages với i18n
├── components/
│   ├── ConfigProvider.tsx        ← React Context + CSS var injection + client refresh
│   ├── TrackingScripts.tsx       ← Inject FB/GA/GTM/Hotjar từ config
│   └── layout/
│       ├── Header.tsx            ← Đọc config.layout.header, config.branding
│       └── Footer.tsx            ← Đọc config.layout.footer, config.general
├── stores/
│   └── config-store.ts           ← Zustand store backup (đọc window.__STOREFRONT_CONFIG__)
└── types/
    └── storefront-config.ts      ← Mirror của admin's config.ts
```

---

## 7. Media / Ảnh hoạt động như thế nào

```
Admin upload ảnh qua UI
        │
        ▼
POST /api/media/upload
        │
        ▼
Lưu vào admin-panel/public/uploads/{timestamp}-{name}.jpg
        │
        ▼
Trả về URL tuyệt đối:
  http://localhost:4100/uploads/1743349200000-logo.png
        │
        ▼
URL được lưu trong config (logoUrl, backgroundImageUrl, v.v.)
        │
        ▼
Storefront render <img src="http://localhost:4100/uploads/...">
```

> ⚠️ **Lưu ý quan trọng:** Ảnh được serve từ admin panel's public folder.
> Storefront browser phải có thể truy cập được domain của admin panel.
> Trong production, admin panel cần có domain/subdomain public (ví dụ: `admin.mystore.com`).

---

## 8. Authentication — 2 lớp khác nhau

### Lớp 1: Admin UI Login (session cookie)
- **Dùng cho:** Truy cập `/admin/*` pages trong trình duyệt
- **Cách hoạt động:** Đăng nhập bằng username/password, server tạo HMAC-signed cookie `admin-session`
- **Middleware:** `src/middleware.ts` kiểm tra cookie mỗi request vào `/admin/*`
- **Credentials:** `ADMIN_USERNAME` + `ADMIN_PASSWORD` trong `.env`

### Lớp 2: API Key (x-api-key header)
- **Dùng cho:** Tất cả write operations qua REST API (PUT, PATCH, POST publish, POST upload)
- **Cách hoạt động:** Phải gửi header `x-api-key: {ADMIN_API_KEY}`
- **Dùng ở đâu:**
  - Admin UI gọi API của chính nó → dùng `NEXT_PUBLIC_ADMIN_API_KEY`
  - Storefront **không bao giờ** gọi write API, chỉ GET public endpoint

---

## 9. Environment Variables

### Admin Panel (`.env.local`)

| Biến | Bắt buộc | Ví dụ | Mô tả |
|------|----------|-------|-------|
| `ADMIN_API_KEY` | ✅ | `abc123secret` | Server-side key, validate x-api-key header |
| `NEXT_PUBLIC_ADMIN_API_KEY` | ✅ | `abc123secret` | Client-side copy (giống ADMIN_API_KEY) |
| `NEXT_PUBLIC_SALON_SLUG` | ✅ | `my-grocery-store` | Slug xác định config nào đang manage |
| `ADMIN_USERNAME` | ✅ | `admin` | Tên đăng nhập admin |
| `ADMIN_PASSWORD` | ✅ | `supersecret` | Mật khẩu admin |
| `ADMIN_SESSION_SECRET` | ✅ | `64-char-random-string` | Secret ký HMAC session cookie |
| `CORS_ORIGIN` | ❌ | `http://localhost:3008` | Allowed CORS origin (dùng `*` cho dev) |

### Grocery Storefront (`.env.local`)

| Biến | Bắt buộc | Ví dụ | Mô tả |
|------|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://zira-ai.com/api/v1` | Zyra REST API |
| `NEXT_PUBLIC_GRAPHQL_URL` | ✅ | `https://zira-ai.com/graphql/storefront` | Zyra GraphQL |
| `NEXT_PUBLIC_SALON_SLUG` | ✅ | `my-grocery-store` | **Phải khớp** với admin panel's slug |
| `NEXT_PUBLIC_CONFIG_API_URL` | ✅ | `http://localhost:4100` | URL của admin panel |
| `NEXT_PUBLIC_CHANNEL` | ❌ | `default` | Override GraphQL channel |

> ⚠️ `NEXT_PUBLIC_SALON_SLUG` **phải giống nhau** ở cả 2 project, đây là khóa nối giữa 2 app.

---

## 10. Luồng hoàn chỉnh: Thay đổi banner từ đầu đến cuối

**Ví dụ: Admin thay đổi tiêu đề hero banner**

```
1. Admin mở http://localhost:4100/admin/homepage

2. useConfig() hook chạy fetchDraftConfig():
   → GET http://localhost:4100/api/config/my-grocery-store?draft=true
   → x-api-key: abc123secret
   → Trả về: { config: { homepage: { hero: { headline: "Fresh Groceries..." } } } }

3. Admin gõ tiêu đề mới: "Thực phẩm tươi sạch, giao tận nhà"
   → updateHero('headline', 'Thực phẩm tươi sạch, giao tận nhà')
   → Local state thay đổi, isDirty = true

4. Admin nhấn "Save Draft":
   → PUT http://localhost:4100/api/config/my-grocery-store
   → x-api-key: abc123secret
   → Body: { ...toàn bộ config mới... }
   → File data/config-my-grocery-store.json cập nhật phần "draft"
   → "published" KHÔNG thay đổi → storefront vẫn thấy tiêu đề cũ

5. Admin nhấn "Publish":
   → PUT (save draft một lần nữa)
   → POST http://localhost:4100/api/config/my-grocery-store/publish
   → File JSON: draft được copy sang published
   → version tăng lên

6. Storefront đọc config:
   → Lần SSR tiếp theo: fetchServerConfig() lấy published config mới
   → Client mount: ConfigProvider.refreshConfig() fetch lại
   → Cache cũ (5 phút) có thể trả về config cũ nếu còn trong TTL

7. Khách hàng thấy tiêu đề mới ✅
```

---

## 11. Tại sao Zyra/Zira không quản lý UI config?

Zyra là **business API** — quản lý:
- Products, categories, inventory
- Orders, cart
- User accounts, auth
- Salon/channel data

Zyra **KHÔNG** biết về:
- Màu sắc của storefront
- Nội dung hero banner
- Menu navigation
- Footer links
- Tracking pixels

→ Đó là lý do tại sao cần admin panel riêng để quản lý UI config.

---

## 12. Ports & URLs tóm tắt

| Service | URL | Mô tả |
|---------|-----|-------|
| Admin Panel | `http://localhost:4100` | Admin UI + Config API |
| Admin UI | `http://localhost:4100/admin` | Trang quản trị (cần đăng nhập) |
| Config API | `http://localhost:4100/api/config/{slug}` | REST API đọc config |
| Grocery Storefront | `http://localhost:3008` | Giao diện khách hàng |
| Zyra API | `https://zira-ai.com/api/v1` | Products, cart, auth |
| Zyra GraphQL | `https://zira-ai.com/graphql/storefront` | GraphQL cho storefront |

---

## 13. Sections homepage whitelist

Chỉ có **4 section** được hỗ trợ (defined bởi `HomepageSectionId`):

| Section ID | Mô tả |
|------------|-------|
| `deals` | Sản phẩm khuyến mãi |
| `freshPicks` | Sản phẩm tươi nổi bật |
| `recipes` | Công thức nấu ăn |
| `shopByZone` | Mua theo khu vực lưu trữ (Frozen, Chilled, Ambient) |

Admin có thể bật/tắt và sắp xếp thứ tự từng section.

---

## 14. Cache và timing

| Sự kiện | Thời gian có hiệu lực |
|---------|----------------------|
| Publish xong | Storefront SSR lần tiếp theo thấy ngay |
| GET /api/config public | Cache `max-age=300` (5 phút) + `stale-while-revalidate=60` |
| Client refresh | Ngay sau mount (background fetch, no-store) |
| Màu sắc CSS vars | Ngay lập tức khi config thay đổi trên client |

---

## 15. Docker (production)

Admin panel có `docker-compose.yml`:

```yaml
services:
  admin-panel:
    ports: ["4100:4100"]
    volumes:
      - admin-data:/app/data          # Lưu config JSON files
      - admin-uploads:/app/public/uploads  # Lưu ảnh upload
```

Data được persist qua Docker volumes — không mất khi restart container.
