# OMS Phase 1 Contract Review

## Summary
- The current frontend checkout contract was partially wrong.
- The user-provided `OMS.txt` contract is now the primary reference for checkout, payment, and order integration.
- The live storefront schema exposes an `orders` query that can power a read-only account order history.
- Several checkout operations still show schema/runtime drift on the backend, so frontend fixes alone may not fully unblock checkout creation and promo application.

## Verified Query and Mutation Details
- `orders(first, after)` exists on the root query.
- `Order` supports:
  - `id`
  - `number`
  - `status`
  - `created`
  - `paymentStatus`
  - `total { gross { amount currency } }`
  - `lines { quantity productName variantName }`
- `checkoutComplete(input: CheckoutCompleteInput!)` expects `checkoutId` and returns `order.created`, not `order.createdAt`.
- `checkoutPaymentCreate(checkoutId, input)` expects input type `PaymentCreate`, not `PaymentInput`.
- `checkoutPromoCodeAdd` expects `input: CheckoutPromoCodeInput!`, not top-level `checkoutId` and `promoCode` arguments.
- `checkoutCreateFull` expects input type `CheckoutCreateInputExtended!`, not `CheckoutCreateInput!`.

## Backend Drift Discovered
- `checkoutCreateFull` accepts `channel`, `email`, and `lines` at GraphQL validation time, but the resolver currently rejects those properties at runtime with `Bad Request Exception`.
- `checkoutPromoCodeAdd(input)` validates the expected input fields at the GraphQL layer, but the resolver still rejects `checkoutId` and `promoCode` at runtime.
- `checkoutShippingAddressUpdate` and `checkoutShippingMethodUpdate` match the expected input field names at the schema layer, but still require live end-to-end verification against real checkout IDs.

## Frontend Changes Made
- Fixed checkout mutation documents to match the verified schema where possible.
- Replaced the placeholder orders account section with a live paginated `orders` query.
- Added payment redirect and pending-state handling to the confirmation flow.
- Invalidated initialized payment sessions whenever shipping or promo changes alter totals.

## Remaining Risks
- If the backend DTO validation is not fixed, checkout creation and promo application may still fail even with the corrected frontend documents.
- The `orders` query is assumed to be customer-scoped when authenticated. It returned an empty list without auth, but customer-level access control still needs server-side confirmation.
