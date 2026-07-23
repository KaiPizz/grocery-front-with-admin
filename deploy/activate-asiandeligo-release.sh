#!/usr/bin/env bash

# Remote half of deploy-asiandeligo-contabo.sh.
# It is streamed to Contabo over SSH and must never be invoked as a standalone
# manual rollback tool. The coordinator has already staged and checksum-verified
# both immutable releases before this transaction begins.

set -Eeuo pipefail
set -f
umask 077

ADMIN_BASE="$1"
STORE_BASE="$2"
ADMIN_RELEASE_ID="$3"
STORE_RELEASE_ID="$4"
ADMIN_BUILD_ID="$5"
STORE_BUILD_ID="$6"
ADMIN_SERVICE="$7"
STORE_SERVICE="$8"
ADMIN_PUBLIC_ORIGIN="$9"
STORE_PUBLIC_ORIGIN="${10}"
EXPECTED_COMMIT="${11}"
EXPECTED_ADMIN_ENV_SHA256="${12}"
EXPECTED_STORE_ENV_SHA256="${13}"
EXPECTED_ADMIN_ENV_OWNER="${14}"
EXPECTED_STORE_ENV_OWNER="${15}"

ADMIN_ENV="$ADMIN_BASE/shared/.env.runtime"
STORE_ENV="$STORE_BASE/shared/.env.runtime"
ADMIN_AUTH_DIR="$ADMIN_BASE/shared/auth"
ADMIN_AUTH_STATE="$ADMIN_AUTH_DIR/admin-auth-state.json"
ADMIN_AUTH_MARKER="$ADMIN_BASE/shared/.admin-auth-state-initialized"
ADMIN_RELEASE="$ADMIN_BASE/releases/$ADMIN_RELEASE_ID"
STORE_RELEASE="$STORE_BASE/releases/$STORE_RELEASE_ID"
ADMIN_PORT=4100
STORE_PORT=3022

ADMIN_SWAPPED=""
STORE_SWAPPED=""
COMMITTED=""
OLD_ADMIN=""
OLD_STORE=""
OLD_ADMIN_PREVIOUS=""
OLD_STORE_PREVIOUS=""
ADMIN_PREVIOUS_PRESENT=""
STORE_PREVIOUS_PRESENT=""
ADMIN_AUTH_DEPLOY_LOCK_TOKEN=""
ADMIN_AUTH_DEPLOY_LOCK_HELD=""

fail() {
  printf 'ACTIVATION FAILED: %s\n' "$*" >&2
  return 1
}

verify_env_file() {
  local env_file="$1"
  local expected_owner="$2"
  local mode owner

  if [[ ! -f "$env_file" || -L "$env_file" ]]; then
    fail "runtime env must be a regular non-symlink file: $env_file"
    return 1
  fi
  mode="$(stat -c '%a' "$env_file")"
  owner="$(stat -c '%u:%g' "$env_file")"
  if [[ "$mode" != "600" || "$owner" != "$expected_owner" ]]; then
    fail "runtime env ownership/mode is unsafe: $env_file"
    return 1
  fi
  [[ -s "$env_file" ]] || fail "runtime env is empty: $env_file"
}

