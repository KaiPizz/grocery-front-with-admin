# Kamito / Kenmito Backend Launch Handoff

> Date: 2026-06-06
> Purpose: send this entire file to the backend bot for a tenant-scoped,
> read-only launch audit before any backend change is approved.

## Instructions For The Backend Bot

You are working in a multi-store Zyra backend. This request is only for the
store whose technical channel/tenant key is `kamito`.

Rules:

1. Scope every query, log search, mutation, script, and proposed migration to
   `channel = "kamito"` or the exact internal salon ID that you first prove
   belongs to `kamito`.
2. Do not use data from `chesaigon`, `default`, `my-grocery-store`, or another
   tenant as evidence for Kamito.
3. This first pass is read-only. Do not deploy, migrate, rename, seed, delete,
   or modify production data.
4. Do not rename backend infrastructure from `kamito` to `kenmito`. Only the
   shopper-facing display name has changed.
5. If a proposed fix uses shared code or a global migration, state its impact
   on every tenant, its rollback path, and how tenant isolation is preserved.
6. Do not answer from old documentation alone. Re-run safe live checks and
   label each result with timestamp, environment, query/command, and evidence.
7. If a field or operation is not tenant-scoped, call that out explicitly
   instead of assuming it is safe.

## Tenant Identity

| Field | Current value | Status |
|---|---|---|
| Shopper-facing brand | `Kenmito` | Fixed frontend display name |
| Backend channel / technical tenant | `kamito` | Must remain unchanged |
| Storefront config slug | `kamito` | Must remain unchanged |
| Config filename prefix | `kamito` | Must remain unchanged |
| Current canonical hostname | `https://kamito.enail.pro` | Keep until a separate DNS migration is requested |
| Storefront local app | `grocery-storefront`, port `3008` | Frontend context only |
| Admin local app | `admin-panel`, port `4100` | Frontend config context only |
| Storefront GraphQL upstream | `https://zira-ai.com/graphql/storefront` | Reconfirm production routing |
| Backend health endpoint | `https://zira-ai.com/api/v1/health` | Reconfirm current status |
| Currency | `PLN` | Historical backend confirmation; revalidate |
| Shopper locales | Polish and English | Polish is the primary launch language |

Important distinction:

- `Kenmito` is the visible brand.
- `kamito` is still the backend channel, salon/config slug, file prefix, and
  hostname identifier.
- Infrastructure rename is explicitly out of scope for this request.

## Launch Capability

The target capability is:

> A Polish shopper can browse the real `kamito` catalog, place a guest or
> authenticated pickup order, pay by bank transfer, receive accurate next-step
> instructions, and have store staff reliably see and process the order without
> affecting any other salon.

The storefront is functionally complete enough for this flow. The remaining
launch risk is backend truth and store operations, not another frontend page.

## Current Frontend Contract

The storefront:

- sends browser GraphQL requests through its same-origin `/api/graphql` proxy;
- uses `NEXT_PUBLIC_CHANNEL=kamito`;
- uses `NEXT_PUBLIC_SALON_SLUG=kamito`;
- currently uses a static published config fallback for Kamito;
- displays broad availability only, not exact stock quantities;
- disables add-to-cart when the backend reports quantity `0`;
- handles `INSUFFICIENT_STOCK` from `checkoutComplete` without losing checkout;
- presents pickup and bank transfer as the only launch promises;
- does not promise automatic email or SMS;
- has disabled Deals and `/outlet` because no trustworthy sale data exists;
- has not enabled card, BLIK, P24, PayU, COD, loyalty, Q&A, or back-in-stock;
- keeps guest checkout available.

Current fulfillment config:

```json
{
  "mode": "pickup",
  "paymentPromise": "bank_transfer",
  "stockDisplayMode": "availability_only",
  "pickupInstructions": null,
  "bankTransferInstructions": null
}
```

Current checkout integration:

1. `checkoutCreateFull`
2. `checkoutLinesAddFull`
3. `checkoutShippingAddressUpdate`
4. `checkoutShippingMethodUpdate`
5. optional `checkoutPromoCodeAdd` / `checkoutPromoCodeRemove`
6. `checkoutPaymentCreate` using the payment method `id` as `gateway`
7. `checkoutComplete`

The frontend currently understands these checkout error codes:

- `INSUFFICIENT_STOCK`
- `INVALID_PROMO_CODE`
- `PAYMENT_GATEWAY_ERROR`

Production GraphQL introspection has historically been disabled. Use supported
queries, backend source, database checks, and logs rather than enabling
introspection for this audit.

## Historical Backend Snapshot To Revalidate

The following was reported on 2026-05-23 and 2026-05-24. Treat it as historical
context, not current proof:

| Area | Historical Kamito result |
|---|---|
| Products | 1,784 storefront-visible products |
| Variants | Imported products were generally single-variant |
| Categories | 72 flat categories; arbitrary order; no Storefront GraphQL `displayOrder` |
| Product language | Product/category content primarily Polish |
| Stock | Most variants had `quantityAvailable: 100` from `seed-kamito-stock.sql`; no live POS/replenishment integration |
| Shipping | Only method `PICKUP`, price `0 PLN` |
| Payment | Only gateway `bank_transfer` |
| Guest checkout | Supported |
| Sale data | `compareAtPrice`, `onSale`, and discount metadata absent or empty |
| Order notification | No Kamito `ORDER_CREATED` subscription was wired |
| Back-in-stock | No usable public mutation |
| Wishlist | One wishlist supported |
| Reviews | Fetch/submit APIs existed |
| Loyalty | APIs existed, but no confirmed Kamito loyalty program |
| Product metadata | Allergens, dietary tags, certifications, unit data often null |
| Product media | Some products contain byte-identical images under different CDN URLs |

## P0 Questions: Required Before Go-Live

Answer every question with current production evidence. If the answer is
unknown, say who owns the decision and what check is required.

### KAM-P0-01: Prove Tenant Identity And Isolation

1. What is the exact internal salon/store UUID for channel `kamito`?
2. Which warehouse, stock location, price list, currency, tax settings, payment
   configuration, shipping configuration, and order queue belong to it?
3. What is its current default language? Old notes raised concern that it may
   still be `vi`; confirm the actual value and whether it should become `pl`.
4. Are any Kamito reads or writes falling back to a default tenant?
5. Provide the safe tenant predicate that future scripts must use.

Required evidence:

- relevant database rows or admin records;
- channel-to-salon and channel-to-warehouse mapping;
- confirmation that no result came from another salon.

### KAM-P0-02: Revalidate Catalog And Category State

1. Current storefront-visible product count for `kamito`.
2. Current active/published variant count.
3. Counts of variants with quantity `0`, `1-3`, `100`, and other values.
4. Current category count and number of root/child categories.
5. Counts of products missing price, image, slug, category, or active variant.
6. Confirm whether all shopper prices are gross PLN.

Compare the live results with the historical values of 1,784 products and 72
flat categories. Explain material differences.

### KAM-P0-03: Establish Inventory Truth

1. Is `quantityAvailable: 100` still placeholder seed stock?
2. Is there any live POS, warehouse, purchase, or replenishment feed for
   Kamito?
3. Which operation is the final authoritative stock check?
4. Does adding to cart reserve stock? If not, when is stock reserved or
   decremented?
5. What happens when two customers buy the last unit?
6. Who can mark a Kamito variant out of stock, and through which UI/API?
7. What operational process prevents orders for unavailable products at launch?
8. If real stock will not be imported before launch, explicitly confirm that
   `availability_only` is the correct frontend policy.

### KAM-P0-04: Revalidate Shipping

1. Return the current Kamito checkout shipping methods after a valid address is
   applied.
