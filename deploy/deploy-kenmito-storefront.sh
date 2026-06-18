#!/usr/bin/env bash
set -euo pipefail

# Build and deploy the Kenmito storefront from the build server.
# This intentionally loads the production runtime env before building and
# before restarting PM2. Next.js inlines NEXT_PUBLIC_* at build time, so building
# without this env makes the storefront fall back to the default catalog.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/grocery-storefront"
REMOTE="${KENMITO_REMOTE:-contabo-server}"
REMOTE_BASE="${KENMITO_REMOTE_BASE:-/var/www/www/enail/kenmito-storefront}"
REMOTE_ENV="$REMOTE_BASE/shared/.env.runtime"
LOCAL_ENV="$APP_DIR/.env.local"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Missing storefront directory: $APP_DIR" >&2
  exit 1
fi

if [[ ! -f "$LOCAL_ENV" ]]; then
  echo "Copying Kenmito runtime env for build. Values are not printed."
  scp "$REMOTE:$REMOTE_ENV" "$LOCAL_ENV"
fi

if ! grep -q '^NEXT_PUBLIC_CHANNEL=kenmito' "$LOCAL_ENV"; then
  echo "Refusing to build: $LOCAL_ENV is not configured for NEXT_PUBLIC_CHANNEL=kenmito" >&2
  exit 1
fi

commit="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
stamp="$(date -u +%Y%m%d%H%M%S)"
release="${commit}-env-${stamp}"
remote_release="$REMOTE_BASE/releases/$release"

echo "Building Kenmito storefront at commit $commit"
npm --prefix "$APP_DIR" run build

echo "Creating remote release $release"
ssh "$REMOTE" "mkdir -p '$remote_release'"
rsync -az --delete "$APP_DIR/.next/standalone/" "$REMOTE:$remote_release/"
ssh "$REMOTE" "mkdir -p '$remote_release/.next/static' '$remote_release/public'"
rsync -az --delete "$APP_DIR/.next/static/" "$REMOTE:$remote_release/.next/static/"
rsync -az --delete "$APP_DIR/public/" "$REMOTE:$remote_release/public/"

ssh "$REMOTE" "ln -sfn '$REMOTE_ENV' '$remote_release/.env.local' && ln -sfn '$remote_release' '$REMOTE_BASE/current'"

echo "Restarting PM2 with Kenmito runtime env"
ssh "$REMOTE" 'node - <<'"'"'NODE'"'"'
const fs = require("fs");
const { spawnSync } = require("child_process");

const envFile = "/var/www/www/enail/kenmito-storefront/shared/.env.runtime";
const env = { ...process.env, PORT: "3022", NODE_ENV: "production" };

for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;

  const eq = line.indexOf("=");
  if (eq <= 0) continue;

  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();

  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  env[key] = value;
}

for (const args of [["restart", "enail-grocery-kenmito", "--update-env"], ["save"]]) {
  const result = spawnSync("pm2", args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
NODE'

echo "Deployed Kenmito storefront release: $release"