verify_admin_auth_state() {
  node - "$ADMIN_AUTH_DIR" "$ADMIN_AUTH_STATE" "$ADMIN_AUTH_MARKER" \
    "$ADMIN_AUTH_DEPLOY_LOCK_TOKEN" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [authDir, statePath, markerPath, expectedLockToken] = process.argv.slice(2);
const sharedDir = path.dirname(markerPath);
const lockPath = `${authDir}/admin-auth-state.lock`;
const sharedMetadata = fs.lstatSync(sharedDir);
if (!sharedMetadata.isDirectory() || sharedMetadata.isSymbolicLink() ||
    sharedMetadata.uid !== 0 || sharedMetadata.gid !== 0 ||
    (sharedMetadata.mode & 0o022) !== 0) {
  throw new Error('Admin shared parent directory is unsafe');
}
const markerMetadata = fs.lstatSync(markerPath);
if (!markerMetadata.isFile() || markerMetadata.isSymbolicLink() ||
    (markerMetadata.mode & 0o777) !== 0o600 || markerMetadata.uid !== 0 ||
    markerMetadata.gid !== 0 || fs.readFileSync(markerPath, 'utf8') !== 'admin-auth-state-v1\n') {
  throw new Error('Admin auth-state migration marker is invalid');
}
const directoryMetadata = fs.lstatSync(authDir);
if (!directoryMetadata.isDirectory() || directoryMetadata.isSymbolicLink() ||
    (directoryMetadata.mode & 0o777) !== 0o700 || directoryMetadata.uid !== 0 ||
    directoryMetadata.gid !== 0) {
  throw new Error('Admin private auth directory is invalid');
}
if (fs.existsSync(lockPath)) {
  const lockMetadata = fs.lstatSync(lockPath);
  if (!expectedLockToken || !lockMetadata.isFile() || lockMetadata.isSymbolicLink() ||
      (lockMetadata.mode & 0o777) !== 0o600 || lockMetadata.uid !== 0 ||
      lockMetadata.gid !== 0 || lockMetadata.size < 1 || lockMetadata.size > 1024) {
    throw new Error('Unexpected admin auth-state write lock is present');
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const lockKeys = Object.keys(lock).sort();
  if (JSON.stringify(lockKeys) !== JSON.stringify(['createdAt', 'pid', 'purpose', 'token']) ||
      lock.purpose !== 'deployment' || lock.token !== expectedLockToken ||
      !Number.isSafeInteger(lock.pid) || lock.pid < 1 ||
      typeof lock.createdAt !== 'string' || Number.isNaN(Date.parse(lock.createdAt))) {
    throw new Error('Admin auth-state deployment lock is invalid');
  }
} else if (expectedLockToken) {
  throw new Error('Admin auth-state deployment lock disappeared');
}
const metadata = fs.lstatSync(statePath);
if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size < 1 ||
    metadata.size > 8192 || (metadata.mode & 0o777) !== 0o600 ||
    metadata.uid !== 0 || metadata.gid !== 0) {
  throw new Error('Admin auth state metadata is invalid');
}
const value = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const keys = Object.keys(value).sort();
const expected = ['passwordHash', 'schemaVersion', 'sessionGeneration', 'updatedAt'];
const hash = /^scrypt:N=(\d+),r=(\d+),p=(\d+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/.exec(value.passwordHash || '');
if (!hash) throw new Error('Admin auth state hash is invalid');
const N = Number(hash[1]);
const r = Number(hash[2]);
const p = Number(hash[3]);
const hashValid = N >= 16384 && N <= 131072 && (N & (N - 1)) === 0 &&
  r >= 1 && r <= 16 && p >= 1 && p <= 4 &&
  Buffer.from(hash[4], 'base64url').byteLength >= 16 &&
  Buffer.from(hash[4], 'base64url').byteLength <= 64 &&
  Buffer.from(hash[5], 'base64url').byteLength === 64;
if (JSON.stringify(keys) !== JSON.stringify(expected) || value.schemaVersion !== 1 ||
    !hashValid || !Number.isSafeInteger(value.sessionGeneration) ||
    value.sessionGeneration < 1 || value.sessionGeneration >= Number.MAX_SAFE_INTEGER ||
    typeof value.updatedAt !== 'string' || value.updatedAt.length > 64 ||
    Number.isNaN(Date.parse(value.updatedAt))) {
  throw new Error('Admin auth state content is invalid');
}
NODE
}

acquire_admin_auth_deploy_lock() {
  [[ -z "$ADMIN_AUTH_DEPLOY_LOCK_HELD" ]] \
    || { fail "admin auth-state deployment lock is already held"; return 1; }

  ADMIN_AUTH_DEPLOY_LOCK_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")"
  if ! node - "$ADMIN_AUTH_DIR" "$ADMIN_AUTH_DEPLOY_LOCK_TOKEN" "$$" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [authDir, token, ownerPidRaw] = process.argv.slice(2);
const lockPath = path.join(authDir, 'admin-auth-state.lock');
const payload = `${JSON.stringify({
  pid: Number(ownerPidRaw),
  createdAt: new Date().toISOString(),
  purpose: 'deployment',
  token,
})}\n`;
let descriptor;
let lockCreated = false;
try {
  descriptor = fs.openSync(lockPath, 'wx', 0o600);
  lockCreated = true;
  fs.fchmodSync(descriptor, 0o600);
  fs.fchownSync(descriptor, 0, 0);
  fs.writeFileSync(descriptor, payload, 'utf8');
  fs.fsyncSync(descriptor);
  fs.closeSync(descriptor);
  descriptor = undefined;
  const directory = fs.openSync(authDir, 'r');
  try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
} catch (error) {
  if (descriptor !== undefined) {
    try { fs.closeSync(descriptor); } catch {}
  }
  if (lockCreated) {
    try { fs.unlinkSync(lockPath); } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') throw cleanupError;
    }
  }
  throw error;
}
NODE
  then
    ADMIN_AUTH_DEPLOY_LOCK_TOKEN=""
    fail "could not acquire the admin auth-state deployment lock"
    return 1
  fi

  ADMIN_AUTH_DEPLOY_LOCK_HELD=1
  verify_admin_auth_state
}

