# Asia Deli Go guarded production release

`deploy-asiandeligo-contabo.sh` is the only supported deployment lane for the
standalone Asia Deli Go admin panel and storefront. The legacy
`deploy-kenmito-storefront.sh` is intentionally fail-closed.

## Scope

The lane releases these two code artifacts as one transaction:

| Component | Production base | PM2 service | Runtime port |
| --- | --- | --- | ---: |
| Admin | `/var/www/kenmito-admin` | `enail-asiandeligo-admin` | 4100 |
| Storefront | `/var/www/kenmito-storefront` | `enail-grocery-kenmito` | 3022 |

It does not change PostgreSQL, backend source, Nginx, runtime environment
values, storefront admin config/uploads, payment, or shipping configuration.
The first compatible release creates one private
`shared/auth/admin-auth-state.json` file from the already protected runtime
hash; later releases preserve it. A separate root-owned marker under `shared/`
prevents any later missing state from silently resurrecting the bootstrap hash.

## Required approval and order

1. Finish any active Contabo eNail backend/frontend release and verify the
   shared backend is healthy. The lane requires at least 15 minutes of stable
   `enail-backend` uptime. Chesaigon POS uses a separate Windows target, so it
   does not share these files or services.
2. Review the exact commit and this plan.
3. Run `--check-only`. This performs local install/audit/lint/typecheck/tests,
   production-env builds, standalone smoke tests, artifact secret scanning and
   read-only Contabo preflight. It performs no production mutation.
4. Fast-forward the reviewed commit to `origin/main`.
5. Obtain a fresh short owner confirmation, then run the exact commit with
   `--yes`.

Example:

```bash
deploy/deploy-asiandeligo-contabo.sh \
  --commit 0123456789abcdef0123456789abcdef01234567 \
  --check-only

deploy/deploy-asiandeligo-contabo.sh \
  --commit 0123456789abcdef0123456789abcdef01234567 \
  --yes
```

The real run refuses unless local `HEAD`, the requested full SHA, and
`origin/main` are identical and the tree is clean. It also refuses bypass,
remote-build, skipped-test, partial-component and manual-rollback flags.

## Safety model

- Builds happen only in a disposable detached worktree on the Netcup build
  machine. Contabo receives standalone artifacts and never runs `npm install`
  or `next build`.
- Full production env files never leave Contabo. They are parsed and validated
  read-only there; the builder records SHA-256 fingerprints and receives only
  the explicit secret-free public variables needed by Next.js compilation.
  After upload, Contabo scans the extracted artifact against sensitive values
  in the protected runtime env without printing them, and rejects any baked
  password/secret/token value before accepting the release directory.
- Every artifact contains source/tree/build provenance and per-file SHA-256
  checksums. Archive and file hashes are verified again on Contabo before an
  immutable release directory is accepted.
- Local locks and atomic Contabo locks serialize this transaction with the
  guarded eNail backend/frontend lanes. Stale remote locks are never removed
  automatically at startup.
- Admin shared state remains outside releases. Release-local config/media paths
  are linked exactly as follows, while auth state is read directly from its
  fixed absolute runtime path:

  ```text
  .env.local     -> /var/www/kenmito-admin/shared/.env.runtime
  data           -> /var/www/kenmito-admin/shared/data
  auth state     -> /var/www/kenmito-admin/shared/auth/admin-auth-state.json
  auth marker    -> /var/www/kenmito-admin/shared/.admin-auth-state-initialized
  public/uploads -> /var/www/kenmito-admin/shared/public/uploads
  ```

  The one-time auth-state bootstrap runs only after both artifacts are staged
  and the production locks are held. It creates a root-owned `0700` auth
  directory, atomically links the `0600` state file, and writes a separate
  root-owned initialization marker without printing the password hash.
  Preflight and activation also pin the current admin PM2 process to the
  reviewed root UID/GID topology so runtime ownership cannot silently drift
  away from those protected files.
  Production preflight and activation validate the exact schema, owner, mode,
  marker, and absence of a stale write lock. If a later state file or directory
  is missing or corrupt, the marker makes deploy fail closed instead of
  resurrecting `ADMIN_PASSWORD_HASH` from the runtime environment. The previous
  release ignores the new state if activation rolls back before compatible code
  is live. During activation, the coordinator holds the same auth write lock
  used by password changes and logout across both PM2 restarts and automatic
  rollback; those writes fail briefly instead of being killed mid-update.

  Auth write locks fail closed and are never deleted merely because they look
  old. Recovery requires first proving that no application writer, bootstrap,
  or deployment process is still alive, then following a separately reviewed
  server recovery plan.
  Backups must include both the auth directory and the dotfile marker; a plain
  `shared/*` glob is insufficient because it normally omits dotfiles.

- The activator records both old `current` targets, activates admin first and
  storefront second, and restarts only the two existing PM2 services. It never
  uses `--update-env`, `pm2 delete/start`, or `pm2 save`; the reviewed PM2
  execution topology and security-critical runtime-variable fingerprints must
  remain unchanged.
- Admin listens on loopback. The legacy storefront listener remains unchanged
  in this code-only release; the coordinator independently proves ports 3022
  and 4100 are blocked from the Internet, so public access remains HTTPS-only
  through Nginx. A future PM2 topology hardening is a separate reviewed change.
- Public/loopback routes, build identity, PM2 cwd, security headers,
  unauthenticated admin protection, the clean-guest `200` session payload
  (`authenticated: false`, `customer: null`, `NO_SESSION_COOKIE`), fresh startup
  logs and shared-state fingerprints are verified before commit.
- Any failure after the first symlink swap restores both exact old targets,
  restarts both services and verifies baseline health. Routine manual rollback
  is deliberately unsupported; later recovery needs a separately reviewed
  source-aware plan.

## Post-release operator checks

After the script succeeds, independently verify:

- storefront `/`, `/products`, `/categories`, `/login`, and `/register`;
- “Bez glutenu” and “Wegetariańskie” filter behavior on desktop and mobile;
- admin `/api/health`, login, one authenticated read, and one logout;
- admin `/admin/security`; after the owner changes the password, confirm the old
  password and a copied pre-change cookie are rejected;
- production admin login using the vault credential without printing it;
- PM2 status, unchanged definitions, firewall containment and only fresh log
  output;
- backend health remains `200`.

Checkout, payment and delivery remain explicitly out of launch scope until the
owner registers and supplies the corresponding providers.
