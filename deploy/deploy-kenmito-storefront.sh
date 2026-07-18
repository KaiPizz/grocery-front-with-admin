#!/usr/bin/env bash
set -euo pipefail

# Build and deploy the Kenmito storefront from the build server.
# This intentionally loads the production runtime env before building and
# before restarting PM2. Next.js inlines NEXT_PUBLIC_* at build time, so building
# without this env makes the storefront fall back to the default catalog.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/grocery-storefront"
REMOTE="${KENMITO_REMOTE:-contabo-server}"
REMOTE_BASE="${KENMITO_REMOTE_BASE:-/var/www/kenmito-storefront}"
REMOTE_ENV="$REMOTE_BASE/shared/.env.runtime"
LOCAL_ENV="$APP_DIR/.env.local"
EXPECTED_CHANNEL="${KENMITO_CHANNEL:-asiandeligo}"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Missing storefront directory: $APP_DIR" >&2
  exit 1
fi

if ! ssh "$REMOTE" "test -s '$REMOTE_ENV'"; then
  echo "Remote runtime env is missing: $REMOTE:$REMOTE_ENV" >&2
  echo "Create it before deploying. Values are not printed." >&2
  exit 1
fi

echo "Copying storefront runtime env for build. Values are not printed."
scp "$REMOTE:$REMOTE_ENV" "$LOCAL_ENV"

if ! grep -q "^NEXT_PUBLIC_CHANNEL=${EXPECTED_CHANNEL}$" "$LOCAL_ENV"; then
  echo "Refusing to build: $LOCAL_ENV is not configured for NEXT_PUBLIC_CHANNEL=$EXPECTED_CHANNEL" >&2
  exit 1
fi

commit="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
stamp="$(date -u +%Y%m%d%H%M%S)"
release="${commit}-env-${stamp}"
remote_release="$REMOTE_BASE/releases/$release"

echo "Building Asia Deli Go storefront at commit $commit"
npm --prefix "$APP_DIR" ci --include=dev --no-audit --no-fund
npm --prefix "$APP_DIR" run lint
npm --prefix "$APP_DIR" run build
npm --prefix "$APP_DIR" run test:production-smoke

echo "Creating remote release $release"
ssh "$REMOTE" "mkdir -p '$remote_release'"
rsync -az --delete "$APP_DIR/.next/standalone/" "$REMOTE:$remote_release/"
ssh "$REMOTE" "mkdir -p '$remote_release/.next/static' '$remote_release/public'"
rsync -az --delete "$APP_DIR/.next/static/" "$REMOTE:$remote_release/.next/static/"
rsync -az --delete "$APP_DIR/public/" "$REMOTE:$remote_release/public/"

ssh "$REMOTE" "ln -sfn '$REMOTE_ENV' '$remote_release/.env.local' && ln -sfnT '$remote_release' '$REMOTE_BASE/current'"

echo "Restarting PM2 with Asia Deli Go runtime env"
ssh "$REMOTE" 'node - <<'"'"'NODE'"'"'
const fs = require("fs");
const { spawnSync } = require("child_process");

const envFile = "/var/www/kenmito-storefront/shared/.env.runtime";
const env = {
  ...process.env,
  HOSTNAME: "127.0.0.1",
  PORT: "3022",
  NODE_ENV: "production",
};

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

const service = "enail-grocery-kenmito";
const describe = spawnSync("pm2", ["describe", service], {
  env,
  stdio: "ignore",
});
const command = describe.status === 0
  ? ["restart", service, "--update-env"]
  : [
    "start",
    "server.js",
    "--name",
    service,
    "--cwd",
    "/var/www/kenmito-storefront/current",
    "--update-env",
  ];

for (const args of [command, ["save"]]) {
  const result = spawnSync("pm2", args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
NODE'

echo "Deployed Asia Deli Go storefront release: $release"
