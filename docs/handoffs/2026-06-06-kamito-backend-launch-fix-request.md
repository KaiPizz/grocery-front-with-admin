# Kamito Backend Launch Fix Request

> Date: 2026-06-06
> Use this as a follow-up prompt for the backend bot after the read-only production audit returned **NO-GO**.

## Prompt

You already completed the read-only production audit for the `kamito` channel and returned **NO-GO** because catalog browsing works but checkout cannot complete.

Please propose and, only after owner/backend approval, implement the smallest tenant-scoped backend fix package needed to make checkout testable for `kamito`.

Keep this scoped to the existing technical tenant:

- channel: `kamito`
- channel id from audit: `9c224eed-6d05-434e-84ce-5e511ba69bb9`
- salon id from audit: `e73271a9-53e3-4a20-a02e-791726b452aa`
- shopper-facing display name: `Kenmito`
- do **not** rename infrastructure from `kamito` to `kenmito`

Please do not assume the frontend can fake missing backend methods. The storefront must keep using backend-exposed shipping/payment methods.

## Current Audit Findings To Start From

- `availablePaymentMethods(channel:"kamito")` returns `[]`.
- `availableShippingMethods(channel:"kamito")` returns `[]`.
- Global `bank_transfer` exists but is not linked to the Kamito channel.
- No active pickup shipping method is exposed for the Kamito channel.
- Kamito has 0 historical orders, so end-to-end order creation is unproven.
- Stock is still placeholder seed data; frontend will keep broad availability only.
- Kamito channel default language is `pl`, but `salons.primary_language` still appears to be `vi`.
- Order-created staff notification is not confirmed.
- Channel warehouse mapping may be missing.

## Requested Backend Work Package

Please first return a short implementation proposal with:

1. The exact records/tables/services you intend to touch.
2. Whether each change is Kamito-only or shared.
3. The tenant predicate you will use for every query or mutation.
4. Dry-run evidence showing the target rows before change.
5. Test plan.
6. Rollback plan.

Then, if approved, implement the smallest safe set:

1. Link the existing active `bank_transfer` payment method to the `kamito` channel so `availablePaymentMethods(channel:"kamito")` returns it.
2. Create or link one active pickup/self-collection shipping method for `kamito`, price `0 PLN`, so `availableShippingMethods(channel:"kamito")` returns it after a valid checkout/address context.
3. Map a warehouse/default warehouse to the Kamito channel if checkout allocation or reservation requires it.
4. Run one safe guest order test and one safe authenticated order test in staging or controlled production, whichever is operationally acceptable.
5. Prove resulting orders land on salon `e73271a9-53e3-4a20-a02e-791726b452aa`, channel `kamito`, currency `PLN`, payment status pending/manual bank transfer, and do not appear in any other tenant queue.
6. Propose the smallest tenant-scoped new-order alert for staff, or document a strict manual monitoring fallback with owner, screen/API, polling interval, escalation, and reconciliation.
7. Resolve or explicitly document the `salons.primary_language=vi` vs channel `default_language=pl` mismatch.

## Owner Data Needed

Please state exactly where each of these should live and how the storefront can consume it, but do not invent the values:

- bank recipient and IBAN/account number;
- transfer title/reference format;
- payment deadline;
- pickup address and opening hours;
- preparation/contact instructions;
- legal business name and address;
- public phone/email;
- cancellation, return, complaint, and refund policy;
- logo/favicon/hero/category media if backend/admin storage is involved.

## Response Format

Use whatever format best fits your backend repo, but please include these sections:

```text
VERDICT AFTER PROPOSED FIX: CONDITIONAL GO | STILL NO-GO
Environment:
Tenant predicate:
Other tenants changed: YES | NO

Planned changes:
Tests:
Rollback:
Owner inputs still required:
Frontend contract impact:
```

For any migration/script, include the command, dry-run output if available, affected row counts, and rollback command or manual rollback steps.

Do not activate card, BLIK, P24, PayU, COD, loyalty, sale/outlet, or exact stock as part of this package unless explicitly requested later.
