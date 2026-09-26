#!/usr/bin/env bash
# adg-dev.sh — build + chạy bản DEV của Asia Deli Go (storefront + admin) trên Netcup.
# KHÔNG phải lane production (đó là deploy/deploy-asiandeligo-contabo.sh). Không đụng Contabo.
#
#   deploy/adg-dev.sh [--from <checkout>] [--only storefront|admin]
#
# Build standalone tại <checkout> (mặc định: repo chứa script) với env DEV, stage vào
# /var/www/adg-dev/<comp>/releases/<comp>-<sha>-<ts>, đổi symlink current (giữ previous),
# rồi pm2 startOrRestart tiến trình adg-dev-<comp> đúng cách Contabo chạy (bash -lc + .env.runtime + node server.js).
# Rollback: ln -sfn "$(readlink /var/www/adg-dev/<comp>/previous)" /var/www/adg-dev/<comp>/current && pm2 restart adg-dev-<comp>
set -euo pipefail

FROM="$(cd "$(dirname "$0")/.." && pwd)"
ONLY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) FROM="$(cd "$2" && pwd)"; shift 2 ;;
    --only) ONLY="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[[ -z "$ONLY" || "$ONLY" == storefront || "$ONLY" == admin ]] || { echo "--only storefront|admin" >&2; exit 2; }

BASE=/var/www/adg-dev
hostname -I | tr ' ' '\n' | grep -qx '159.195.47.45' || { echo "adg-dev.sh chỉ chạy trên Netcup" >&2; exit 1; }
for comp in storefront admin; do
  [[ -f "$BASE/$comp/shared/.env.runtime" ]] || { echo "thiếu $BASE/$comp/shared/.env.runtime (xem docs/DEV_ENVIRONMENT.md)" >&2; exit 1; }
done
[[ -d "$FROM/grocery-storefront/node_modules" && -d "$FROM/admin-panel/node_modules" ]] \
  || { echo "checkout $FROM chưa có node_modules cho cả hai app" >&2; exit 1; }

SHA="$(git -C "$FROM" rev-parse --short=12 HEAD)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

# Build chạy trong container node:22 (uid 1000) thay vì trên host: cgroup user-1000 trên Netcup có trần 40 GiB
# và thường đầy vì các phiên khác; kernel giết `next build` trong slice mà wrapper vẫn exit 0.
# Container nằm ngoài slice đó, có trần riêng (--memory) nên không kéo sập tiến trình của phiên khác.
BUILD_IMAGE="${ADG_DEV_BUILD_IMAGE:-node:22-bookworm}"
command -v docker >/dev/null || { echo "cần docker để build ngoài cgroup user" >&2; exit 1; }

# .env.local cho build: bỏ secret (NEXT_PUBLIC_* là build-time nên phải là giá trị DEV).
safe_env() {
  grep -vE '^(CUSTOMER_AUTH_BFF_SECRET|ADMIN_PASSWORD_HASH|ADMIN_SESSION_SECRET)=' "$1" > "$2"
}

build_one() {
  local comp="$1" app="$2" heap="$3" mem="$4"
  echo "== $comp: build từ $app ($SHA) trong $BUILD_IMAGE"
  safe_env "$BASE/$comp/shared/.env.runtime" "$app/.env.local"
  docker run --rm -u 1000:1000 -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
    -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 -e NODE_OPTIONS="--max-old-space-size=$heap" \
    -v "$app":/app -w /app --memory "$mem" "$BUILD_IMAGE" \
    sh -c 'npm run build && npm run test:production-smoke'
  local build_id
  build_id="$(<"$app/.next/BUILD_ID")"
  [[ "$build_id" =~ ^[A-Za-z0-9_-]{1,128}$ ]] || { echo "$comp: BUILD_ID hỏng (build bị giết?)" >&2; exit 1; }
  [[ -f "$app/.next/standalone/server.js" ]] || { echo "$comp: thiếu .next/standalone/server.js" >&2; exit 1; }

  local rel="$BASE/$comp/releases/$comp-$SHA-$TS"
  mkdir -p "$rel/.next/static" "$rel/public"
  rsync -a "$app/.next/standalone/" "$rel/"
  rsync -a "$app/.next/static/" "$rel/.next/static/"
  rsync -a --exclude='/uploads/' "$app/public/" "$rel/public/"
  rm -f "$rel/.env.local" "$rel/.env" "$rel/.env.production"
  ln -s "$BASE/$comp/shared/.env.runtime" "$rel/.env.local"
  if [[ "$comp" == admin ]]; then
    rm -rf "$rel/data" "$rel/public/uploads"
    ln -s "$BASE/admin/shared/data" "$rel/data"
    ln -s "$BASE/admin/shared/public/uploads" "$rel/public/uploads"
  fi
  rm -f "$app/.env.local"

  if [[ -L "$BASE/$comp/current" ]]; then
    ln -sfn "$(readlink -f "$BASE/$comp/current")" "$BASE/$comp/previous"
  fi
  ln -sfn "$rel" "$BASE/$comp/current"

  cat > "$BASE/$comp/ecosystem.json" <<EOF
{"apps":[{"name":"adg-dev-$comp","script":"/bin/bash","interpreter":"none","cwd":"$BASE",
  "args":"-lc 'set -a; . $BASE/$comp/shared/.env.runtime; set +a; cd $BASE/$comp/current && exec node server.js'",
  "autorestart":true,"max_restarts":10}]}
EOF
  pm2 startOrRestart "$BASE/$comp/ecosystem.json" --update-env >/dev/null
  echo "== $comp: $rel"
}

[[ -z "$ONLY" || "$ONLY" == admin ]]      && build_one admin      "$FROM/admin-panel"        4096 8g
[[ -z "$ONLY" || "$ONLY" == storefront ]] && build_one storefront "$FROM/grocery-storefront" 8192 14g

sleep 6
rc=0
for pair in storefront:3022 admin:4100; do
  comp="${pair%%:*}"; port="${pair##*:}"
  [[ -z "$ONLY" || "$ONLY" == "$comp" ]] || continue
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 "http://127.0.0.1:$port/" || echo 000)"
  echo "adg-dev-$comp http://127.0.0.1:$port -> $code"
  [[ "$code" =~ ^(200|301|302|307|308)$ ]] || rc=1
done
exit $rc
