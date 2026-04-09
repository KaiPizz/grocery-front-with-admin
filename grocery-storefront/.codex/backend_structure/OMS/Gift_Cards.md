Gift Cards
3 endpoints

Look up a gift card by code to check balance.
query GiftCardLookup($code: String!, $channel: String!) {
  giftCardLookup(code: $code, channel: $channel) {
    code
    currentBalance { amount currency }
    initialBalance { amount currency }
    isActive
    expiryDate
    lastUsed
  }
}

Activate a gift card by code.
mutation ActivateGiftCard($code: String!, $channel: String!) {
  giftCardActivate(code: $code, channel: $channel) {
    success
    giftCard {
      code
      currentBalance { amount currency }
      isActive
    }
    errors { field message }
  }
}

List gift cards for the authenticated customer.
query MyGiftCards {
  myGiftCards {
    code
    currentBalance { amount currency }
    isActive
    expiryDate
  }
}