release_admin_auth_deploy_lock() {
  [[ -n "$ADMIN_AUTH_DEPLOY_LOCK_HELD" ]] || return 0

  node - "$ADMIN_AUTH_DIR" "$ADMIN_AUTH_DEPLOY_LOCK_TOKEN" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [authDir, expectedToken] = process.argv.slice(2);
const lockPath = path.join(authDir, 'admin-auth-state.lock');
const metadata = fs.lstatSync(lockPath);
if (!metadata.isFile() || metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o600 || metadata.uid !== 0 || metadata.gid !== 0) {
  throw new Error('Refusing to remove an unsafe admin auth-state deployment lock');
}
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
if (lock.purpose !== 'deployment' || lock.token !== expectedToken) {
  throw new Error('Refusing to remove an admin auth-state lock owned by another writer');
}
fs.unlinkSync(lockPath);
const directory = fs.openSync(authDir, 'r');
try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
NODE

  ADMIN_AUTH_DEPLOY_LOCK_HELD=""
  ADMIN_AUTH_DEPLOY_LOCK_TOKEN=""
}

atomic_link() {
  local base="$1"
  local link_name="$2"
  local target="$3"
  local temporary="$base/.${link_name}.next.$$"

  if [[ "$target" != "$base/releases/"* ]]; then
    fail "refusing link target outside $base/releases"
    return 1
  fi
  if [[ ! -d "$target" ]]; then
    fail "link target is missing: $target"
    return 1
  fi
  if [[ -e "$temporary" || -L "$temporary" ]]; then
    fail "temporary link already exists"
    return 1
  fi
  if ! ln -s "$target" "$temporary"; then
    fail "could not create temporary link for $base/$link_name"
    return 1
  fi
  if ! mv -Tf "$temporary" "$base/$link_name"; then
    rm -f -- "$temporary"
    fail "could not atomically replace $base/$link_name"
  fi
}

restart_service() {
  local service="$1"
  local env_file="$2"
  local pm2_home

  if [[ ! -s "$env_file" ]]; then
    fail "runtime env disappeared: $env_file"
    return 1
  fi

  if ! pm2 describe "$service" >/dev/null 2>&1; then
    fail "PM2 service disappeared: $service"
    return 1
  fi

  # Do not use --update-env, delete/start, or pm2 save here. This release lane
  # changes code pointers only and deliberately preserves the reviewed live PM2
  # definitions so an automatic rollback restores the exact former topology.
  pm2_home="${PM2_HOME:-$HOME/.pm2}"
  if ! env -i PATH="$PATH" PM2_HOME="$pm2_home" \
    pm2 restart "$service" >/dev/null; then
    fail "PM2 restart failed: $service"
    return 1
  fi
}

verify_pm2_metadata() {
  node - \
    "$ADMIN_SERVICE" "$STORE_SERVICE" "$ADMIN_ENV" "$STORE_ENV" "$STORE_BASE" <<'NODE'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const [adminName, storeName, adminEnv, storeEnv, storeBase] = process.argv.slice(2);
const list = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' }));
const admin = list.find((item) => item.name === adminName)?.pm2_env;
const store = list.find((item) => item.name === storeName)?.pm2_env;
if (!admin || !store) throw new Error('Expected PM2 metadata is missing');

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
if (runtime.NODE_ENV !== 'production') {
  throw new Error('Storefront protected dotenv must pin NODE_ENV=production');
}
if (admin.ADMIN_PASSWORD_HASH || admin.ADMIN_SESSION_SECRET || admin.ADMIN_PASSWORD) {
  throw new Error('Admin credential material leaked into PM2 metadata');
}
if (admin.pm_exec_path !== '/bin/bash' || !Array.isArray(admin.args) ||
    !admin.args.join(' ').includes(adminEnv) ||
    !admin.args.join(' ').includes('/var/www/kenmito-admin/current')) {
  throw new Error('Admin PM2 wrapper changed unexpectedly');
}
if (store.pm_exec_path === '/bin/bash') {
  // Migrated storefront definition: the wrapper sources the protected dotenv
  // at boot, so PM2 metadata/dump must carry no runtime values and the
  // listener must stay on loopback.
  if (actualKeys.length > 0 || store.CUSTOMER_AUTH_BFF_SECRET !== undefined) {
    throw new Error('Storefront runtime material leaked into PM2 metadata');
  }
  if (!Array.isArray(store.args) || !store.args.join(' ').includes(storeEnv) ||
      !store.args.join(' ').includes(`${storeBase}/current`)) {
    throw new Error('Storefront PM2 wrapper changed unexpectedly');
  }
  if (runtime.HOSTNAME !== '127.0.0.1' || String(runtime.PORT) !== '3022') {
    throw new Error('Storefront protected dotenv must pin the loopback listener');
  }
} else {
  // Legacy pre-migration definition: inline metadata must mirror the dotenv.
  if (store.NODE_ENV !== 'production' ||
      JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error('Storefront PM2 runtime keyset differs from protected dotenv');
  }
  for (const key of expectedKeys) {
    if (String(store[key] ?? '') !== runtime[key]) {
      throw new Error(`Storefront PM2 runtime differs from protected dotenv at ${key}`);
    }
  }
  if (!['127.0.0.1', '0.0.0.0'].includes(store.HOSTNAME) ||
      String(store.PORT) !== '3022') {
    throw new Error('Storefront PM2 listener/runtime metadata is invalid');
  }
  if (store.pm_exec_path !== `${storeBase}/current/server.js` ||
      store.pm_cwd !== `${storeBase}/current`) {
    throw new Error('Storefront PM2 code pointer changed unexpectedly');
  }
}
NODE
}

