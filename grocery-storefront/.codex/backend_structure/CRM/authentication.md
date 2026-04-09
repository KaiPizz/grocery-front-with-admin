CRM - Customer Relationship Management — Authentication, customer profiles, addresses, wishlists, and account management.

Authentication(12)
Customer Addresses(7)
Wishlist(4)

Authentication
12 endpoints

Create a new customer account.
mutation Register($input: RegisterInput!) {
  customerRegister(input: $input) {
    success
    accessToken
    refreshToken
    expiresIn
    customer {
      id
      email
      fullName
    }
    errors {
      field
      message
    }
  }
}
{
  "input": {
    "email": "user@example.com",
    "fullName": "John Doe",
    "password": "securePassword123",
    "phone": "+48123456789"
  }
}

Authenticate a customer and receive access tokens.
mutation Login($input: LoginInput!) {
  customerLogin(input: $input) {
    success
    accessToken
    refreshToken
    expiresIn
    customer {
      id
      email
      fullName
    }
  }
}
{
  "input": {
    "email": "user@example.com",
    "password": "securePassword123"
  }
}

Authenticate via Google ID token.
mutation GoogleAuth($input: OAuthLoginInput!) {
  customerGoogleAuth(input: $input) {
    success
    accessToken
    customer {
      id
      email
      fullName
    }
    message
  }
}
{
  "input": {
    "token": "google-id-token-from-client"
  }
}

Authenticate via Facebook access token.
mutation FacebookAuth($input: OAuthLoginInput!) {
  customerFacebookAuth(input: $input) {
    success
    accessToken
    customer {
      id
      email
      fullName
    }
  }
}
{
  "input": {
    "token": "facebook-access-token"
  }
}

Request a password reset email.
mutation ForgotPassword($input: ForgotPasswordInput!) {
  forgotPassword(input: $input) {
    success
    message
  }
}
{
  "input": {
    "email": "user@example.com"
  }
}

Reset password using token from email.
mutation ResetPassword($input: ResetPasswordInput!) {
  resetPassword(input: $input) {
    success
    message
  }
}
{
  "input": {
    "token": "reset-token-from-email",
    "newPassword": "newSecurePassword456"
  }
}

Verify customer email address.
mutation VerifyEmail($token: String!) {
  verifyEmail(token: $token) {
    success
    message
  }
}

Update the authenticated customer profile.
mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    success
    customer {
      id
      fullName
      phone
    }
    errors { field message }
  }
}
{
  "input": {
    "fullName": "Jane Doe",
    "phone": "+48987654321"
  }
}

Change password for authenticated customer.
mutation ChangePassword($input: ChangePasswordInput!) {
  changePassword(input: $input) {
    success
    message
    errors { field message }
  }
}
{
  "input": {
    "currentPassword": "oldPassword123",
    "newPassword": "newSecurePassword456"
  }
}

Logout and invalidate the current session.
mutation Logout {
  logout {
    success
    message
  }
}

Get the currently authenticated customer.
Requires Authorization: Bearer <accessToken> header
query Me {
  me {
    id
    email
    fullName
    phone
    createdAt
  }
}

Refresh an expired access token.
mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    accessToken
    refreshToken
    expiresIn
  }
}