Customer Addresses
7 endpoints
Get customer profile with all saved addresses.
query CustomerProfile {
  customerProfile {
    id
    email
    fullName
    phone
    emailVerified
    addresses {
      id
      label
      isDefault
      fullName
      phone
      street
      city
      postalCode
      country
      createdAt
    }
    defaultAddress {
      id
      street
      city
    }
    createdAt
  }
}

Get all saved addresses for the current customer.
query CustomerAddresses {
  customerAddresses {
    id
    label
    isDefault
    fullName
    phone
    street
    city
    postalCode
    country
  }
}

Add a new address to the customer account.
mutation CreateAddress($input: CustomerAddressInput!) {
  customerAddressCreate(input: $input) {
    success
    address {
      id
      label
      isDefault
      fullName
      street
      city
    }
    errors
  }
}
{
  "input": {
    "label": "Home",
    "fullName": "Jan Kowalski",
    "phone": "+48123456789",
    "street": "ul. Marszałkowska 1/2",
    "city": "Warszawa",
    "postalCode": "00-001",
    "country": "PL"
  }
}

Update an existing address.
mutation UpdateAddress($id: ID!, $input: CustomerAddressInput!) {
  customerAddressUpdate(id: $id, input: $input) {
    success
    address {
      id
      label
      street
      city
    }
    errors
  }
}

Remove an address from the customer account.
mutation DeleteAddress($id: ID!) {
  customerAddressDelete(id: $id) {
    success
    errors
  }
}

Set an address as the default.
mutation SetDefaultAddress($id: ID!) {
  customerAddressSetDefault(id: $id) {
    success
    address {
      id
      isDefault
    }
    errors
  }
}

Permanently delete a customer account and all associated data. This action is irreversible.
(GDPR)
This action is irreversible
All customer data, addresses, order history, and preferences will be deleted
mutation DeleteAccount($password: String!) {
  customerAccountDelete(password: $password) {
    success
    message
  }
}