restore_previous_link() {
  local base="$1"
  local old_target="$2"
  local was_present="$3"

  if [[ -n "$was_present" ]]; then
    atomic_link "$base" previous "$old_target"
    return
  fi

  if [[ -e "$base/previous" && ! -L "$base/previous" ]]; then
    fail "$base/previous became a non-symlink during rollback"
    return 1
  fi
  rm -f -- "$base/previous"
}

pm2_definition_fingerprint() {
  local service="$1"
  node - "$service" <<'NODE'
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const service = process.argv[2];
const item = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' }))
  .find((candidate) => candidate.name === service);
if (!item?.pm2_env) throw new Error(`Missing PM2 service: ${service}`);
const env = item.pm2_env;
const runtime = Object.fromEntries(Object.keys(env)
  .filter((key) => key === 'HOSTNAME' || key === 'PORT' || key === 'NODE_ENV' ||
    key.startsWith('CUSTOMER_') || key.startsWith('NEXT_PUBLIC_'))
  .sort()
  .map((key) => [key, env[key]]));
const definition = {
  pm_exec_path: env.pm_exec_path,
  pm_cwd: env.pm_cwd,
  exec_interpreter: env.exec_interpreter,
  args: env.args,
  runtime,
};
process.stdout.write(crypto.createHash('sha256')
  .update(JSON.stringify(definition)).digest('hex'));
NODE
}

wait_for_status() {
  local url="$1"
  local expected="$2"
  local code="000"
  local attempt

  for attempt in $(seq 1 30); do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$url" 2>/dev/null || true)"
    if [[ "$code" == "$expected" ]]; then
      return 0
    fi
    sleep 2
  done
  fail "$url returned ${code:-000}, expected $expected"
}

verify_pm2_release() {
  local service="$1"
  local release="$2"
  local port="$3"
  local pid cwd

  pid="$(pm2 pid "$service")"
  if [[ ! "$pid" =~ ^[1-9][0-9]*$ ]]; then
    fail "$service has no live PID"
    return 1
  fi
  cwd="$(readlink -f "/proc/$pid/cwd")"
  if [[ "$cwd" != "$release" ]]; then
    fail "$service cwd is $cwd, expected $release"
    return 1
  fi

  if ! ss -H -ltnp | awk -v expected_port="$port" -v expected_pid="$pid" '
    $4 ~ (":" expected_port "$") && $0 ~ ("pid=" expected_pid ",") { found = 1 }
    END { exit found ? 0 : 1 }
  '; then
    fail "$service PID $pid does not own the expected listener on port $port"
    return 1
  fi
}

verify_admin_runtime_identity() {
  local pid uid_set gid_set
  pid="$(pm2 pid "$ADMIN_SERVICE")"
  [[ "$pid" =~ ^[1-9][0-9]*$ ]] \
    || { fail "$ADMIN_SERVICE has no live PID"; return 1; }
  uid_set="$(awk '/^Uid:/ { print $2 ":" $3 ":" $4 ":" $5 }' "/proc/$pid/status")"
  gid_set="$(awk '/^Gid:/ { print $2 ":" $3 ":" $4 ":" $5 }' "/proc/$pid/status")"
  [[ "$uid_set" == "0:0:0:0" && "$gid_set" == "0:0:0:0" ]] \
    || fail "$ADMIN_SERVICE must run with the pinned root runtime identity"
}

shared_tree_fingerprint() {
  local path="$1"
  if [[ -f "$path" ]]; then
    sha256sum "$path" | awk '{print $1}'
    return
  fi

  if [[ ! -d "$path" ]]; then
    fail "shared path is missing: $path"
    return 1
  fi
  (
    cd "$path"
    while IFS= read -r -d '' relative; do
      printf '%s\0' "$relative"
      sha256sum -- "$relative"
    done < <(find . -type f -print0 | LC_ALL=C sort -z)
  ) | sha256sum | awk '{print $1}'
}

log_state() {
  local service="$1"
  node - "$service" <<'NODE'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const service = process.argv[2];
const list = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' }));
const item = list.find((candidate) => candidate.name === service);
if (!item) throw new Error(`Missing PM2 service: ${service}`);
const paths = [item.pm2_env.pm_out_log_path, item.pm2_env.pm_err_log_path];
for (const value of paths) {
  if (!value || value.includes('\t') || value.includes('\n')) throw new Error('Unsafe PM2 log path');
}
const size = (value) => {
  try { return fs.statSync(value).size; } catch { return 0; }
};
process.stdout.write(`${paths[0]}\t${size(paths[0])}\t${paths[1]}\t${size(paths[1])}\n`);
NODE
}