2. Confirm the exact ID, name, price, currency, and active state of pickup.
3. Confirm whether pickup requires a shipping address in the checkout payload.
4. Where should pickup address, opening hours, preparation time, and customer
   instructions live: backend, admin config, or both?
5. Is there any backend state meaning "ready for pickup"?

Expected historical result: one active method with ID `PICKUP` and price
`0 PLN`. Do not assume this is still true without a live check.

### KAM-P0-05: Revalidate Payment And Bank Transfer

1. Return `availablePaymentMethods(channel: "kamito")`.
2. Confirm the exact active gateway ID, provider, fee, and currency.
3. Does `checkoutPaymentCreate` with `gateway: "bank_transfer"` create a payment
   record? What initial status does it receive?
4. Where are bank recipient, IBAN/account number, transfer title/reference,
   payment deadline, and customer instructions stored?
5. Are bank-transfer instructions exposed by a storefront API today?
6. How does staff mark payment as received?
7. What statuses and timestamps prove payment confirmation?
8. What is the cancellation/refund process for unpaid, paid, and cancelled
   orders?

Owner will supply the real bank details. Backend must only define where they are
stored, exposed, secured, and audited.

### KAM-P0-06: Prove End-To-End Order Creation

Run a controlled Kamito test in a safe environment, or explain why production
testing is unsafe and provide an equivalent staging proof.

Prove:

1. Guest checkout works for `kamito`.
2. Authenticated checkout works for `kamito`.
3. Pickup and bank transfer can be selected.
4. `checkoutComplete` creates an order linked to the Kamito salon/channel.
5. The resulting order number, salon ID, channel, currency, payment status,
   fulfillment status, lines, total, and customer email are correct.
6. Staff can find the order in the actual operational UI/API.
7. A Kamito order cannot appear in another salon's queue.

Return the test order ID/number, environment, timestamp, and where staff should
open it. Redact customer PII and bank details.

### KAM-P0-07: Define The Order Lifecycle

Provide the actual statuses and allowed transitions for:

```text
created
awaiting bank transfer
paid
preparing
ready for pickup
completed
cancelled
refunded
```

For each transition state:

- whether it exists in backend;
- who or what performs it;
- whether stock changes;
- whether payment changes;
- whether a customer notification is emitted;
- whether the transition is visible in customer order history.

Do not invent status names to match this list. Map the real backend model to
the operational meaning.

### KAM-P0-08: Close The New-Order Notification Gap

1. Does `checkoutComplete` currently emit an order-created domain event for
   Kamito?
2. Is a Kamito `ORDER_CREATED` webhook/subscription configured?
3. If configured, provide destination type, enabled state, retry policy,
   failure logging, secret handling, and last successful delivery evidence.
4. If not configured, propose the smallest tenant-scoped solution for launch.
5. Which staff member/system receives the alert, through what channel, and
   within what SLA?
6. How are missed or failed notifications detected?

If launch must use manual monitoring, document:

- exact order screen/API;
- responsible operator;
- polling interval during opening hours;
- escalation path;
- reconciliation procedure for missed orders.

"Staff will check sometimes" is not an acceptable production process.

### KAM-P0-09: Production Operations

1. Confirm current public health and Storefront GraphQL routing.
2. Identify logs for Kamito checkout/payment/order failures.
3. Identify alerts for backend downtime, elevated GraphQL errors, and failed
   order notifications.
4. State backup scope and retention for products, inventory, customers, carts,
   checkouts, payments, and orders.
5. State restore procedure and last restore-test date.
6. State rollback procedure for a Kamito-specific config or code deployment.
7. Confirm current rate limits relevant to login, register, password reset,
   cart, and checkout.
8. Confirm that production probes will not trigger the previous fail2ban issue
   caused by repeated malformed GraphQL requests.

## P1 Questions: Important But Not Launch Blocking

### KAM-P1-01: Categories

- Can Storefront GraphQL expose the existing backend `displayOrder` field
  tenant-safely?
