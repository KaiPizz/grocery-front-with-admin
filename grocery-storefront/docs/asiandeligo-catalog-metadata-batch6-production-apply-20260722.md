# Asia Deli Go catalog metadata batch 6 production apply — 2026-07-22

## Authorization and artifact identity

- Owner authorization: `ok tiếp` in the active catalog-cleanup conversation.
- Source commit on `origin/main`:
  `5072709d17285e74c83cc6f1879780c4a3fdc652`.
- Batch: `asiandeligo-catalog-metadata-batch6-20260722-v1`.
- Decision SHA-256:
  `19d2a71766d82e9ac4089b60472959412bd49b772820b75521260ae112e7844f`.
- Apply SQL SHA-256:
  `30478f7f7255407332e509a88548e7a31f1758d0f797e47bbe55545b81883168`.
- Rollback SQL SHA-256:
  `022ac160ccd151abc79fb5873b7b230214fb5b463e39ff680ab5c8c5bcffe736`.

The generic SQL-write helper was not used because this was a reviewed
multi-statement transaction with persistent backup/audit DDL, exact timestamp
guards, and a separately rehearsed stale-safe rollback. Production received
the exact committed apply SQL through `psql` stdin. No source transfer,
package operation, application build, or service restart ran on Contabo.

## Final preflight

Immediately before execution:

- clean `HEAD` and fetched `origin/main` both pointed to `5072709`;
- regeneration from a fresh production snapshot produced a clean Git diff;
- decision/apply/rollback hashes matched the committed artifacts;
- all 14 transition snapshots and status identities matched exactly;
- all 14 target variants remained active, for sale, synced, `IN_STOCK`, and
  at stock `100`;
- exactly one active pinned `asiandeligo` channel existed;
- both declared join foreign keys existed and the monotonic product timestamp
  trigger was in ordinary mode (`tgenabled=O`);
- both dated batch-6 backup/audit relations were absent.

## Execution

- Committed at approximately `2026-07-22 12:28:41 UTC`.
- PostgreSQL transaction ID: `7051420`.
- Result: `COMMIT` with exactly 14 persistent product backups and 14 exact
  product updates.
- Exactly the approved 14 `products` rows were changed; zero
  `product_variants` and zero `categories` rows were written.

## Exact applied scope

- Reviewed: 25 exact SKUs, deterministic priority-cohort ranks 126–150.
- Applied: 14 products / 15 metadata field transitions.
- Field counts: 13 storage zones, one country of origin, and one allergen
  array.
- Held without mutation: `ADG-000485`, `ADG-000658`, `ADG-000759`,
  `ADG-000804`, `ADG-000805`, `ADG-000806`, `ADG-000807`, `ADG-000854`,
  `ADG-000389`, `ADG-000876`, and `ADG-000914`.
- Trace-allergen declarations, nutrition, ingredients, price, unit price,
  category, name, slug, publication state, stock, variants, and category rows
  were unchanged.

Evidence review retained only exact-product, high-confidence values. It held
conflicting coffee, crab, onigiri, and other label generations rather than
mixing nutrition or allergen declarations across packs. After removing one
stale 404, all 14 transitions retained at least two substantively independent
sources.

## ADG-000556 safety follow-up outside this transaction

The applied `AMBIENT` storage value is independently correct. However, the
mapped single-tin GTIN `6922163616734` does not prove the storefront's `80g x2`
sale unit and appears in historical recall RASFF `2022.4578` for lot
`2022059217`, DDM `25/11/2024`, due to excessive PAHs. Poland was among the
distribution countries.

The expired lot-specific notice does not establish that later same-GTIN stock
is recalled. No sale/availability state changed in this metadata batch. Before
fulfilment, staff must photograph EAN, lot, and DDM on both tins, temporarily
hold fulfilment until checked, and quarantine only recalled or expired stock.
See
`docs/asiandeligo-catalog-metadata-batch6-adg-000556-safety-followup-20260722.md`.

## Post-apply verification

- Backup contains exactly 14 distinct tenant/channel/SHA-scoped rows, 14
  linked timestamps, and 15 declared field changes.
- Audit contains one `backup_captured` and one `apply_complete` event, both in
  transaction `7051420`; there is no rollback event.
- Exact targets matched 13/13 storage values, 1/1 country, and 1/1 allergen
  array.
- Database identity, category, price/unit, unchanged-field, status, stock, and
  timestamp-link invariants matched 14/14; none of the 11 hold SKUs appears in
  backup.
- Direct storefront GraphQL and the public GraphQL proxy each returned all
  1,779 products and exact target metadata/category/stock for 14/14 applied
  products. Their normalized full-audit payloads matched.
- All 25 cohort PDPs plus storefront, health, login, and mail-inbox routes
  returned HTTP 200 (29/29).
- All 18 PM2 processes remained online. No process was restarted.

## Catalog impact and next cohort

A fresh read-only audit of all 1,779 published products and 70 categories
found:

- missing storage zone reduced from 508 to 495;
- missing nutrition panel remained 307;
- missing country of origin reduced from 74 to 73;
- missing positive allergen declaration reduced from 781 to 780;
- missing ingredients remained 184;
- 1,762 variants remain at placeholder stock `100`.

Catalog cleanup is not complete. The next deterministic metadata unit is
priority-cohort ranks 151–175. Placeholder stock and the ADG-000556 physical
lot check remain separate operational workflows.

## Recovery state

Persistent backup and audit tables are intentionally retained:

- `asiandeligo_catalog_metadata_batch6_product_backup_20260722`
- `asiandeligo_catalog_metadata_batch6_audit_20260722`

The committed rollback passed happy-path, duplicate, stale-row,
intervening-edit, and tampered-backup rehearsals but was not executed on
production. Any future rollback is a separate owner-approved operation and
refuses changed product or backup state.