check_fresh_logs() {
  local service="$1"
  local out_path="$2"
  local out_size="$3"
  local err_path="$4"
  local err_size="$5"
  local path offset

  for path in "$out_path" "$err_path"; do
    if [[ "$path" == "$out_path" ]]; then
      offset="$out_size"
    else
      offset="$err_size"
    fi
    [[ -f "$path" ]] || continue
    if tail -c "+$((offset + 1))" "$path" \
      | grep -Eqi 'EADDRINUSE|Cannot find module|MODULE_NOT_FOUND|uncaught exception|unhandled rejection|FATAL ERROR|heap out of memory'; then
      fail "$service emitted a fatal startup signature in fresh logs"
    fi
  done
}

verify_admin() {
  verify_admin_auth_state
  verify_admin_runtime_identity
  wait_for_status "http://127.0.0.1:$ADMIN_PORT/api/health" 200
  wait_for_status "$ADMIN_PUBLIC_ORIGIN/api/health" 200

  curl -fsS --max-time 10 "http://127.0.0.1:$ADMIN_PORT/api/health" \
    | node -e 'let s=""; process.stdin.on("data",c=>s+=c).on("end",()=>{const j=JSON.parse(s); if(j.status!=="ok"||j.service!=="storefront-admin-panel") process.exit(1)})'

  local headers status location
  headers="$(mktemp /tmp/asiandeligo-admin-headers.XXXXXXXX)"
  status="$(curl -sS -D "$headers" -o /dev/null -w '%{http_code}' --max-time 10 "$ADMIN_PUBLIC_ORIGIN/login")"
  [[ "$status" == "200" ]] || { rm -f -- "$headers"; fail "admin login page returned $status"; }
  grep -Eqi '^cache-control:.*no-store' "$headers" \
    || { rm -f -- "$headers"; fail "admin login is missing no-store"; }
  rm -f -- "$headers"

  headers="$(mktemp /tmp/asiandeligo-admin-headers.XXXXXXXX)"
  status="$(curl -sS -D "$headers" -o /dev/null -w '%{http_code}' --max-time 10 "$ADMIN_PUBLIC_ORIGIN/admin")"
  [[ "$status" == "307" ]] || { rm -f -- "$headers"; fail "unauthenticated /admin returned $status"; }
  location="$(awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$headers")"
  rm -f -- "$headers"
  [[ "$location" == "/login?from=%2Fadmin" || "$location" == "$ADMIN_PUBLIC_ORIGIN/login?from=%2Fadmin" ]] \
    || fail "admin redirect target is unexpected"

  status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$ADMIN_PUBLIC_ORIGIN/api/config/asiandeligo?draft=true")"
  [[ "$status" == "401" ]] || fail "unauthenticated admin draft endpoint returned $status"

  curl -fsS --max-time 10 "$ADMIN_PUBLIC_ORIGIN/api/config/asiandeligo" \
    | node -e 'let s=""; process.stdin.on("data",c=>s+=c).on("end",()=>{const j=JSON.parse(s); if(!j||typeof j!=="object") process.exit(1)})'

  verify_pm2_release "$ADMIN_SERVICE" "$ADMIN_RELEASE" "$ADMIN_PORT"
  [[ "$(<"$ADMIN_RELEASE/.next/BUILD_ID")" == "$ADMIN_BUILD_ID" ]] \
    || fail "admin BUILD_ID drifted after activation"
}

verify_storefront() {
  local path status session_body
  for path in / /login /register /products /categories; do
    wait_for_status "http://127.0.0.1:$STORE_PORT$path" 200
    wait_for_status "$STORE_PUBLIC_ORIGIN$path" 200
  done

  session_body="$(mktemp /tmp/asiandeligo-store-session.XXXXXXXX)"
  status="$(curl -sS -o "$session_body" -w '%{http_code}' --max-time 10 "$STORE_PUBLIC_ORIGIN/api/auth/session" || true)"
  if [[ "$status" != "200" ]]; then
    rm -f -- "$session_body"
    fail "guest customer session endpoint returned $status"
    return 1
  fi
  if ! node - "$session_body" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (payload.authenticated !== false || payload.customer !== null ||
    payload.code !== 'NO_SESSION_COOKIE') {
  throw new Error('Guest customer session payload is invalid');
}
NODE
  then
    rm -f -- "$session_body"
    fail "guest customer session payload is invalid"
    return 1
  fi
  rm -f -- "$session_body"

  local headers
  headers="$(mktemp /tmp/asiandeligo-store-headers.XXXXXXXX)"
  curl -sS -D "$headers" -o /dev/null --max-time 10 "$STORE_PUBLIC_ORIGIN/"
  grep -Eqi '^content-security-policy:.*default-src' "$headers" \
    || { rm -f -- "$headers"; fail "storefront CSP header is missing"; }
  grep -Eqi '^strict-transport-security:' "$headers" \
    || { rm -f -- "$headers"; fail "storefront HSTS header is missing"; }
  grep -Eqi '^x-content-type-options:[[:space:]]*nosniff' "$headers" \
    || { rm -f -- "$headers"; fail "storefront nosniff header is missing"; }
  if grep -Eqi '^x-powered-by:' "$headers"; then
    rm -f -- "$headers"
    fail "storefront still exposes X-Powered-By"
  fi
  rm -f -- "$headers"

  status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 \
    "http://127.0.0.1:$STORE_PORT/_next/static/$STORE_BUILD_ID/_ssgManifest.js")"
  [[ "$status" == "200" ]] || fail "storefront is not serving the activated BUILD_ID"

  verify_pm2_release "$STORE_SERVICE" "$STORE_RELEASE" "$STORE_PORT"
  [[ "$(<"$STORE_RELEASE/.next/BUILD_ID")" == "$STORE_BUILD_ID" ]] \
    || fail "storefront BUILD_ID drifted after activation"
}

