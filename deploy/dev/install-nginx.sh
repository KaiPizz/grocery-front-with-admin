#!/usr/bin/env bash
# Cài 2 vhost DEV của Asia Deli Go vào nginx trên Netcup (sites-available + sites-enabled), test, reload.
# Chỉ chạy trên Netcup (159.195.47.45). Không liên quan Contabo.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
if ! hostname -I | tr ' ' '\n' | grep -qx '159.195.47.45'; then
  echo "install-nginx.sh chỉ chạy trên Netcup" >&2
  exit 1
fi
for f in adg-dev.159.195.47.45.sslip.io adg-dev-admin.159.195.47.45.sslip.io; do
  sudo install -m 0644 "$here/nginx/$f.conf" "/etc/nginx/sites-available/$f"
  sudo ln -sfn "/etc/nginx/sites-available/$f" "/etc/nginx/sites-enabled/$f"
done
sudo nginx -t
sudo systemctl reload nginx
echo "installed: adg-dev + adg-dev-admin vhosts"
