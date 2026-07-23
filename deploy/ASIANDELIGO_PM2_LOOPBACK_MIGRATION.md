# Asia Deli Go storefront PM2 loopback migration

One-time, reviewed PM2-definition migration for `enail-grocery-kenmito` on
Contabo. It is deliberately **not** part of any code release
(`deploy-asiandeligo-contabo.sh` never touches PM2 definitions).

## Goal

| | Before (legacy) | After (migrated) |
| --- | --- | --- |
| Listener | `0.0.0.0:3022` | `127.0.0.1:3022` |
| Runtime values | Inline in PM2 metadata and `~/.pm2/dump.pm2` (includes `CUSTOMER_AUTH_BFF_SECRET`) | Only in root-only `shared/.env.runtime`, sourced by a bash wrapper at boot |
| Definition | `node /var/www/kenmito-storefront/current/server.js` | `/bin/bash -lc 'set -a; . <env>; set +a; cd <current> && exec node server.js'` (same shape the admin service already uses on `127.0.0.1:4100`) |

Explicitly unchanged: Nginx vhosts, `current`/`previous` release symlinks,
UFW rules, `shared/.env.runtime` location/ownership/mode (0600 root,
non-symlink), the admin service, and the guarded release lane.

## Audit facts (2026-07-23)

- Live release on both components is `4989e282ae5f-20260723T084837Z`
  (= `origin/main` tip); storefront public 200, admin 307 login redirect.
- Nginx already proxies `asiandeligo.eshoper.pro` → `http://127.0.0.1:3022`
  (4 proxy_pass sites); nothing else consumes the `0.0.0.0` bind: UFW allows
  only 80/443/8080/2222, `curl http://<public-ip>:3022/` fails from outside,
  no `tailscale serve/funnel`, no established peers on :3022 at audit time.
- `/var/www/kenmito-storefront/shared/.env.runtime` already exists (0600
  root) and matches the live PM2 runtime **key-for-key and value-for-value**
  on all 14 app keys (verified by value comparison without printing them).
  The only value that must change is `HOSTNAME=0.0.0.0` → `127.0.0.1`.
- Both `deploy-asiandeligo-contabo.sh` (preflight) and
  `activate-asiandeligo-release.sh` (`verify_pm2_metadata`) previously
  hard-required the legacy shape. This branch makes both accept the legacy
  **or** the migrated shape, and for the migrated shape they additionally
  require an empty runtime keyset in PM2 metadata and a loopback dotenv.

## Order (must hold)

1. Land this branch on `origin/main` **before** the host migration. After the
   host migration, only build releases from a `main` that contains this
   commit — a release built from an older commit fails its own PM2 preflight
   by design.
2. Run the host migration below only after a short owner confirmation.
3. The next guarded release afterwards re-verifies the migrated shape
   end-to-end.

## Host migration (single root SSH session on Contabo)

### Preflight (read-only)

```bash
STORE=/var/www/kenmito-storefront
TS=$(date -u +%Y%m%dT%H%M%SZ)
pm2 describe enail-grocery-kenmito >/dev/null || exit 1
readlink "$STORE/current"                                  # expect newest release
ss -tlnp | grep ':3022 '                                   # expect 0.0.0.0:3022 (legacy)
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3022/          # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://asiandeligo.eshoper.pro/ # 200
stat -c '%a %U' "$STORE/shared/.env.runtime"               # 600 root, not a symlink
grep -c '^HOSTNAME=' "$STORE/shared/.env.runtime"          # 1
```

Re-run the key/value parity check between the dotenv and live PM2 env (same
node comparison used in the audit; statuses only, never values). Abort on any
`DIFFERS`/`MISSING`.

### Backups

```bash
install -m 600 /root/.pm2/dump.pm2 /root/.pm2/dump.pm2.pre-loopback-$TS
pm2 jlist > /root/.pm2/jlist.pre-loopback-$TS.json && chmod 600 /root/.pm2/jlist.pre-loopback-$TS.json
install -m 600 "$STORE/shared/.env.runtime" "$STORE/shared/.env.runtime.pre-loopback-$TS"
```

### Execute (~5–10 s listener gap)

```bash
sed -i 's/^HOSTNAME=0\.0\.0\.0$/HOSTNAME=127.0.0.1/' "$STORE/shared/.env.runtime"
grep -n '^HOSTNAME=' "$STORE/shared/.env.runtime"          # must be exactly 127.0.0.1
pm2 delete enail-grocery-kenmito
pm2 start /bin/bash --name enail-grocery-kenmito -- -lc \
  "set -a; . $STORE/shared/.env.runtime; set +a; cd $STORE/current && exec node server.js"
```

### Verify (all must pass before `pm2 save`)

```bash
sleep 5
ss -tlnp | grep ':3022 '                                   # now 127.0.0.1:3022
for i in $(seq 1 12); do curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3022/ && break; sleep 5; done  # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://asiandeligo.eshoper.pro/  # 200 via nginx
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4100/api/health  # admin untouched, 200
pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const s=JSON.parse(d).find(p=>p.name==="enail-grocery-kenmito").pm2_env;const bad=Object.keys(s).filter(k=>k==="CUSTOMER_AUTH_BFF_SECRET"||/^NEXT_PUBLIC_|^CUSTOMER_/.test(k));console.log(bad.length?"LEAK:"+bad:"metadata-clean", s.pm_exec_path)})'
pm2 save
grep -c CUSTOMER_AUTH_BFF_SECRET /root/.pm2/dump.pm2       # 0
```

Then watch `pm2 describe enail-grocery-kenmito` restart counter for ~2
minutes (no crash loop) and confirm the external probe
`curl http://<public-ip>:3022/` still fails.

### Rollback (any verify step fails)

```bash
pm2 delete enail-grocery-kenmito || true
install -m 600 "$STORE/shared/.env.runtime.pre-loopback-$TS" "$STORE/shared/.env.runtime"
install -m 600 /root/.pm2/dump.pm2.pre-loopback-$TS /root/.pm2/dump.pm2
pm2 resurrect                                              # restores the legacy inline-env definition
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3022/           # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://asiandeligo.eshoper.pro/ # 200
```

`pm2 resurrect` recreates every process from the restored dump; already
running services are left as-is. Do **not** `pm2 save` after a rollback until
the legacy storefront is verified healthy.

## After the migration

- `pm2 restart enail-grocery-kenmito` now re-sources `shared/.env.runtime`
  on every boot, so future env-value rotations need only a file edit plus the
  release lane's normal restart. `--update-env`, `delete/start`, and
  `pm2 save` remain forbidden inside the release lane.
- Remove the "storefront PM2 topology is legacy" row from
  `.claude/docs/progress.md` Known Issues and note the completion date.