rollback_transaction() {
  local rollback_failed=""
  set +e
  printf 'Automatic rollback started.\n' >&2

  if [[ -n "$STORE_SWAPPED" ]]; then
    if atomic_link "$STORE_BASE" current "$OLD_STORE"; then
      restart_service "$STORE_SERVICE" "$STORE_ENV" || rollback_failed=1
    else
      rollback_failed=1
    fi
  fi
  if [[ -n "$ADMIN_SWAPPED" ]]; then
    if atomic_link "$ADMIN_BASE" current "$OLD_ADMIN"; then
      restart_service "$ADMIN_SERVICE" "$ADMIN_ENV" || rollback_failed=1
    else
      rollback_failed=1
    fi
  fi

  restore_previous_link "$STORE_BASE" "$OLD_STORE_PREVIOUS" "$STORE_PREVIOUS_PRESENT" \
    || rollback_failed=1
  restore_previous_link "$ADMIN_BASE" "$OLD_ADMIN_PREVIOUS" "$ADMIN_PREVIOUS_PRESENT" \
    || rollback_failed=1

  verify_env_file "$ADMIN_ENV" "$EXPECTED_ADMIN_ENV_OWNER" || rollback_failed=1
  verify_env_file "$STORE_ENV" "$EXPECTED_STORE_ENV_OWNER" || rollback_failed=1
  wait_for_status "http://127.0.0.1:$ADMIN_PORT/api/health" 200 || rollback_failed=1
  wait_for_status "http://127.0.0.1:$STORE_PORT/" 200 || rollback_failed=1
  [[ "$(readlink -f "$ADMIN_BASE/current")" == "$OLD_ADMIN" ]] || rollback_failed=1
  [[ "$(readlink -f "$STORE_BASE/current")" == "$OLD_STORE" ]] || rollback_failed=1
  verify_pm2_release "$ADMIN_SERVICE" "$OLD_ADMIN" "$ADMIN_PORT" || rollback_failed=1
  verify_pm2_release "$STORE_SERVICE" "$OLD_STORE" "$STORE_PORT" || rollback_failed=1
  verify_admin_runtime_identity || rollback_failed=1
  verify_pm2_metadata || rollback_failed=1
  [[ "$(pm2_definition_fingerprint "$ADMIN_SERVICE")" == "$ADMIN_PM2_BEFORE" ]] || rollback_failed=1
  [[ "$(pm2_definition_fingerprint "$STORE_SERVICE")" == "$STORE_PM2_BEFORE" ]] || rollback_failed=1

  if [[ -n "$rollback_failed" ]]; then
    printf 'EMERGENCY: automatic rollback health verification failed.\n' >&2
  else
    printf 'Automatic rollback restored both previous releases.\n' >&2
  fi
  set -e
}

on_exit() {
  local rc=$?
  if [[ "$rc" -ne 0 && -z "$COMMITTED" && ( -n "$ADMIN_SWAPPED" || -n "$STORE_SWAPPED" ) ]]; then
    rollback_transaction
  fi
  if [[ -n "$ADMIN_AUTH_DEPLOY_LOCK_HELD" ]]; then
    if ! release_admin_auth_deploy_lock; then
      printf 'EMERGENCY: could not release the admin auth-state deployment lock.\n' >&2
      rc=1
    fi
  fi
  rmdir /tmp/asiandeligo-release.lock.d /tmp/enail-fe-deploy.lock.d /tmp/enail-be-deploy.lock.d 2>/dev/null || true
  trap - EXIT
  exit "$rc"
}
trap on_exit EXIT
trap 'exit 130' HUP INT TERM

for lock_path in /tmp/enail-be-deploy.lock.d /tmp/enail-fe-deploy.lock.d /tmp/asiandeligo-release.lock.d; do
  [[ -d "$lock_path" ]] || fail "required coordinator lock is absent: $lock_path"
done

