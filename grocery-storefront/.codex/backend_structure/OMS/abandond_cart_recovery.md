Abandoned Cart Recovery
5 endpoints

List all abandoned carts for the current salon. Returns carts that were inactive for over 1 hour and had items.
Requires OWNER or SUPER_ADMIN role.
Returns up to 100 most recent abandoned carts.
Carts are automatically marked ABANDONED after 1 hour of inactivity.

query AbandonedCarts {
  abandonedCarts {
    id
    email
    lineCount
    totalAmount
    currency
    createdAt
    updatedAt
    recoveryUrl
  }
}

Recover an abandoned cart using a recovery token from a recovery email. Returns the full cart object if still valid.
Public endpoint — no auth required.
Token is a 64-character hex string unique to each recovery email.
Returns null if cart no longer exists or token is invalid.
Parameters
Name	Type	Description
tokenrequired	String!	Recovery token from the recovery email link

query RecoverCart($token: String!) {
  abandonedCartRecover(token: $token) {
    id
    lines {
      id
      merchandiseId
      quantity
      cost {
        totalAmount { amount currencyCode }
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    buyerIdentity {
      email
    }
  }
}
{
  "token": "a1b2c3d4e5f6..."
}

Get the discount code associated with a cart recovery token. Step 2 emails include 5% off, step 3 includes 10% off.
Public endpoint — no auth required.
Step 1 recovery emails have no discount (code will be null).
Step 2: 5% discount. Step 3: 10% discount.
Discount codes are valid for 7 days and single-use.
Parameters
Name	Type	Description
tokenrequired	String!	Recovery token from the recovery email link

query RecoveryDiscount($token: String!) {
  cartRecoveryDiscount(token: $token) {
    code
    discountPercent
    expiresAt
    errors
  }
}
{
  "token": "a1b2c3d4e5f6..."
}

Get abandoned cart recovery statistics for the last 30 days.
Requires OWNER or SUPER_ADMIN role.
recoveryRate is a percentage (0-100).
totalLostRevenue is the sum of all unrecovered cart values.
period is always "last_30_days".

query AbandonedCartStats {
  abandonedCartStats {
    totalAbandoned
    recovered
    recoveryRate
    totalLostRevenue
    currency
    period
  }
}

Manually trigger a recovery email for a specific abandoned cart.
Requires OWNER or SUPER_ADMIN role.
Cart must belong to the current salon and have an email address.
Recovery emails are also sent automatically via a cron job every 30 minutes.
3-step drip: Step 1 at 1h (no discount), Step 2 at 24h (5% off), Step 3 at 72h (10% off).
Parameters
Name	Type	Description
cartIdrequired	ID!	The abandoned cart ID

mutation SendRecoveryEmail($cartId: ID!) {
  cartRecoveryEmailSend(cartId: $cartId) {
    success
    errors
  }
}
{
  "cartId": "cart-uuid"
}