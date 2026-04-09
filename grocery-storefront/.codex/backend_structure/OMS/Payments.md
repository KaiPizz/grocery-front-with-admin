Payments
2 endpoints

Get available payment methods for a checkout.
query PaymentMethods($checkoutId: ID!) {
  availablePaymentMethods(checkoutId: $checkoutId) {
    id
    name
    type
    currencies
    config
  }
}

Create a payment for a checkout.
For redirect-based gateways (P24, TPay), use the returned paymentUrl
mutation CreatePayment($input: PaymentInput!) {
  checkoutPaymentCreate(input: $input) {
    payment {
      id
      gateway
      total { amount currency }
      paymentUrl
    }
    errors { field message }
  }
}
{
  "input": {
    "checkoutId": "checkout-123",
    "gateway": "stripe",
    "amount": 99.99,
    "returnUrl": "https://myshop.com/checkout/success"
  }
}