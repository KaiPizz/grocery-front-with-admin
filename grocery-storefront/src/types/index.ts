export type StorageZone = 'AMBIENT' | 'CHILLED' | 'FROZEN';
export type Freshness = 'FRESH' | 'EXPIRING_SOON' | 'LAST_CHANCE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface NutritionFacts {
  calories?: number;
  fat?: number;
  saturatedFat?: number;
  carbs?: number;
  sugar?: number;
  fiber?: number;
  protein?: number;
  salt?: number;
  servingSize?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ProductMedia {
  url?: string | null;
  alt?: string | null;
  type?: string | null;
  sortOrder?: number | null;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  stockQuantity: number;
  expiryTracking?: boolean;
  shelfLifeDays?: number;
  preOrder?: {
    enabled: boolean;
    date?: string;
    depositPercent?: number;
    maxQuantity?: number;
  };
}

export interface ProductTranslation {
  language?: string | null;
  name?: string | null;
  description?: string | null;
  shortDescription?: string | null;
}

export interface GroceryProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  translation?: ProductTranslation | null;
  thumbnail?: ProductImage;
  images?: ProductImage[];
  media?: ProductMedia[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  variants: ProductVariant[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  stockQuantity: number;

  // Food-specific fields
  allergens?: string[];
  mayContainAllergens?: string[];
  dietaryTags?: string[];
  calories?: number;
  spiceLevel?: number;
  isAlcohol?: boolean;
  countryOfOrigin?: string;
  sellByWeight?: boolean;
  pricePerUnit?: number;
  unitOfMeasure?: string;
  storageZone?: StorageZone;
  ingredients?: string;
  nutritionFacts?: NutritionFacts;
  certifications?: string[];
  importBatchNumber?: string;

  // Freshness (computed from nearest lot expiry)
  freshness?: Freshness;
  nearestExpiry?: string;
}

export interface Recipe {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: ProductImage;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  difficulty?: Difficulty;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  image?: ProductImage;
}

export interface RecipeIngredient {
  id: string;
  quantity: number;
  unit: string;
  displayName?: string;
  isOptional: boolean;
  variant?: {
    id: string;
    name: string;
    price: number;
    currency: string;
  };
  product?: {
    id: string;
    name: string;
    thumbnail?: ProductImage;
  };
  inStock?: boolean;
}

export interface CartItem {
  id: string;
  merchandiseId: string;
  productId: string;
  variantId: string;
  slug?: string;
  name: string;
  thumbnail?: string;
  price: number;
  currency: string;
  quantity: number;
  totalPrice?: number;
  storageZone?: StorageZone;
  allergens?: string[];
}

export interface CartMoney {
  amount: number;
  currency: string;
}

export interface CartCost {
  subtotalAmount?: CartMoney | null;
  totalAmount?: CartMoney | null;
  totalTaxAmount?: CartMoney | null;
  totalDutyAmount?: CartMoney | null;
}

export interface CartBuyerIdentity {
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
}

export interface CartAttribute {
  key: string;
  value: string;
}

export interface CartDiscountCode {
  code: string;
  applicable: boolean;
}

export interface CartDeliveryOption {
  id: string;
  name: string;
  price: CartMoney;
  estimatedDeliveryTime?: string | null;
}

export interface CartSelectedDeliveryOption {
  deliveryGroupId: string;
  deliveryOptionHandle: string;
}

export interface ServerCart {
  id: string;
  items: CartItem[];
  cost: CartCost;
  buyerIdentity: CartBuyerIdentity | null;
  note?: string | null;
  attributes: CartAttribute[];
  discountCodes: CartDiscountCode[];
  createdAt?: string | null;
  updatedAt?: string | null;
  deliveryOptions: CartDeliveryOption[];
  selectedDeliveryOption: CartDeliveryOption | null;
}

export interface WishlistItem {
  productId: string;
  variantId: string;
  slug?: string;
  name: string;
  thumbnail?: string;
  price: number;
  currency: string;
  quantity: number;
  storageZone?: StorageZone;
  addedAt: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unavailable';

export type CustomerLoginProvider = 'password' | 'google' | 'facebook';

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  hasPassword?: boolean;
  linkedProviders?: CustomerLoginProvider[];
}

export interface AuthError {
  field?: string | null;
  message: string;
  code?: string | null;
}

export interface AuthSession {
  user: CustomerProfile | null;
  status: AuthStatus;
}

export interface OrderAddress {
  streetAddress1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface CustomerAddress {
  id: string;
  label?: string | null;
  isDefault: boolean;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt?: string;
}

export interface CustomerAddressInput {
  label?: string | null;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface CustomerOrderLine {
  productName?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice?: {
    gross: {
      amount: number;
      currency: string;
    };
  } | null;
  totalPrice?: {
    gross: {
      amount: number;
      currency: string;
    };
  } | null;
  thumbnail?: {
    url?: string | null;
  } | null;
}

export interface CustomerOrderSummary {
  id: string;
  number: string;
  status: string;
  created: string;
  total: {
    gross: {
      amount: number;
      currency: string;
    };
  };
  lines: CustomerOrderLine[];
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  shippingAddress?: OrderAddress | null;
  billingAddress?: OrderAddress | null;
  shippingMethodName?: string | null;
  subtotal?: {
    gross: {
      amount: number;
      currency: string;
    };
  } | null;
  shippingPrice?: CartMoney | null;
  paymentStatus?: string | null;
  trackingNumber?: string | null;
}

export interface WishlistServerItem {
  productId: string;
  variantId: string;
  addedAt: string;
  name?: string | null;
  price?: number | null;
}

export interface Salon {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  businessCategory?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

export interface ProductConnection {
  edges: { node: GroceryProduct; cursor: string }[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface RecipeConnection {
  edges: { node: Recipe; cursor: string }[];
  pageInfo: PageInfo;
  totalCount: number;
}