[[ "$ADMIN_RELEASE_ID" =~ ^admin-[0-9a-f]{12}-[0-9]{8}T[0-9]{6}Z$ ]] \
  || fail "admin release id is invalid"
[[ "$STORE_RELEASE_ID" =~ ^storefront-[0-9a-f]{12}-[0-9]{8}T[0-9]{6}Z$ ]] \
  || fail "storefront release id is invalid"
[[ "$ADMIN_BUILD_ID" =~ ^[A-Za-z0-9_-]{1,128}$ ]] \
  || fail "admin BUILD_ID is invalid"
[[ "$STORE_BUILD_ID" =~ ^[A-Za-z0-9_-]{1,128}$ ]] \
  || fail "storefront BUILD_ID is invalid"
[[ "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40}$ ]] \
  || fail "expected source commit is invalid"
[[ "$EXPECTED_ADMIN_ENV_OWNER" =~ ^[0-9]+:[0-9]+$ ]] \
  || fail "expected admin env owner fingerprint is invalid"
[[ "$EXPECTED_STORE_ENV_OWNER" =~ ^[0-9]+:[0-9]+$ ]] \
  || fail "expected storefront env owner fingerprint is invalid"
verify_env_file "$ADMIN_ENV" "$EXPECTED_ADMIN_ENV_OWNER"
verify_env_file "$STORE_ENV" "$EXPECTED_STORE_ENV_OWNER"
[[ "$EXPECTED_ADMIN_ENV_SHA256" =~ ^[0-9a-f]{64}$ ]] \
  || fail "expected admin env fingerprint is invalid"
[[ "$EXPECTED_STORE_ENV_SHA256" =~ ^[0-9a-f]{64}$ ]] \
  || fail "expected storefront env fingerprint is invalid"
[[ "$(sha256sum "$ADMIN_ENV" | awk '{print $1}')" == "$EXPECTED_ADMIN_ENV_SHA256" ]] \
  || fail "admin runtime env changed before activation"
[[ "$(sha256sum "$STORE_ENV" | awk '{print $1}')" == "$EXPECTED_STORE_ENV_SHA256" ]] \
  || fail "storefront runtime env changed before activation"
verify_admin_auth_state

for release in "$ADMIN_RELEASE" "$STORE_RELEASE"; do
  [[ -d "$release" && -f "$release/server.js" && -f "$release/RELEASE_MANIFEST.txt" ]] \
    || fail "staged release is incomplete: $release"
  grep -qx "source_commit=$EXPECTED_COMMIT" "$release/RELEASE_MANIFEST.txt" \
    || fail "staged release provenance mismatch: $release"
done
[[ "$(<"$ADMIN_RELEASE/.next/BUILD_ID")" == "$ADMIN_BUILD_ID" ]] \
  || fail "staged admin BUILD_ID mismatch"
[[ "$(<"$STORE_RELEASE/.next/BUILD_ID")" == "$STORE_BUILD_ID" ]] \
  || fail "staged storefront BUILD_ID mismatch"

OLD_ADMIN="$(readlink -f "$ADMIN_BASE/current")"
OLD_STORE="$(readlink -f "$STORE_BASE/current")"
[[ "$OLD_ADMIN" == "$ADMIN_BASE/releases/"* && -d "$OLD_ADMIN" ]] \
  || fail "admin rollback pointer is invalid"
[[ "$OLD_STORE" == "$STORE_BASE/releases/"* && -d "$OLD_STORE" ]] \
  || fail "storefront rollback pointer is invalid"

if [[ -e "$ADMIN_BASE/previous" || -L "$ADMIN_BASE/previous" ]]; then
  [[ -L "$ADMIN_BASE/previous" ]] || fail "admin previous pointer is not a symlink"
  OLD_ADMIN_PREVIOUS="$(readlink -f "$ADMIN_BASE/previous")"
  [[ "$OLD_ADMIN_PREVIOUS" == "$ADMIN_BASE/releases/"* && -d "$OLD_ADMIN_PREVIOUS" ]] \
    || fail "admin previous pointer is invalid"
  ADMIN_PREVIOUS_PRESENT=1
fi
if [[ -e "$STORE_BASE/previous" || -L "$STORE_BASE/previous" ]]; then
  [[ -L "$STORE_BASE/previous" ]] || fail "storefront previous pointer is not a symlink"
  OLD_STORE_PREVIOUS="$(readlink -f "$STORE_BASE/previous")"
  [[ "$OLD_STORE_PREVIOUS" == "$STORE_BASE/releases/"* && -d "$OLD_STORE_PREVIOUS" ]] \
    || fail "storefront previous pointer is invalid"
  STORE_PREVIOUS_PRESENT=1
fi

verify_pm2_metadata
verify_pm2_release "$ADMIN_SERVICE" "$OLD_ADMIN" "$ADMIN_PORT"
verify_pm2_release "$STORE_SERVICE" "$OLD_STORE" "$STORE_PORT"
verify_admin_runtime_identity
acquire_admin_auth_deploy_lock

ADMIN_ENV_BEFORE="$(shared_tree_fingerprint "$ADMIN_ENV")"
STORE_ENV_BEFORE="$(shared_tree_fingerprint "$STORE_ENV")"
ADMIN_AUTH_MARKER_BEFORE="$(shared_tree_fingerprint "$ADMIN_AUTH_MARKER")"
ADMIN_AUTH_BEFORE="$(shared_tree_fingerprint "$ADMIN_AUTH_STATE")"
ADMIN_DATA_BEFORE="$(shared_tree_fingerprint "$ADMIN_BASE/shared/data")"
ADMIN_UPLOADS_BEFORE="$(shared_tree_fingerprint "$ADMIN_BASE/shared/public/uploads")"
ADMIN_PM2_BEFORE="$(pm2_definition_fingerprint "$ADMIN_SERVICE")"
STORE_PM2_BEFORE="$(pm2_definition_fingerprint "$STORE_SERVICE")"

IFS=$'\t' read -r ADMIN_OUT ADMIN_OUT_SIZE ADMIN_ERR ADMIN_ERR_SIZE < <(log_state "$ADMIN_SERVICE")
IFS=$'\t' read -r STORE_OUT STORE_OUT_SIZE STORE_ERR STORE_ERR_SIZE < <(log_state "$STORE_SERVICE")

printf 'Activating admin release %s\n' "$ADMIN_RELEASE_ID"
ADMIN_SWAPPED=1
atomic_link "$ADMIN_BASE" current "$ADMIN_RELEASE"
restart_service "$ADMIN_SERVICE" "$ADMIN_ENV"
verify_admin

printf 'Activating storefront release %s\n' "$STORE_RELEASE_ID"
STORE_SWAPPED=1
atomic_link "$STORE_BASE" current "$STORE_RELEASE"
restart_service "$STORE_SERVICE" "$STORE_ENV"
verify_storefront

check_fresh_logs "$ADMIN_SERVICE" "$ADMIN_OUT" "$ADMIN_OUT_SIZE" "$ADMIN_ERR" "$ADMIN_ERR_SIZE"
check_fresh_logs "$STORE_SERVICE" "$STORE_OUT" "$STORE_OUT_SIZE" "$STORE_ERR" "$STORE_ERR_SIZE"
verify_pm2_metadata
verify_admin_runtime_identity
[[ "$(pm2_definition_fingerprint "$ADMIN_SERVICE")" == "$ADMIN_PM2_BEFORE" ]] \
  || fail "admin PM2 definition changed during release"
[[ "$(pm2_definition_fingerprint "$STORE_SERVICE")" == "$STORE_PM2_BEFORE" ]] \
  || fail "storefront PM2 definition changed during release"

verify_env_file "$ADMIN_ENV" "$EXPECTED_ADMIN_ENV_OWNER"
verify_env_file "$STORE_ENV" "$EXPECTED_STORE_ENV_OWNER"
verify_admin_auth_state
[[ "$(shared_tree_fingerprint "$ADMIN_ENV")" == "$ADMIN_ENV_BEFORE" ]] \
  || fail "admin runtime env changed during release"
[[ "$(shared_tree_fingerprint "$STORE_ENV")" == "$STORE_ENV_BEFORE" ]] \
  || fail "storefront runtime env changed during release"
[[ "$(shared_tree_fingerprint "$ADMIN_AUTH_MARKER")" == "$ADMIN_AUTH_MARKER_BEFORE" ]] \
  || fail "admin auth-state migration marker changed during release"
[[ "$(shared_tree_fingerprint "$ADMIN_AUTH_STATE")" == "$ADMIN_AUTH_BEFORE" ]] \
  || fail "admin auth state changed during release; code rollback will not overwrite it"
[[ "$(sha256sum "$ADMIN_ENV" | awk '{print $1}')" == "$EXPECTED_ADMIN_ENV_SHA256" ]] \
  || fail "admin runtime env fingerprint changed during release"
[[ "$(sha256sum "$STORE_ENV" | awk '{print $1}')" == "$EXPECTED_STORE_ENV_SHA256" ]] \
  || fail "storefront runtime env fingerprint changed during release"
[[ "$(shared_tree_fingerprint "$ADMIN_BASE/shared/data")" == "$ADMIN_DATA_BEFORE" ]] \
  || fail "admin data changed during release; code rollback will not overwrite it"
[[ "$(shared_tree_fingerprint "$ADMIN_BASE/shared/public/uploads")" == "$ADMIN_UPLOADS_BEFORE" ]] \
  || fail "admin uploads changed during release; code rollback will not overwrite them"

atomic_link "$ADMIN_BASE" previous "$OLD_ADMIN"
atomic_link "$STORE_BASE" previous "$OLD_STORE"
COMMITTED=1
release_admin_auth_deploy_lock

printf 'Remote activation transaction committed.\n'
