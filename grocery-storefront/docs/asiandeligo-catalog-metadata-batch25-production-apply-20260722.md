# Asia Deli Go catalog metadata batch 25 production apply — 2026-07-22

## Authorization and artifact identity

- Owner approval: explicit confirmation to proceed in the active conversation.
- Source commit on `origin/main`: `c335ab85bbcf76a1793559339a7ba148531c9553`.
- Batch: `asiandeligo-catalog-metadata-batch25-20260722-v1`.
- Decision SHA-256: `0aff66c79c10e96e5ca614fa4b5a250ae4f236d784bea557a3d72fe9836d4e9c`.
- Apply SQL SHA-256: `e9a24ebba9661e0e4b79138a92991f5df8525cd8b5c20105143db78bdb586430`.
- Rollback SQL SHA-256: `8a9987891d2b2716cfca81fa4a3d729ddfd9942c15f52be5db804faffa15b84c`.

The generic SQL-write helper was not used because this reviewed operation is
a multi-statement transaction with persistent backup/audit DDL and exact
rollback guards. Production received the byte-identical committed apply SQL
through `psql` stdin. No source transfer, package operation, application build,
or service restart ran on Contabo.

## Final preflight

Immediately before execution at `2026-07-22 08:09 UTC`:

- clean worktree `HEAD` equaled fetched `origin/main` at `c335ab8`;
- the committed and local apply artifacts had the same SHA-256;
- the 23 tracked product rows had old-state signature
  `f279aa4f0adeaa4838531430f8071d4b`;
- all 23 exact `updated_at` guards matched the reviewed decision JSON;
- the eight referenced category rows had signature
  `2809958e06daa80a9fbffb4a511a49f5`;
- exactly one active pinned `asiandeligo` channel, one enabled monotonic product
  timestamp trigger, and both relevant declared foreign keys existed;
- the dated backup and audit tables did not exist;
- all 23 PDPs, the storefront homepage, both health endpoints, login, and mail
  inbox returned HTTP 200.

## Execution

- Committed at approximately `2026-07-22 08:09:38 UTC`.
- PostgreSQL transaction ID: `7046613`.
- Result: `COMMIT` with exactly 23 persistent backups and 23 exact product
  updates.
- Only the approved 23 `products` rows have transaction ID `7046613` among the
  guarded business tables. No `product_variants` or `categories` rows were
  written.

## Exact applied scope

- Reviewed: 25 exact SKUs.
- Applied: 23 products / 28 field transitions.
- Held without mutation: `ADG-000219` and `ADG-000119`.
- Field counts: 21 storage zones, three allergen declarations, two may-contain
  declarations, one nutrition panel, and one ingredients correction.
- All 21 storage transitions were to `AMBIENT`.
- Price, unit price, category, name, slug, publication state, stock, variants,
  and category rows were unchanged.
- All 23 guarded variant quantities remained exactly `100`.

## Post-apply verification

- Backup table contains exactly 23 rows for the correct tenant, channel, batch,
  and decision SHA; every applied timestamp is greater than its original.
- Audit contains `backup_captured:23` and `apply_complete:23` under the single
  production transaction, with zero rollback rows.
- Database values match all 28 approved transitions; price, unit, and category
  invariants match for 23/23 products.
- Direct storefront GraphQL and the public GraphQL proxy both returned exact
  target metadata and unchanged price, unit, category, and stock for 23/23
  products.
- All 23 exact PDP URLs returned HTTP 200.
- `https://enail.pro/vi/login`, `https://enail.pro/app/mail-inbox`, both health
  endpoints, and the Asia Deli Go homepage returned HTTP 200.
- All PM2 processes remained online. Post-apply grocery logs were empty; the
  backend error log had no new entry, and current backend output contained zero
  error/fatal/exception/unhandled signatures.
- The final tracked product signature is
  `0e543ff40ae5858890217e24c8bbc10c`.

## Catalog impact and next cohort

A fresh read-only audit inspected all 1,779 published products and 70
categories. Compared with the pre-cleanup audit from 2026-07-21, the global
queue now has 22 fewer missing storage zones, four fewer missing allergen
declarations, and two fewer missing nutrition panels. Those totals include the
preceding exact-six batch; this batch itself contributed 21, three, and one of
those reductions respectively. The 1,762 placeholder stock values of `100`
were deliberately untouched.

The deterministic 200-product priority cohort was regenerated read-only. Of
this reviewed 25-SKU slice, 18 products left the cohort and seven remain because
they still have unsupported metadata gaps. The remaining seven include both
evidence holds; no unknown allergen or nutrition values were fabricated.

This completes batch 1 of the top-100–200 catalog cleanup, not the entire
catalog-cleanup objective. The next safe unit of work is the next 25-product
source-review and guarded remediation batch.

## Recovery state

The persistent backup and audit tables are intentionally retained. The
committed rollback SQL was successfully rehearsed before production, but it was
not executed. Any later production rollback is a separate owner-approved
operation and refuses to overwrite an intervening product edit or tampered
backup.