- If not, should frontend grouping remain the launch ordering?
- Are category names and assignments owned by backend operations or store
  content operations?

### KAM-P1-02: Product Data Quality

- Provide counts for missing descriptions, ingredients, allergens, nutrition,
  origin, unit price/unit measure, SEO title, and SEO description.
- Identify whether those fields exist but were not imported, or do not exist in
  the source data.
- Propose a Kamito-only import correction path without overwriting curated data.

### KAM-P1-03: Duplicate Product Media

- Confirm whether the importer created byte-identical images with different CDN
  URLs.
- State whether cleanup can be safely scoped to Kamito product media.
- Propose deduplication criteria, dry-run output, backup, and rollback.

### KAM-P1-04: Account And Customer Operations

- Reconfirm registration, login, refresh, forgot-password, address CRUD, order
  history, and order-detail behavior for a Kamito customer.
- Confirm that customer order history is tenant-scoped.
- Explain whether the old address REST fallback is still required.

### KAM-P1-05: Future Commercial Features

- Confirm current Kamito products with real sale/compare-at metadata.
- Confirm whether there is explicit curated outlet membership.
- Confirm whether a Kamito loyalty program exists.

These checks are informational. Do not enable Deals, Outlet, or loyalty as part
of this audit.

## Owner Information Still Missing

These are not backend facts and must not be guessed:

- public phone number;
- public email;
- legal business name and address;
- pickup address and opening hours;
- pickup preparation/contact instructions;
- bank recipient and account/IBAN;
- transfer title/reference and payment deadline;
- cancellation, return, complaint, and refund policy;
- privacy-controller/contact information;
- logo, favicon, hero/collection media;
- social links and analytics IDs.

Backend should state where each operational field belongs and how the
storefront can consume it, but must not invent values.

## Explicit Non-Goals

- No technical rename from `kamito` to `kenmito`.
- No DNS migration.
- No cross-tenant data cleanup.
- No global category migration.
- No fake stock import.
- No fake sale or compare-at prices.
- No activation of card, BLIK, P24, PayU, COD, loyalty, or back-in-stock.
- No frontend redesign.
- No production mutation or test order without clearly stating environment and
  operational safety.

## Required Response Format

Start with:

```text
KAMITO BACKEND LAUNCH VERDICT: GO | CONDITIONAL GO | NO-GO
Audit environment:
Audit timestamp:
Resolved salon UUID:
Resolved channel:
Other tenants changed: NO
```

Then answer with this table:

| ID | Current answer | Evidence | Launch impact | Backend action | Owner | Target date |
|---|---|---|---|---|---|---|
| KAM-P0-01 |  |  |  |  |  |  |

For every proposed code or data change include:

- exact repository/service;
- files, tables, and rows affected;
- tenant predicate;
- whether the change is shared or Kamito-only;
- migration or script dry-run output;
- tests;
- deployment steps;
- rollback steps;
- monitoring after deployment.

End with:

1. confirmed P0 blockers;
2. P0 items already safe;
3. smallest backend work package needed for launch;
4. work requiring owner information;
5. work explicitly deferred until after launch.

## Reference Files

Frontend repository:

- `D:\store_front\grocery-storefront`
- `D:\store_front\admin-panel`
- `D:\store_front\grocery-storefront\public\config\kamito.json`

Durable project context:

- `D:\kaipizz-second-brain\store-front-brain\wiki\ops\now\kamito-production-launch.md`
- `D:\kaipizz-second-brain\store-front-brain\wiki\ops\now\kamito-mobile-storefront-production-flow.md`
- `D:\kaipizz-second-brain\store-front-brain\wiki\decisions\enail-storefront-zyra-storefront-contract.md`
- `D:\kaipizz-second-brain\store-front-brain\wiki\ops\sessions\2026-05-23-kamito-backend-launch-audit.md`

The old backend audit is context only. Current production evidence takes
precedence.
