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

Không lưu `.env.local` hay credential thật trong repository. Tạo file local từ
`.env.example`, sau đó điền secret qua secret manager của môi trường:

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
- Admin Panel: http://localhost:4100/admin

---

## Đăng nhập Admin Panel

Admin production không có mật khẩu mặc định. Tài khoản và scrypt password hash
được nạp từ runtime secret (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`). Sinh hash
bằng `npm --prefix admin-panel run --silent hash:admin-password` và truyền mật
khẩu qua stdin, không đặt plaintext trong command line, tài liệu hoặc Git.

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
