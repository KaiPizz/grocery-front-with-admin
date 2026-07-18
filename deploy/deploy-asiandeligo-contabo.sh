#!/usr/bin/env bash

# Guarded Asia Deli Go release coordinator.
#
# This is the only supported lane for the standalone Asia Deli Go storefront
# and admin panel. It builds an exact Git commit on the Netcup build host,
# verifies immutable artifacts, stages both releases on Contabo, and delegates
# the atomic activation/automatic rollback transaction to the reviewed remote
# activator.

set -Eeuo pipefail
set -f
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACTIVATOR="$ROOT_DIR/deploy/activate-asiandeligo-release.sh"
REMOTE="contabo-server"
STORE_BASE="/var/www/kenmito-storefront"
ADMIN_BASE="/var/www/kenmito-admin"
STORE_ENV="$STORE_BASE/shared/.env.runtime"
ADMIN_ENV="$ADMIN_BASE/shared/.env.runtime"
STORE_SERVICE="enail-grocery-kenmito"
ADMIN_SERVICE="enail-asiandeligo-admin"
STORE_PUBLIC_ORIGIN="https://asiandeligo.eshoper.pro"
ADMIN_PUBLIC_ORIGIN="https://asiandeligo-admin.eshoper.pro"
PRODUCTION_PUBLIC_IP="37.60.231.45"
EXPECTED_CHANNEL="asiandeligo"
EXPECTED_SLUG="asiandeligo"
LOCAL_RELEASE_LOCK="/tmp/asiandeligo-release.lock"
REMOTE_ASIA_LOCK="/tmp/asiandeligo-release.lock.d"
REMOTE_BACKEND_LOCK="/tmp/enail-be-deploy.lock.d"
REMOTE_FRONTEND_LOCK="/tmp/enail-fe-deploy.lock.d"
REMOTE_FRONTEND_SWAP_LOCK="/tmp/enail-fe-swap.lock"

EXPECTED_COMMIT=""
CHECK_ONLY=""
CONFIRMED=""
BUILD_ROOT=""
BUILD_SOURCE=""
WORKTREE_ADDED=""
REMOTE_LOCKS_HELD=""
ACTIVATION_STARTED=""
RELEASE_STAMP=""
STORE_RELEASE_ID=""
ADMIN_RELEASE_ID=""
STORE_BUILD_ID=""
ADMIN_BUILD_ID=""
STORE_ENV_SHA256=""
ADMIN_ENV_SHA256=""
STORE_ENV_OWNER="0:0"
ADMIN_ENV_OWNER="1001:1001"
ACTIVATOR_SNAPSHOT=""
ACTIVATOR_SHA256=""
SANITIZED_HOME=""
PLAYWRIGHT_BROWSER_CACHE="${HOME}/.cache/ms-playwright"

usage() {
  cat <<'USAGE'
Usage:
  deploy/deploy-asiandeligo-contabo.sh --commit <full-40-char-sha> --check-only
  deploy/deploy-asiandeligo-contabo.sh --commit <full-40-char-sha> --yes

--check-only performs all local build/test/artifact checks and read-only
production preflights. It never creates remote directories, transfers files or
artifacts to production, changes symlinks, or restarts services.

The real run requires the exact commit to equal both local HEAD and
origin/main. Unsupported bypass, remote-build, skip-test, and manual rollback
flags are deliberately refused.
USAGE
}

die() {
  printf 'REFUSED: %s\n' "$*" >&2
  exit 1
}

note() {
  printf '\n==> %s\n' "$*"
}

run_sanitized() {
  [[ -n "$SANITIZED_HOME" && -d "$SANITIZED_HOME" ]] \
    || die "sanitized build home is not initialized"
  env -i \
    PATH="$PATH" HOME="$SANITIZED_HOME" USER="${USER:-}" LOGNAME="${LOGNAME:-}" \
    LANG=C.UTF-8 LC_ALL=C.UTF-8 TMPDIR="${TMPDIR:-/tmp}" \
    NPM_CONFIG_CACHE="$SANITIZED_HOME/npm-cache" \
    PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSER_CACHE" \
    "$@"
}

cleanup() {
  local rc=$?
  set +e

  if [[ -n "$REMOTE_LOCKS_HELD" && -z "$ACTIVATION_STARTED" ]]; then
    ssh "$REMOTE" "rmdir '$REMOTE_ASIA_LOCK' '$REMOTE_FRONTEND_LOCK' '$REMOTE_BACKEND_LOCK' 2>/dev/null" >/dev/null 2>&1 || true
  fi

  if [[ -n "$WORKTREE_ADDED" && -n "$BUILD_SOURCE" ]]; then
    git -C "$ROOT_DIR" worktree remove --force "$BUILD_SOURCE" >/dev/null 2>&1 || true
    git -C "$ROOT_DIR" worktree prune >/dev/null 2>&1 || true
  fi

  if [[ -n "$BUILD_ROOT" && "$BUILD_ROOT" == /tmp/asiandeligo-release.* && -d "$BUILD_ROOT" ]]; then
    rm -rf -- "$BUILD_ROOT"
  fi

  trap - EXIT
  exit "$rc"
}

trap cleanup EXIT
trap 'exit 130' INT TERM HUP

while (($#)); do
  case "$1" in
    --commit)
      (($# >= 2)) || die "--commit requires a value"
      EXPECTED_COMMIT="$2"
      shift 2
      ;;
    --check-only)
      CHECK_ONLY=1
      shift
      ;;
    --yes)
      CONFIRMED=1
      shift
      ;;
    --remote-build|--skip-tests|--allow-dirty|--no-rollback|--allow-prod-ahead|--force-peak|--dry-run)
      die "$1 is disabled for this production lane"
      ;;
    --rollback)
      die "manual rollback needs a separate source-aware recovery plan"
      ;;
    --components|--files)
      die "$1 is unsupported; admin and storefront release as one transaction"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40}$ ]] || die "--commit must be a full lowercase 40-character Git SHA"
if [[ -n "$CHECK_ONLY" && -n "$CONFIRMED" ]]; then
  die "choose either --check-only or --yes"
