# Grocery Storefront + Admin Panel

Monorepo chứa 2 project Next.js:

| Folder | Mô tả | Port |
|--------|--------|------|
| `grocery-storefront/` | Frontend cho khách hàng | 3008 |
| `admin-panel/` | Admin panel quản lý config storefront | 4100 |

---

## Yêu cầu

- **Node.js** >= 18 (khuyến nghị v20+)
- **npm** (đi kèm Node.js)

Tải Node.js tại: https://nodejs.org

---

## Cài đặt & Chạy

### 1. Clone repo

```bash
git clone https://github.com/KaiPizz/grocery-front-with-admin.git
cd grocery-front-with-admin
```

### 2. Cài dependencies (chạy lần đầu hoặc sau khi pull)

```bash
cd admin-panel && npm install && cd ..
cd grocery-storefront && npm install && cd ..
```

### 3. Cấu hình env

Cả 2 project đã có file `.env.local` sẵn trong repo (private backup).
Nếu cần tạo lại, copy từ `.env.example`:

```bash
# Admin Panel
cp admin-panel/.env.example admin-panel/.env.local

# Storefront
cp grocery-storefront/.env.example grocery-storefront/.env.local
```

### 4. Chạy dev server

**Terminal 1 — Admin Panel (port 4100):**
```bash
cd admin-panel
npm run dev
```

**Terminal 2 — Storefront (port 3008):**
```bash
cd grocery-storefront
npm run dev
```

Mở trình duyệt:
- Storefront: http://localhost:3008
- Admin Panel: http://localhost:4100

---

## Đăng nhập Admin Panel

Thông tin mặc định (xem `admin-panel/.env.local`):
- **Username:** `admin`
- **Password:** `admin123`

---

## Cấu trúc nhanh

```
store_front/
├── admin-panel/          # Next.js 14 — Admin UI + Config API
│   ├── src/
│   ├── data/             # JSON config files (runtime)
│   ├── public/uploads/   # Uploaded images
│   └── .env.local
├── grocery-storefront/   # Next.js 14 — Customer-facing store
│   ├── src/
│   └── .env.local
└── README.md
```
