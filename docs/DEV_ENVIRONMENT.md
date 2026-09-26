# Asia Deli Go — môi trường DEV trên Netcup

Bản chạy thử của storefront + admin, tách hẳn production (Contabo). Mọi thay đổi ADG xem ở đây trước, rồi mới qua lane `deploy/deploy-asiandeligo-contabo.sh`.

| | DEV (Netcup 159.195.47.45) | PRODUCTION (Contabo) |
|---|---|---|
| Storefront | `https://adg-dev.159.195.47.45.sslip.io` (Basic Auth riêng `/etc/nginx/.htpasswd-adg-dev` (user `dev`)) | `https://asiadeligo.com` |
| Admin | `https://adg-dev-admin.159.195.47.45.sslip.io/admin` (cùng Basic Auth + tài khoản `admin`, mật khẩu trong `~/.adg-dev-admin-creds`) | `https://asiandeligo-admin.eshoper.pro/admin` |
| Backend | eNail dev `127.0.0.1:3003`, DB Docker `enail` :5433 (bản sao) | eNail prod, DB thật |
| Tiến trình | pm2 `adg-dev-storefront` :3022, `adg-dev-admin` :4100 | pm2 `enail-grocery-kenmito`, `enail-asiandeligo-admin` |
| Cây file | `/var/www/adg-dev/{storefront,admin}/{releases,current,previous,shared}` | `/var/www/kenmito-{storefront,admin}` |
| P24 | sandbox (khoá sandbox mã hoá trong DB dev), webhook `https://dev.enail.pro/api/v1/payments/p24/webhook` | sandbox → thật sau Aktywacja |

Tên miền `*.159.195.47.45.sslip.io` tự phân giải về Netcup, không cần DNS. Cert LE `adg-dev-sslip` (webroot, tự gia hạn). Vhost nginx: `deploy/dev/nginx/*.conf`, cài lại bằng `deploy/dev/install-nginx.sh`.

## Đưa code lên dev

```bash
# từ worktree/nhánh muốn xem (cần node_modules ở cả grocery-storefront và admin-panel)
deploy/adg-dev.sh --from /home/paul/work/grocery-front-with-admin-worktrees/<slug>
deploy/adg-dev.sh --from <checkout> --only storefront     # chỉ một app
```

Build chạy trong container `node:22-bookworm` (ngoài cgroup 40 GiB của user, không bị kernel giết), có `test:production-smoke`, rồi mới đổi symlink `current` và restart pm2. Log build in ra stdout; chạy nền thì `setsid nohup … > /var/tmp/adg-dev-build.log 2>&1 &` và chờ dòng `adg-dev-storefront … -> 200`.

Rollback bản trước:

```bash
ln -sfn "$(readlink /var/www/adg-dev/storefront/previous)" /var/www/adg-dev/storefront/current && pm2 restart adg-dev-storefront
```

Env runtime (không commit): `/var/www/adg-dev/<comp>/shared/.env.runtime` — cùng bộ biến với Contabo nhưng URL trỏ host dev; `NEXT_PUBLIC_*` là build-time nên `adg-dev.sh` tự tạo `.env.local` (bỏ secret) từ file này trước khi build.

Ba thứ phải khớp giữa các thành phần (đã cài 26/09, ghi lại để dựng lại được):

- `CUSTOMER_AUTH_BFF_SECRET` của storefront phải có **cùng giá trị** trong `backend/.env` của eNail dev (guard `customer-auth-bff.guard.ts`), không thì đăng nhập khách trả "Authentication service returned an invalid response".
- Storefront SSR gọi `NEXT_PUBLIC_GRAPHQL_URL` (qua chính host dev) nên vhost để `/graphql` và `/api/v1` **không Basic Auth** (như prod, hai đường này vốn công khai); chỉ trang HTML mới hỏi mật khẩu.
- Admin cần file trạng thái `shared/auth/admin-auth-state.json` (0600, cùng uid tiến trình) `{"passwordHash":"<ADMIN_PASSWORD_HASH>","schemaVersion":1,"sessionGeneration":1,"updatedAt":"<ISO>"}`; thiếu là login trả 503 "Admin credentials are not configured securely". Đổi mật khẩu admin dev: tạo hash scrypt mới vào `.env.runtime` **và** file này, rồi `pm2 restart adg-dev-admin --update-env`.

Tài khoản thử trên storefront dev: khách `paulviet.dinh@gmail.com` (bảng `customers`, toàn cục, bcrypt cost 12, `email_verified=true`) — đặt lại bằng `update customers set password_hash=... where email=...`.

## Làm mới dữ liệu salon ADG từ production

Repo eNail (`/var/www/www/enail`, chạy trong worktree hoặc cây deploy vì chỉ đọc script):

```bash
scripts/dev/refresh-salon-from-prod-dump.sh mirror                # restore dump prod mới nhất (/var/backups/enail-db) vào DB enail_prodmirror, ~5–10 phút
scripts/dev/refresh-salon-from-prod-dump.sh plan   e73271a9-53e3-4a20-a02e-791726b452aa   # xem sẽ copy gì, không ghi
scripts/dev/refresh-salon-from-prod-dump.sh copy   e73271a9-53e3-4a20-a02e-791726b452aa   # xoá + chèn mọi hàng của salon trên DB dev
scripts/dev/refresh-salon-from-prod-dump.sh verify e73271a9-53e3-4a20-a02e-791726b452aa
```

Sau `copy`, hàng `ecommerce_settings` mang khoá P24 mã hoá bằng key **prod** (dev không giải được). Chép lại khoá sandbox đã mã hoá bằng key dev từ salon lạc `f0f830c4-…` (giữ làm kho khoá):

```sql
update ecommerce_settings d
   set p24_api_key=s.p24_api_key, p24_crc_key=s.p24_crc_key, p24_merchant_id=s.p24_merchant_id, p24_sandbox=true, p24_enabled=true
  from ecommerce_settings s
 where s.salon_id='f0f830c4-21bc-49ce-8c33-b5632fc2c80e' and d.salon_id='e73271a9-53e3-4a20-a02e-791726b452aa';
```

Config admin (`/var/www/adg-dev/admin/shared/data/config-asiandeligo.json`) không nằm trong DB; lấy bản prod bằng `scp contabo-server:/var/www/kenmito-admin/shared/data/config-asiandeligo.json …` khi cần đồng bộ.

## Không làm

- Không sửa tay trong `/var/www/adg-dev/*/current` (là artifact; sửa code rồi chạy lại `adg-dev.sh`).
- Không trỏ dev sang backend Contabo, không nạp khoá P24 thật vào dev.
- Không gửi email/SMS thật từ dev: DB dev là bản sao khách thật; đặt đơn thử bằng email của mình.