fi
if [[ -z "$CHECK_ONLY" && -z "$CONFIRMED" ]]; then
  die "production mutation requires a fresh owner-reviewed plan and --yes"
fi

for command_name in env git ssh scp npm node curl sha256sum tar rsync flock mktemp; do
  command -v "$command_name" >/dev/null || die "missing required command: $command_name"
done
[[ -x "$ACTIVATOR" ]] || die "remote activator is missing or not executable: $ACTIVATOR"

assert_clean_source() {
  local mode="$1"
  local local_head remote_main dirty containing_remote

  git -C "$ROOT_DIR" fetch --quiet origin
  git -C "$ROOT_DIR" cat-file -e "$EXPECTED_COMMIT^{commit}" 2>/dev/null \
    || die "commit does not exist locally after fetch: $EXPECTED_COMMIT"

  local_head="$(git -C "$ROOT_DIR" rev-parse HEAD)"
  [[ "$local_head" == "$EXPECTED_COMMIT" ]] \
    || die "local HEAD $local_head does not equal --commit $EXPECTED_COMMIT"

  dirty="$(git -C "$ROOT_DIR" status --porcelain=v1 --untracked-files=all)"
  [[ -z "$dirty" ]] || {
    printf '%s\n' "$dirty" >&2
    die "source worktree is dirty"
  }

  if [[ "$mode" == "release" ]]; then
    remote_main="$(git -C "$ROOT_DIR" rev-parse origin/main)"
    [[ "$remote_main" == "$EXPECTED_COMMIT" ]] \
      || die "origin/main $remote_main does not equal approved commit $EXPECTED_COMMIT"
  else
    containing_remote="$(git -C "$ROOT_DIR" branch -r --contains "$EXPECTED_COMMIT" | sed -n '1p')"
    [[ -n "$containing_remote" ]] \
      || die "check-only commit has not been pushed to any origin branch"
  fi
}

