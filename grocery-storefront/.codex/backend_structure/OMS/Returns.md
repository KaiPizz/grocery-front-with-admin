Returns
2 endpoints

Get return requests for the authenticated customer.
query CustomerReturns {
  customerReturns {
    id
    orderId
    status
    reason
    createdAt
    items {
      productName
      quantity
      reason
    }
  }
}

Submit a return request for an order.
mutation CreateReturn($input: ReturnInput!) {
  createReturn(input: $input) {
    success
    returnRequest {
      id
      status
      createdAt
    }
    errors { field message }
  }
}
{
  "input": {
    "orderId": "order-123",
    "reason": "Wrong size",
    "items": [
      { "lineId": "line-1", "quantity": 1, "reason": "Too small" }
    ]
  }
}