remote_preflight() {
  local lock_mode="${1:-clear}"
  note "Read-only Contabo preflight"
  ssh "$REMOTE" bash -s -- \
    "$STORE_BASE" "$ADMIN_BASE" "$STORE_ENV" "$ADMIN_ENV" \
    "$STORE_SERVICE" "$ADMIN_SERVICE" "$EXPECTED_CHANNEL" "$EXPECTED_SLUG" \
    "$STORE_PUBLIC_ORIGIN" "$ADMIN_PUBLIC_ORIGIN" "$lock_mode" "$(node --version)" \
    "$REMOTE_ASIA_LOCK" "$REMOTE_BACKEND_LOCK" "$REMOTE_FRONTEND_LOCK" "$REMOTE_FRONTEND_SWAP_LOCK" \
    "$STORE_ENV_OWNER" "$ADMIN_ENV_OWNER" <<'REMOTE_PREFLIGHT'
set -Eeuo pipefail

store_base="$1"
admin_base="$2"
store_env="$3"
admin_env="$4"
store_service="$5"
admin_service="$6"
expected_channel="$7"
expected_slug="$8"
store_origin="$9"
admin_origin="${10}"
lock_mode="${11}"
expected_node="${12}"
asia_lock="${13}"
backend_lock="${14}"
frontend_lock="${15}"
frontend_swap_lock="${16}"
expected_store_owner="${17}"
expected_admin_owner="${18}"

fail() {
  printf 'REMOTE PREFLIGHT FAILED: %s\n' "$*" >&2
  exit 1
}

for command_name in node npm pm2 curl sha256sum tar ss; do
  command -v "$command_name" >/dev/null || fail "missing $command_name"
done

if [[ "$lock_mode" == "clear" ]]; then
  for lock_path in "$asia_lock" "$backend_lock" "$frontend_lock" "$frontend_swap_lock"; do
    [[ ! -e "$lock_path" ]] || fail "deployment lock exists: $lock_path"
  done
elif [[ "$lock_mode" == "owned" ]]; then
  for lock_path in "$asia_lock" "$backend_lock" "$frontend_lock"; do
    [[ -d "$lock_path" ]] || fail "coordinator lock disappeared: $lock_path"
  done
  [[ ! -e "$frontend_swap_lock" ]] || fail "frontend swap lock exists: $frontend_swap_lock"
else
  fail "invalid preflight lock mode"
fi

for env_pair in "$store_env:$expected_store_owner" "$admin_env:$expected_admin_owner"; do
  env_file="${env_pair%%:*}"
  expected_owner="${env_pair#*:}"
  [[ -f "$env_file" && ! -L "$env_file" && -s "$env_file" ]] \
    || fail "runtime env must be a non-empty regular non-symlink file: $env_file"
  mode="$(stat -c '%a' "$env_file")"
  owner="$(stat -c '%u:%g' "$env_file")"
  [[ "$mode" == "600" ]] || fail "runtime env mode must be 600: $env_file (is $mode)"
  [[ "$owner" == "$expected_owner" ]] \
    || fail "runtime env owner differs from the reviewed component owner: $env_file"
done

node - \
  "$store_env" "$admin_env" "$expected_channel" "$expected_slug" \
  "$admin_base" "$admin_origin" <<'NODE'
const fs = require('node:fs');

function parseDotenv(path) {
  const parsed = Object.create(null);
  for (const rawLine of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trimStart();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) throw new Error('Invalid dotenv syntax');
    let value = match[2];
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
      }
    } else {
      const comment = value.indexOf('#');
      if (comment >= 0) value = value.slice(0, comment);
      value = value.trim();
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

const [storePath, adminPath, expectedChannel, expectedSlug, adminBase, adminOrigin] = process.argv.slice(2);
const store = parseDotenv(storePath);
const admin = parseDotenv(adminPath);
const allowedSlugs = (admin.ADMIN_ALLOWED_SLUGS || '').split(',').map((value) => value.trim());
const bffSecretValid = /^[\x21-\x7e]{32,512}$/.test((store.CUSTOMER_AUTH_BFF_SECRET || '').trim());
let authGraphqlValid = false;
try {
  const url = new URL((store.CUSTOMER_AUTH_GRAPHQL_URL || '').trim());
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  authGraphqlValid = loopback && ['http:', 'https:'].includes(url.protocol) &&
    !url.username && !url.password && !url.search && !url.hash;
} catch {}
const mandatoryPublicUrlKeys = [
  'NEXT_PUBLIC_ADMIN_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_CONFIG_API_URL',
  'NEXT_PUBLIC_GRAPHQL_URL',
];
const publicUrlsValid = mandatoryPublicUrlKeys.every((key) => {
  try {
    const url = new URL((store[key] || '').trim());
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
});
const staticConfig = (store.NEXT_PUBLIC_STATIC_CONFIG_URL || '').trim();
const staticConfigValid = !staticConfig || (
  staticConfig.startsWith('/') && !staticConfig.startsWith('//') &&
  !staticConfig.includes('\\') && !staticConfig.includes('#')
);

if (store.NEXT_PUBLIC_CHANNEL !== expectedChannel ||
    store.NEXT_PUBLIC_SALON_SLUG !== expectedSlug ||
    store.NODE_ENV !== 'production' ||
    !bffSecretValid || !authGraphqlValid || !publicUrlsValid || !staticConfigValid) {
  throw new Error('Storefront runtime identity is invalid');
}
if (!admin.ADMIN_USERNAME || admin.ADMIN_USERNAME.length > 128 ||
    admin.ADMIN_USERNAME.trim() !== admin.ADMIN_USERNAME ||
    !admin.ADMIN_PASSWORD_HASH?.startsWith('scrypt:') ||
    admin.ADMIN_PASSWORD ||
    Buffer.byteLength(admin.ADMIN_SESSION_SECRET || '', 'utf8') < 32 ||
    !allowedSlugs.includes(expectedSlug) ||
    admin.NEXT_PUBLIC_SALON_SLUG !== expectedSlug ||
    admin.ADMIN_DATA_DIR !== `${adminBase}/shared/data` ||
    admin.ADMIN_UPLOAD_DIR !== `${adminBase}/shared/public/uploads` ||
    admin.ADMIN_PUBLIC_ORIGIN !== adminOrigin) {
  throw new Error('Admin runtime identity/security configuration is invalid');
}
NODE

[[ -d "$admin_base/shared/data" ]] || fail "admin shared data directory is missing"
[[ -d "$admin_base/shared/public/uploads" ]] || fail "admin shared upload directory is missing"

for pair in "$store_base:$store_service" "$admin_base:$admin_service"; do
  base="${pair%%:*}"
  service="${pair#*:}"
  [[ -L "$base/current" ]] || fail "$base/current is not a symlink"
  target="$(readlink -f "$base/current")"
  case "$target" in
    "$base"/releases/*) ;;
    *) fail "$base/current resolves outside the release directory" ;;
  esac
  [[ -f "$target/server.js" && -f "$target/.next/BUILD_ID" ]] \
    || fail "$service current release is incomplete"
  pm2 describe "$service" >/dev/null 2>&1 || fail "PM2 service is missing: $service"
  pid="$(pm2 pid "$service")"
  [[ "$pid" =~ ^[1-9][0-9]*$ ]] || fail "$service has no live PID"
  live_cwd="$(readlink -f "/proc/$pid/cwd")"
  [[ "$live_cwd" == "$target" ]] \
    || fail "$service live cwd differs from its current release pointer"
done

node - \
  "$store_service" "$admin_service" "$store_env" "$store_base" \
  "$admin_env" "$admin_base" <<'NODE'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const [storeService, adminService, storeEnv, storeBase, adminEnv, adminBase] = process.argv.slice(2);
const list = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' }));
for (const service of [storeService, adminService]) {
  const item = list.find((candidate) => candidate.name === service);
  if (!item || item.pm2_env?.status !== 'online') {
    throw new Error(`PM2 service is not online: ${service}`);
  }
}
const store = list.find((candidate) => candidate.name === storeService).pm2_env;
const admin = list.find((candidate) => candidate.name === adminService).pm2_env;

function parseDotenv(path) {
  const parsed = Object.create(null);
  for (const rawLine of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trimStart();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) throw new Error('Invalid dotenv syntax');
    let value = match[2];
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    } else {
      const comment = value.indexOf('#');
      if (comment >= 0) value = value.slice(0, comment);
      value = value.trim();
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

const runtime = parseDotenv(storeEnv);
const runtimeKey = (key) => key === 'NODE_ENV' || key.startsWith('CUSTOMER_') ||
  key.startsWith('NEXT_PUBLIC_');
const expectedKeys = Object.keys(runtime).filter(runtimeKey).sort();
const actualKeys = Object.keys(store).filter(runtimeKey).sort();
if (runtime.NODE_ENV !== 'production' || store.NODE_ENV !== 'production' ||
    JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
  throw new Error('Storefront PM2 runtime keyset differs from protected dotenv');
}
for (const key of expectedKeys) {
  if (String(store[key] ?? '') !== runtime[key]) {
    throw new Error(`Storefront PM2 runtime differs from protected dotenv at ${key}`);
  }
}
if (store.pm_exec_path !== `${storeBase}/current/server.js` ||
    store.pm_cwd !== `${storeBase}/current` ||
    !['127.0.0.1', '0.0.0.0'].includes(store.HOSTNAME) ||
    String(store.PORT) !== '3022') {
  throw new Error('Storefront PM2 definition is not the reviewed production topology');
}
if (admin.ADMIN_PASSWORD_HASH || admin.ADMIN_SESSION_SECRET || admin.ADMIN_PASSWORD ||
    admin.pm_exec_path !== '/bin/bash' || !Array.isArray(admin.args) ||
    !admin.args.join(' ').includes(adminEnv) ||
    !admin.args.join(' ').includes(`${adminBase}/current`)) {
  throw new Error('Admin PM2 definition is not the reviewed secret-loading wrapper');
}
const backend = list.find((candidate) => candidate.name === 'enail-backend');
if (!backend || backend.pm2_env?.status !== 'online') {
  throw new Error('enail-backend is not online');
}
const uptimeMs = Date.now() - Number(backend.pm2_env.pm_uptime || 0);
if (!Number.isFinite(uptimeMs) || uptimeMs < 15 * 60 * 1000) {
  throw new Error('enail-backend restarted less than 15 minutes ago; serialize releases');
}
NODE

[[ "$(node --version)" == "$expected_node" ]] \
  || fail "Contabo Node runtime does not match the Netcup builder"

available_kb="$(df -Pk "$store_base" | awk 'NR==2 {print $4}')"
[[ "${available_kb:-0}" -ge 2097152 ]] || fail "Contabo has less than 2 GiB available"

[[ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3022/)" == "200" ]] \
  || fail "storefront loopback health failed"
[[ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:4100/api/health)" == "200" ]] \
  || fail "admin loopback health failed"
[[ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$store_origin/")" == "200" ]] \
  || fail "storefront public health failed"
[[ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$admin_origin/api/health")" == "200" ]] \
  || fail "admin public health failed"
[[ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 https://enail.pro/api/v1/health)" == "200" ]] \
  || fail "shared backend health failed"

printf 'Contabo preflight passed; no production state changed.\n'
REMOTE_PREFLIGHT
}

assert_direct_ports_blocked() {
  local port
  note "Verify production app ports are not reachable directly from the Internet"
  for port in 3022 4100; do
    if curl --noproxy '*' -sS --connect-timeout 3 --max-time 5 \
      -o /dev/null "http://$PRODUCTION_PUBLIC_IP:$port/" 2>/dev/null; then
      die "production port $port is reachable directly; expected firewall containment"
    fi
  done
}

validate_local_env_files() {
  local store_file="$1"
  local admin_file="$2"

  node - \
    "$store_file" "$admin_file" "$EXPECTED_CHANNEL" "$EXPECTED_SLUG" \
    "$ADMIN_BASE" "$ADMIN_PUBLIC_ORIGIN" <<'NODE'
const fs = require('node:fs');

function parseDotenv(path) {
  const parsed = Object.create(null);
  for (const rawLine of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trimStart();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) throw new Error('Invalid dotenv syntax');
    let value = match[2];
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    } else {
      const comment = value.indexOf('#');
      if (comment >= 0) value = value.slice(0, comment);
      value = value.trim();
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

const [storePath, adminPath, expectedChannel, expectedSlug, , adminOrigin] = process.argv.slice(2);
const store = parseDotenv(storePath);
const admin = parseDotenv(adminPath);
const mandatoryPublicUrlKeys = [
  'NEXT_PUBLIC_ADMIN_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_CONFIG_API_URL',
  'NEXT_PUBLIC_GRAPHQL_URL',
];
const publicUrlsValid = mandatoryPublicUrlKeys.every((key) => {
  try {
    const url = new URL((store[key] || '').trim());
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
});
const staticConfig = (store.NEXT_PUBLIC_STATIC_CONFIG_URL || '').trim();
const staticConfigValid = !staticConfig || (
  staticConfig.startsWith('/') && !staticConfig.startsWith('//') &&
  !staticConfig.includes('\\') && !staticConfig.includes('#')
);

if (store.NEXT_PUBLIC_CHANNEL !== expectedChannel ||
    store.NEXT_PUBLIC_SALON_SLUG !== expectedSlug ||
    !publicUrlsValid || !staticConfigValid) {
  throw new Error('Copied storefront env has the wrong channel/slug');
}
if (admin.NEXT_PUBLIC_SALON_SLUG !== expectedSlug || admin.ADMIN_PUBLIC_ORIGIN !== adminOrigin) {
  throw new Error('Copied admin env failed identity/security validation');
}
const forbidden = /(?:PASSWORD|SECRET|TOKEN|PRIVATE|CUSTOMER_AUTH|ADMIN_SESSION|ADMIN_USERNAME|ADMIN_ALLOWED_SLUGS|ADMIN_DATA_DIR|ADMIN_UPLOAD_DIR)/i;
if ([...Object.keys(store), ...Object.keys(admin)].some((key) => forbidden.test(key))) {
  throw new Error('Secret/runtime-only key leaked into a local build env file');
}
NODE
}

fingerprint_env_names() {
  local env_file="$1"
  sed -nE 's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p' "$env_file" \
    | LC_ALL=C sort -u \
    | sha256sum \
    | awk '{print $1}'
}

capture_remote_env_hashes() {
  local state captured_store_owner captured_admin_owner store_mode admin_mode
  state="$(ssh "$REMOTE" \
    "for env_file in '$STORE_ENV' '$ADMIN_ENV'; do printf '%s %s %s\\n' \"\$(sha256sum \"\$env_file\" | awk '{print \$1}')\" \"\$(stat -c '%u:%g' \"\$env_file\")\" \"\$(stat -c '%a' \"\$env_file\")\"; done")"
  read -r STORE_ENV_SHA256 captured_store_owner store_mode <<<"$(sed -n '1p' <<<"$state")"
  read -r ADMIN_ENV_SHA256 captured_admin_owner admin_mode <<<"$(sed -n '2p' <<<"$state")"
  [[ "$STORE_ENV_SHA256" =~ ^[0-9a-f]{64}$ && "$ADMIN_ENV_SHA256" =~ ^[0-9a-f]{64}$ ]] \
    || die "could not fingerprint production runtime env files"
  [[ "$captured_store_owner" == "$STORE_ENV_OWNER" && "$captured_admin_owner" == "$ADMIN_ENV_OWNER" ]] \
    || die "production runtime env ownership differs from the reviewed component owners"
  [[ "$store_mode" == "600" && "$admin_mode" == "600" ]] \
    || die "production runtime env mode drifted during capture"
}

assert_remote_env_hashes() {
  local state current_store current_admin current_store_owner current_admin_owner store_mode admin_mode
  state="$(ssh "$REMOTE" \
    "for env_file in '$STORE_ENV' '$ADMIN_ENV'; do printf '%s %s %s\\n' \"\$(sha256sum \"\$env_file\" | awk '{print \$1}')\" \"\$(stat -c '%u:%g' \"\$env_file\")\" \"\$(stat -c '%a' \"\$env_file\")\"; done")"
  read -r current_store current_store_owner store_mode <<<"$(sed -n '1p' <<<"$state")"
  read -r current_admin current_admin_owner admin_mode <<<"$(sed -n '2p' <<<"$state")"
  [[ "$current_store" == "$STORE_ENV_SHA256" ]] \
    || die "storefront runtime env changed during build/release; rerun from preflight"
  [[ "$current_admin" == "$ADMIN_ENV_SHA256" ]] \
    || die "admin runtime env changed during build/release; rerun from preflight"
  [[ "$current_store_owner" == "$STORE_ENV_OWNER" && "$current_admin_owner" == "$ADMIN_ENV_OWNER" ]] \
    || die "runtime env ownership changed during build/release; rerun from preflight"
  [[ "$store_mode" == "600" && "$admin_mode" == "600" ]] \
    || die "runtime env mode changed during build/release; rerun from preflight"
}

copy_safe_build_env() {
  local remote_env="$1"
  local component="$2"
  local destination="$3"

  ssh "$REMOTE" node - "$remote_env" "$component" >"$destination" <<'NODE'
const fs = require('node:fs');

function parseDotenv(path) {
  const parsed = Object.create(null);
  for (const rawLine of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trimStart();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) throw new Error('Invalid dotenv syntax');
    let value = match[2];
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    } else {
      const comment = value.indexOf('#');
      if (comment >= 0) value = value.slice(0, comment);
      value = value.trim();
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

const [path, component] = process.argv.slice(2);
const parsed = parseDotenv(path);
const keys = Object.keys(parsed).filter((key) => {
  if (key.startsWith('NEXT_PUBLIC_')) return true;
  return component === 'admin' && ['ADMIN_PUBLIC_ORIGIN', 'STOREFRONT_ORIGINS'].includes(key);
}).sort();
for (const key of keys) process.stdout.write(`${key}=${JSON.stringify(parsed[key])}\n`);
NODE
  chmod 600 "$destination"
}

scan_artifact_for_secrets() {
  local artifact_dir="$1"
  local env_file="$2"
  node - "$artifact_dir" "$env_file" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [root, envPath] = process.argv.slice(2);
const sensitiveName = /(PASSWORD|SECRET|TOKEN|PRIVATE|CLIENT_SECRET|API_KEY|SIGNING_KEY)/i;
const values = fs.readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#'))
  .map((line) => {
    const normalized = line.replace(/^\s*export\s+/, '');
    const index = normalized.indexOf('=');
    if (index < 1) return null;
    const name = normalized.slice(0, index).trim();
    let value = normalized.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return sensitiveName.test(name) && value.length >= 12 ? Buffer.from(value) : null;
  })
  .filter(Boolean);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath);
      for (const value of values) {
        if (content.includes(value)) {
          throw new Error(`Sensitive runtime value was baked into artifact file: ${path.relative(root, fullPath)}`);
        }
      }
    }
  }
}

walk(root);
NODE
}

write_manifest_and_archive() {
  local component="$1"
  local app_dir="$2"
  local stage_dir="$3"
  local env_file="$4"
  local release_id="$5"
  local test_summary="$6"
  local build_id lock_hash script_hash activator_hash tree_hash repo_url env_names_hash next_version runtime_env_hash

  build_id="$(<"$app_dir/.next/BUILD_ID")"
  lock_hash="$(sha256sum "$app_dir/package-lock.json" | awk '{print $1}')"
  script_hash="$(sha256sum "$ROOT_DIR/deploy/deploy-asiandeligo-contabo.sh" | awk '{print $1}')"
  activator_hash="$(sha256sum "$ACTIVATOR_SNAPSHOT" | awk '{print $1}')"
  tree_hash="$(git -C "$ROOT_DIR" rev-parse "$EXPECTED_COMMIT^{tree}")"
  repo_url="$(git -C "$ROOT_DIR" config --get remote.origin.url)"
  env_names_hash="$(fingerprint_env_names "$env_file")"
  next_version="$(node -p "require('$app_dir/node_modules/next/package.json').version")"
  if [[ "$component" == "admin" ]]; then
    runtime_env_hash="$ADMIN_ENV_SHA256"
  else
    runtime_env_hash="$STORE_ENV_SHA256"
  fi

  cat >"$stage_dir/RELEASE_MANIFEST.txt" <<MANIFEST
repository=$repo_url
source_commit=$EXPECTED_COMMIT
source_tree=$tree_hash
component=$component
release_id=$release_id
node_version=$(node --version)
npm_version=$(npm --version)
next_version=$next_version
package_lock_sha256=$lock_hash
deploy_script_sha256=$script_hash
remote_activator_sha256=$activator_hash
build_id=$build_id
build_env_keyset_sha256=$env_names_hash
runtime_env_sha256=$runtime_env_hash
verification=$test_summary
built_at_utc=$RELEASE_STAMP
MANIFEST

  if find "$stage_dir" -type f -name '.env*' -print -quit | grep -q .; then
    die "$component artifact contains a runtime env file"
  fi
  scan_artifact_for_secrets "$stage_dir" "$env_file"

  (
    cd "$stage_dir"
    find . -type f ! -name SHA256SUMS -print0 \
      | LC_ALL=C sort -z \
      | xargs -0 sha256sum > SHA256SUMS
  )

  local archive="$BUILD_ROOT/$component-$release_id.tar.gz"
  tar -C "$stage_dir" -czf "$archive" .
  (
    cd "$BUILD_ROOT"
    sha256sum "$(basename "$archive")" >"$(basename "$archive").sha256"
  )
}

build_and_package() {
  BUILD_ROOT="$(mktemp -d /tmp/asiandeligo-release.XXXXXXXX)"
  BUILD_SOURCE="$BUILD_ROOT/source"
  SANITIZED_HOME="$BUILD_ROOT/sanitized-home"
  mkdir -m 700 "$SANITIZED_HOME"
  RELEASE_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  STORE_RELEASE_ID="storefront-${EXPECTED_COMMIT:0:12}-$RELEASE_STAMP"
  ADMIN_RELEASE_ID="admin-${EXPECTED_COMMIT:0:12}-$RELEASE_STAMP"

  note "Create isolated detached builder at $EXPECTED_COMMIT"
  git -C "$ROOT_DIR" worktree add --detach "$BUILD_SOURCE" "$EXPECTED_COMMIT" >/dev/null
  WORKTREE_ADDED=1
  ACTIVATOR_SNAPSHOT="$BUILD_ROOT/activate-asiandeligo-release.sh"
  git -C "$ROOT_DIR" show "$EXPECTED_COMMIT:deploy/activate-asiandeligo-release.sh" >"$ACTIVATOR_SNAPSHOT"
  chmod 500 "$ACTIVATOR_SNAPSHOT"
  ACTIVATOR_SHA256="$(sha256sum "$ACTIVATOR_SNAPSHOT" | awk '{print $1}')"
  [[ "$ACTIVATOR_SHA256" == "$(git -C "$ROOT_DIR" show "$EXPECTED_COMMIT:deploy/activate-asiandeligo-release.sh" | sha256sum | awk '{print $1}')" ]] \
    || die "could not materialize the committed remote activator"

  local store_app="$BUILD_SOURCE/grocery-storefront"
  local admin_app="$BUILD_SOURCE/admin-panel"
  [[ -f "$store_app/package-lock.json" && -f "$admin_app/package-lock.json" ]] \
    || die "candidate is missing application lockfiles"

  note "Install exact dependencies and run static/unit security gates"
  run_sanitized npm --prefix "$admin_app" ci --include=dev --no-audit --no-fund
  run_sanitized npm --prefix "$admin_app" audit --omit=dev --audit-level=high
  run_sanitized npm --prefix "$admin_app" run lint
  run_sanitized npm --prefix "$admin_app" run test:unit
  (cd "$admin_app" && run_sanitized npx tsc --noEmit)

  run_sanitized npm --prefix "$store_app" ci --include=dev --no-audit --no-fund
  run_sanitized npm --prefix "$store_app" audit --omit=dev --audit-level=high
  run_sanitized npm --prefix "$store_app" run lint
  (cd "$store_app" && run_sanitized npx tsc --noEmit)
  run_sanitized npm --prefix "$store_app" run test:customer-account-contract
  run_sanitized npm --prefix "$store_app" run test:security-headers
  run_sanitized npm --prefix "$store_app" run test:static-config
  (cd "$store_app" && run_sanitized node --test tests/tracking-script-security.test.mjs)
  (cd "$store_app" && run_sanitized npx playwright test \
    tests/mobile-products-page.spec.ts \
    tests/mobile-pd-extras.spec.ts \
    tests/product-card-scan-value.spec.ts \
    --project=pixel-7)

  note "Create secret-free production build env files"
  capture_remote_env_hashes
  copy_safe_build_env "$STORE_ENV" storefront "$store_app/.env.local"
  copy_safe_build_env "$ADMIN_ENV" admin "$admin_app/.env.local"
  validate_local_env_files "$store_app/.env.local" "$admin_app/.env.local"

  note "Build admin and storefront locally (never on Contabo)"
  (
    cd "$admin_app"
    run_sanitized \
      NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=4096" \
      npm run build
    run_sanitized \
      NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
      npm run test:production-smoke
  )
  (
    cd "$store_app"
    run_sanitized \
      NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=8192" \
      npm run build
    run_sanitized \
      NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
      npm run test:production-smoke
  )

  [[ -z "$(git -C "$BUILD_SOURCE" status --porcelain=v1 --untracked-files=all)" ]] \
    || die "build/test lifecycle modified tracked or unignored candidate source"

  ADMIN_BUILD_ID="$(<"$admin_app/.next/BUILD_ID")"
  STORE_BUILD_ID="$(<"$store_app/.next/BUILD_ID")"
  [[ "$ADMIN_BUILD_ID" =~ ^[A-Za-z0-9_-]{1,128}$ ]] \
    || die "admin build produced an unsafe BUILD_ID"
  [[ "$STORE_BUILD_ID" =~ ^[A-Za-z0-9_-]{1,128}$ ]] \
    || die "storefront build produced an unsafe BUILD_ID"

  note "Assemble immutable standalone artifacts"
  local admin_stage="$BUILD_ROOT/admin-stage"
  local store_stage="$BUILD_ROOT/store-stage"
  mkdir -p "$admin_stage/.next/static" "$admin_stage/public" "$store_stage/.next/static" "$store_stage/public"

  rsync -a "$admin_app/.next/standalone/" "$admin_stage/"
  rsync -a "$admin_app/.next/static/" "$admin_stage/.next/static/"
  rsync -a --exclude='/uploads/' "$admin_app/public/" "$admin_stage/public/"
  if [[ -e "$admin_stage/data" || -L "$admin_stage/data" ]]; then
    rm -rf -- "$admin_stage/data"
  fi
  if [[ -e "$admin_stage/public/uploads" || -L "$admin_stage/public/uploads" ]]; then
    rm -rf -- "$admin_stage/public/uploads"
  fi
  ln -s "$ADMIN_ENV" "$admin_stage/.env.local"
  ln -s "$ADMIN_BASE/shared/data" "$admin_stage/data"
  ln -s "$ADMIN_BASE/shared/public/uploads" "$admin_stage/public/uploads"

  rsync -a "$store_app/.next/standalone/" "$store_stage/"
  rsync -a "$store_app/.next/static/" "$store_stage/.next/static/"
  rsync -a "$store_app/public/" "$store_stage/public/"
  ln -s "$STORE_ENV" "$store_stage/.env.local"

  write_manifest_and_archive \
    "admin" "$admin_app" "$admin_stage" "$admin_app/.env.local" "$ADMIN_RELEASE_ID" \
    "npm-audit-high,lint,unit,tsc,production-build,standalone-smoke"
  write_manifest_and_archive \
    "storefront" "$store_app" "$store_stage" "$store_app/.env.local" "$STORE_RELEASE_ID" \
    "npm-audit-high,lint,tsc,auth-contracts,security-contracts,dietary-playwright,production-build,standalone-smoke"

  note "Artifact gate passed (admin BUILD_ID $ADMIN_BUILD_ID; storefront BUILD_ID $STORE_BUILD_ID)"
}

acquire_release_locks() {
  note "Acquire local and Contabo deployment locks"

  exec 7>/tmp/enail-be-deploy.lock
  flock -n 7 || die "another backend deploy holds the local lock"
  exec 8>/tmp/enail-fe-deploy.lock
  flock -n 8 || die "another frontend deploy holds the local lock"
  exec 9>"$LOCAL_RELEASE_LOCK"
  flock -n 9 || die "another Asia Deli Go release holds the local lock"

  ssh "$REMOTE" bash -s -- "$REMOTE_BACKEND_LOCK" "$REMOTE_FRONTEND_LOCK" "$REMOTE_ASIA_LOCK" "$REMOTE_FRONTEND_SWAP_LOCK" <<'REMOTE_LOCK'
set -Eeuo pipefail
backend_lock="$1"
frontend_lock="$2"
asia_lock="$3"
frontend_swap_lock="$4"

[[ ! -e "$frontend_swap_lock" ]] || {
  printf 'Frontend swap lock already exists: %s\n' "$frontend_swap_lock" >&2
  exit 1
}

backend_created=""
frontend_created=""
cleanup_partial() {
  rc=$?
  if [[ "$rc" -ne 0 ]]; then
    [[ -z "$frontend_created" ]] || rmdir "$frontend_lock" 2>/dev/null || true
    [[ -z "$backend_created" ]] || rmdir "$backend_lock" 2>/dev/null || true
  fi
  exit "$rc"
}
trap cleanup_partial EXIT

mkdir "$backend_lock"
backend_created=1
mkdir "$frontend_lock"
frontend_created=1
mkdir "$asia_lock"
trap - EXIT
REMOTE_LOCK
  REMOTE_LOCKS_HELD=1
}

stage_remote_component() {
  local component="$1"
  local base="$2"
  local release_id="$3"
  local build_id="$4"
  local archive="$BUILD_ROOT/$component-$release_id.tar.gz"
  local checksum="$archive.sha256"
  local incoming="$base/.incoming/$release_id"

  note "Stage and verify $component release $release_id"
  ssh "$REMOTE" bash -s -- "$base" "$release_id" <<'REMOTE_MKDIR'
set -Eeuo pipefail
umask 077
base="$1"
release_id="$2"
[[ "$release_id" =~ ^(admin|storefront)-[0-9a-f]{12}-[0-9]{8}T[0-9]{6}Z$ ]]
case "$release_id" in
  admin-*) [[ "$base" == "/var/www/kenmito-admin" ]] ;;
  storefront-*) [[ "$base" == "/var/www/kenmito-storefront" ]] ;;
  *) exit 1 ;;
esac
[[ -d "$base" && -d "$base/releases" ]]
[[ ! -e "$base/releases/$release_id" ]]
incoming_root="$base/.incoming"
if [[ -e "$incoming_root" || -L "$incoming_root" ]]; then
  [[ -d "$incoming_root" && ! -L "$incoming_root" ]]
  [[ "$(stat -c '%u:%g' "$incoming_root")" == "0:0" ]]
  incoming_mode="$(stat -c '%a' "$incoming_root")"
  [[ "$incoming_mode" == "700" ]]
else
  mkdir -m 700 "$incoming_root"
fi
mkdir -m 700 "$incoming_root/$release_id"
REMOTE_MKDIR

  scp -q "$archive" "$checksum" "$REMOTE:$incoming/"

  ssh "$REMOTE" bash -s -- \
    "$base" "$release_id" "$(basename "$archive")" "$(basename "$checksum")" \
    "$build_id" "$component" "$EXPECTED_COMMIT" <<'REMOTE_STAGE'
set -Eeuo pipefail
umask 077
base="$1"
release_id="$2"
archive_name="$3"
checksum_name="$4"
expected_build_id="$5"
component="$6"
expected_commit="$7"
incoming="$base/.incoming/$release_id"
release="$base/releases/$release_id"

[[ "$component" == "admin" || "$component" == "storefront" ]]
if [[ "$component" == "admin" ]]; then
  [[ "$base" == "/var/www/kenmito-admin" ]]
else
  [[ "$base" == "/var/www/kenmito-storefront" ]]
fi
[[ "$release_id" =~ ^(admin|storefront)-[0-9a-f]{12}-[0-9]{8}T[0-9]{6}Z$ ]]
[[ "$release_id" == "$component-"* ]]
[[ "$expected_build_id" =~ ^[A-Za-z0-9_-]{1,128}$ ]]
[[ "$expected_commit" =~ ^[0-9a-f]{40}$ ]]
[[ "$archive_name" == "$component-$release_id.tar.gz" ]]
[[ "$checksum_name" == "$archive_name.sha256" ]]
[[ "$incoming/$archive_name" == "$base/.incoming/$release_id/"* ]]
[[ -d "$incoming" && ! -L "$incoming" ]]
[[ -f "$incoming/$archive_name" && -f "$incoming/$checksum_name" ]]

cleanup_failed_stage() {
  local rc=$?
  trap - EXIT
  if [[ "$rc" -ne 0 && -d "$incoming" ]]; then
    rm -rf -- "$incoming"
  fi
  exit "$rc"
}
trap cleanup_failed_stage EXIT

(
  cd "$incoming"
  sha256sum -c "$checksum_name"
  if tar -tzf "$archive_name" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
    printf 'Unsafe archive path detected\n' >&2
    exit 1
  fi
  mkdir release
  tar --no-same-owner -xzf "$archive_name" -C release
)

candidate="$incoming/release"
[[ -f "$candidate/server.js" && -f "$candidate/.next/BUILD_ID" ]]
[[ "$(<"$candidate/.next/BUILD_ID")" == "$expected_build_id" ]]
grep -qx "source_commit=$expected_commit" "$candidate/RELEASE_MANIFEST.txt"
grep -qx "component=$component" "$candidate/RELEASE_MANIFEST.txt"
(
  cd "$candidate"
  sha256sum -c SHA256SUMS
)

if find "$candidate" -xdev ! -type f ! -type d ! -type l -print -quit | grep -q .; then
  printf 'Release contains an unsupported special file type\n' >&2
  exit 1
fi
if find "$candidate" -xdev ! -type l -perm /6000 -print -quit | grep -q .; then
  printf 'Release contains setuid/setgid content\n' >&2
  exit 1
fi

# The full runtime env never leaves Contabo. Scan the extracted artifact here,
# without printing values, so no production credential was accidentally baked
# into a server bundle despite the secret-free build environment.
node - "$candidate" "$base/shared/.env.runtime" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [root, envPath] = process.argv.slice(2);
const sensitiveName = /(PASSWORD|SECRET|TOKEN|PRIVATE|CLIENT_SECRET|API_KEY|SIGNING_KEY)/i;
const values = fs.readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .filter((line) => line && !line.trimStart().startsWith('#'))
  .map((line) => {
    const normalized = line.replace(/^\s*export\s+/, '');
    const index = normalized.indexOf('=');
    if (index < 1) return null;
    const name = normalized.slice(0, index).trim();
    let value = normalized.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return sensitiveName.test(name) && value.length >= 12 ? Buffer.from(value) : null;
  })
  .filter(Boolean);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath);
      for (const value of values) {
        if (content.includes(value)) {
          throw new Error(`Production credential found in artifact: ${path.relative(root, fullPath)}`);
        }
      }
    }
  }
}

walk(root);
NODE

# Releases are code artifacts owned by root and are never group/world writable.
# find does not follow the external shared-state symlinks.
find "$candidate" -xdev -type d -exec chown root:root {} +
find "$candidate" -xdev -type f -exec chown root:root {} +
find "$candidate" -xdev -type l -exec chown -h root:root {} +
find "$candidate" -xdev ! -type l -perm /022 -exec chmod go-w {} +
if find "$candidate" -xdev ! -type l -perm /022 -print -quit | grep -q .; then
  printf 'Release contains group/world-writable content\n' >&2
  exit 1
fi

while IFS= read -r -d '' link_path; do
  link_target="$(readlink "$link_path")"
  case "$link_target" in
    /*)
      if [[ "$component" == "admin" ]]; then
        case "$link_path:$link_target" in
          "$candidate/.env.local:$base/shared/.env.runtime"|\
          "$candidate/data:$base/shared/data"|\
          "$candidate/public/uploads:$base/shared/public/uploads") ;;
          *) printf 'Unexpected admin external artifact symlink\n' >&2; exit 1 ;;
        esac
      else
        [[ "$link_path:$link_target" == \
          "$candidate/.env.local:$base/shared/.env.runtime" ]] \
          || { printf 'Unexpected storefront external artifact symlink\n' >&2; exit 1; }
      fi
      ;;
    *)
      resolved="$(readlink -f "$link_path")"
      [[ "$resolved" == "$candidate/"* ]] \
        || { printf 'Artifact symlink escapes its release\n' >&2; exit 1; }
      ;;
  esac
done < <(find "$candidate" -xdev -type l -print0)

if [[ "$component" == "admin" ]]; then
  [[ "$(readlink "$candidate/.env.local")" == "$base/shared/.env.runtime" ]]
  [[ "$(readlink "$candidate/data")" == "$base/shared/data" ]]
  [[ "$(readlink "$candidate/public/uploads")" == "$base/shared/public/uploads" ]]
else
  [[ "$(readlink "$candidate/.env.local")" == "$base/shared/.env.runtime" ]]
fi

[[ ! -e "$release" ]]
mv -T "$candidate" "$release"
rm -- "$incoming/$archive_name" "$incoming/$checksum_name"
rmdir "$incoming"
trap - EXIT
REMOTE_STAGE
}

activate_remote_transaction() {
  note "Activate admin then storefront with automatic two-component rollback"
  ACTIVATION_STARTED=1
  ssh "$REMOTE" bash -s -- \
    "$ADMIN_BASE" "$STORE_BASE" "$ADMIN_RELEASE_ID" "$STORE_RELEASE_ID" \
    "$ADMIN_BUILD_ID" "$STORE_BUILD_ID" "$ADMIN_SERVICE" "$STORE_SERVICE" \
    "$ADMIN_PUBLIC_ORIGIN" "$STORE_PUBLIC_ORIGIN" "$EXPECTED_COMMIT" \
    "$ADMIN_ENV_SHA256" "$STORE_ENV_SHA256" \
    "$ADMIN_ENV_OWNER" "$STORE_ENV_OWNER" \
    <"$ACTIVATOR_SNAPSHOT"
}

assert_clean_source "${CHECK_ONLY:+check}"
remote_preflight clear
assert_direct_ports_blocked
build_and_package
assert_remote_env_hashes

if [[ -n "$CHECK_ONLY" ]]; then
  # A check-only build can be long. Re-prove both Git and live read-only state
  # so another session cannot change the reviewed inputs while validation runs.
  assert_clean_source check
  remote_preflight clear
  assert_remote_env_hashes
  assert_direct_ports_blocked
  note "CHECK-ONLY PASSED"
  printf 'Approved candidate commit: %s\n' "$EXPECTED_COMMIT"
  printf 'No production state was changed.\n'
  exit 0
fi

# The long build happened before the critical section. Re-prove source and live
# state after acquiring locks so a concurrent release cannot slip through.
assert_clean_source release
acquire_release_locks
remote_preflight owned
assert_direct_ports_blocked
assert_clean_source release
assert_remote_env_hashes
[[ "$(sha256sum "$ACTIVATOR_SNAPSHOT" | awk '{print $1}')" == "$ACTIVATOR_SHA256" ]] \
  || die "committed activator snapshot changed after build"

stage_remote_component "admin" "$ADMIN_BASE" "$ADMIN_RELEASE_ID" "$ADMIN_BUILD_ID"
stage_remote_component "storefront" "$STORE_BASE" "$STORE_RELEASE_ID" "$STORE_BUILD_ID"
assert_remote_env_hashes
activate_remote_transaction
assert_direct_ports_blocked

note "PRODUCTION RELEASE PASSED"
printf 'source_commit=%s\n' "$EXPECTED_COMMIT"
printf 'admin_release=%s build_id=%s\n' "$ADMIN_RELEASE_ID" "$ADMIN_BUILD_ID"
printf 'storefront_release=%s build_id=%s\n' "$STORE_RELEASE_ID" "$STORE_BUILD_ID"
printf 'Payment, shipping, database, Nginx, and shared admin data were not changed.\n'
