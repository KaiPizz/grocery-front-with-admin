'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
  CART_CREATE_MUTATION,
  CART_DELIVERY_OPTIONS_QUERY,
  CART_DISCOUNT_CODES_UPDATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_NOTE_UPDATE_MUTATION,
  CART_PRODUCT_METADATA_QUERY,
  CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION,
  CART_SUBMIT_FOR_COMPLETION_MUTATION,
  GET_CART_QUERY,
} from '@/lib/graphql/operations/grocery';
import { resolveChannel } from '@/lib/channel';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { useSalonStore } from '@/stores/salon-store';
import type {
  CartAttribute,
  CartBuyerIdentity,
  CartCost,
  CartDeliveryOption,
  CartDiscountCode,
  CartItem,
  CartMoney,
  ServerCart,
  StorageZone,
} from '@/types';

interface CartUserError {
  field?: string[] | string | null;
  message: string;
  code?: string | null;
}

interface CartLineMetadata {
  productId: string;
  variantId: string;
  merchandiseId: string;
  slug?: string;
  name: string;
  thumbnail?: string;
  price: number;
  currency: string;
  storageZone?: StorageZone;
  allergens?: string[];
}

interface CartGraphqlLine {
  id: string;
  merchandiseId: string;
  quantity: number;
  cost?: {
    totalAmount?: CartMoney | null;
    amountPerQuantity?: CartMoney | null;
  } | null;
}

interface CartGraphqlShape {
  id: string;
  lines: CartGraphqlLine[];
  cost?: CartCost | null;
  buyerIdentity?: CartBuyerIdentity | null;
  note?: string | null;
  attributes?: CartAttribute[] | null;
  discountCodes?: CartDiscountCode[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface CartPayload {
  cart: CartGraphqlShape | null;
  userErrors: CartUserError[] | null;
}

interface CartQueryResponse {
  cart: CartGraphqlShape | null;
}

interface CartCreateResponse {
  cartCreate: CartPayload | null;
}

interface CartLinesAddResponse {
  cartLinesAdd: CartPayload | null;
}

interface CartLinesUpdateResponse {
  cartLinesUpdate: CartPayload | null;
}

interface CartLinesRemoveResponse {
  cartLinesRemove: CartPayload | null;
}

interface CartBuyerIdentityUpdateResponse {
  cartBuyerIdentityUpdate: CartPayload | null;
}

interface CartDiscountCodesUpdateResponse {
  cartDiscountCodesUpdate: CartPayload | null;
}

interface CartNoteUpdateResponse {
  cartNoteUpdate: CartPayload | null;
}

interface CartSelectedDeliveryOptionsUpdateResponse {
  cartSelectedDeliveryOptionsUpdate: CartPayload | null;
}

interface CartSubmitForCompletionResponse {
  cartSubmitForCompletion: CartPayload | null;
}

interface CartDeliveryOptionsResponse {
  cartDeliveryOptions: CartDeliveryOption[] | null;
}

interface ProductMetadataResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        slug?: string | null;
        thumbnail?: {
          url?: string | null;
        } | null;
        storageZone?: StorageZone | null;
        allergens?: string[] | null;
        pricing?: {
          priceRange?: {
            start?: {
              gross?: CartMoney | null;
            } | null;
          } | null;
        } | null;
        variants?: Array<{
          id: string;
          name?: string | null;
          pricing?: {
            price?: {
              gross?: CartMoney | null;
            } | null;
          } | null;
        }> | null;
      };
    }>;
    pageInfo?: {
      hasNextPage: boolean;
      endCursor?: string | null;
    } | null;
  } | null;
}

interface AddCartItemInput {
  productId: string;
  variantId: string;
  slug?: string;
  name: string;
  thumbnail?: string;
  price: number;
  currency: string;
  quantity?: number;
  storageZone?: StorageZone;
  allergens?: string[];
}

interface AddCartLineInput {
  merchandiseId: string;
  quantity: number;
}

interface UpdateCartLineInput {
  id: string;
  quantity: number;
}

interface CartOperationResult {
  success: boolean;
  message: string | null;
}

interface CartState {
  cartId: string | null;
  items: CartItem[];
  cost: CartCost;
  buyerIdentity: CartBuyerIdentity | null;
  note: string;
  attributes: CartAttribute[];
  discountCodes: CartDiscountCode[];
  deliveryOptions: CartDeliveryOption[];
  selectedDeliveryOption: CartDeliveryOption | null;
  serverCart: ServerCart | null;
  metadataByMerchandiseId: Record<string, CartLineMetadata>;
  isLoading: boolean;
  initialized: boolean;
  error: string | null;
  hydrateCart: () => Promise<void>;
  ensureCart: (input?: {
    lines?: AddCartLineInput[];
    buyerIdentity?: CartBuyerIdentity;
    note?: string;
    discountCodes?: string[];
    metadata?: Record<string, CartLineMetadata>;
  }) => Promise<string | null>;
  addItem: (item: AddCartItemInput) => Promise<boolean>;
  addLines: (lines: AddCartLineInput[], metadata?: Record<string, CartLineMetadata>) => Promise<boolean>;
  updateQuantity: (identifier: string, quantity: number) => Promise<boolean>;
  updateLines: (lines: UpdateCartLineInput[]) => Promise<boolean>;
  removeItem: (identifier: string) => Promise<boolean>;
  removeLines: (lineIds: string[]) => Promise<boolean>;
  updateBuyerIdentity: (buyerIdentity: CartBuyerIdentity) => Promise<boolean>;
  updateDiscountCodes: (discountCodes: string[]) => Promise<boolean>;
  applyDiscountCode: (code: string) => Promise<boolean>;
  removeDiscountCodes: () => Promise<boolean>;
  updateNote: (note: string) => Promise<boolean>;
  fetchDeliveryOptions: () => Promise<CartDeliveryOption[]>;
  selectDeliveryOption: (option: CartDeliveryOption) => Promise<boolean>;
  submitForCompletion: () => Promise<CartOperationResult>;
  clearCart: () => void;
  clear: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
  getItemsByZone: () => Record<string, CartItem[]>;
}

const EMPTY_COST: CartCost = {
  subtotalAmount: null,
  totalAmount: null,
  totalTaxAmount: null,
  totalDutyAmount: null,
};

function createEmptyState(): Omit<
  CartState,
  | 'hydrateCart'
  | 'ensureCart'
  | 'addItem'
  | 'addLines'
  | 'updateQuantity'
  | 'updateLines'
  | 'removeItem'
  | 'removeLines'
  | 'updateBuyerIdentity'
  | 'updateDiscountCodes'
  | 'applyDiscountCode'
  | 'removeDiscountCodes'
  | 'updateNote'
  | 'fetchDeliveryOptions'
  | 'selectDeliveryOption'
  | 'submitForCompletion'
  | 'clearCart'
  | 'clear'
  | 'getSubtotal'
  | 'getItemCount'
  | 'getItemsByZone'
> {
  return {
    cartId: null,
    items: [],
    cost: EMPTY_COST,
    buyerIdentity: null,
    note: '',
    attributes: [],
    discountCodes: [],
    deliveryOptions: [],
    selectedDeliveryOption: null,
    serverCart: null,
    metadataByMerchandiseId: {},
    isLoading: false,
    initialized: false,
    error: null,
  };
}

function getCurrentChannel(): string {
  return resolveChannel(useSalonStore.getState().salonSlug);
}

function getFallbackCurrency(): string {
  return useSalonStore.getState().salon?.currency || 'PLN';
}

function getUserErrorMessage(errors?: CartUserError[] | null): string | null {
  return errors?.find((error) => error.message?.trim())?.message ?? null;
}

function buildMetadataFromInput(item: AddCartItemInput): CartLineMetadata {
  return {
    productId: item.productId,
    variantId: item.variantId,
    merchandiseId: item.variantId,
    slug: item.slug,
    name: item.name,
    thumbnail: item.thumbnail,
    price: item.price,
    currency: item.currency,
    storageZone: item.storageZone,
    allergens: item.allergens,
  };
}

function normalizeCost(cost?: CartCost | null): CartCost {
  return {
    subtotalAmount: cost?.subtotalAmount ?? null,
    totalAmount: cost?.totalAmount ?? null,
    totalTaxAmount: cost?.totalTaxAmount ?? null,
    totalDutyAmount: cost?.totalDutyAmount ?? null,
  };
}

function mapLineToItem(line: CartGraphqlLine, metadata?: CartLineMetadata): CartItem {
  const unitPrice = line.cost?.amountPerQuantity?.amount ?? metadata?.price ?? 0;
  const currency = line.cost?.amountPerQuantity?.currency ?? metadata?.currency ?? getFallbackCurrency();

  return {
    id: line.id,
    merchandiseId: line.merchandiseId,
    productId: metadata?.productId ?? line.merchandiseId,
    variantId: metadata?.variantId ?? line.merchandiseId,
    slug: metadata?.slug,
    name: metadata?.name ?? 'Cart item',
    thumbnail: metadata?.thumbnail,
    price: unitPrice,
    currency,
    quantity: line.quantity,
    totalPrice: line.cost?.totalAmount?.amount ?? unitPrice * line.quantity,
    storageZone: metadata?.storageZone,
    allergens: metadata?.allergens,
  };
}

async function fetchCartMetadata(
  merchandiseIds: string[],
  existingMetadata: Record<string, CartLineMetadata>
): Promise<Record<string, CartLineMetadata>> {
  const pendingIds = Array.from(
    new Set(merchandiseIds.filter((id) => id && !existingMetadata[id]))
  );

  if (pendingIds.length === 0) {
    return {};
  }

  const resolved: Record<string, CartLineMetadata> = {};
  const unresolved = new Set(pendingIds);
  let after: string | null | undefined = undefined;

  for (let page = 0; page < 20 && unresolved.size > 0; page += 1) {
    const metadataResponse: Awaited<ReturnType<typeof graphqlRequest<ProductMetadataResponse>>> =
      await graphqlRequest<ProductMetadataResponse>(CART_PRODUCT_METADATA_QUERY, {
      channel: getCurrentChannel(),
      first: 50,
      after,
      });
    const topLevelMessage = getGraphqlErrorMessage(metadataResponse.errors);

    if (topLevelMessage) {
      throw new Error(topLevelMessage);
    }

    const products = metadataResponse.data?.products;
    const edges = products?.edges ?? [];

    for (const edge of edges) {
      const node = edge.node;
      const productPrice = node.pricing?.priceRange?.start?.gross;

      for (const variant of node.variants ?? []) {
        if (!unresolved.has(variant.id)) {
          continue;
        }

        const price = variant.pricing?.price?.gross ?? productPrice ?? null;

        resolved[variant.id] = {
          productId: node.id,
          variantId: variant.id,
          merchandiseId: variant.id,
          slug: node.slug ?? undefined,
          name: node.name,
          thumbnail: node.thumbnail?.url ?? undefined,
          price: price?.amount ?? 0,
          currency: price?.currency ?? getFallbackCurrency(),
          storageZone: node.storageZone ?? undefined,
          allergens: node.allergens ?? undefined,
        };
        unresolved.delete(variant.id);
      }
    }

    if (!products?.pageInfo?.hasNextPage) {
      break;
    }

    after = products.pageInfo.endCursor;
  }

  return resolved;
}

function buildGroupedItems(items: CartItem[]): Record<string, CartItem[]> {
  return items.reduce<Record<string, CartItem[]>>((groups, item) => {
    const key = item.storageZone || 'OTHER';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

function resolveCartItem(items: CartItem[], identifier: string): CartItem | undefined {
  return items.find((item) =>
    item.id === identifier
    || item.variantId === identifier
    || item.merchandiseId === identifier
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const applyCartSnapshot = async (
        cart: CartGraphqlShape | null,
        metadataPatch?: Record<string, CartLineMetadata>
      ) => {
        if (!cart) {
          set({
            ...createEmptyState(),
            initialized: true,
          });
          return;
        }

        const currentState = get();
        const metadataByMerchandiseId = {
          ...currentState.metadataByMerchandiseId,
          ...(metadataPatch ?? {}),
        };
        const fetchedMetadata = await fetchCartMetadata(
          cart.lines.map((line) => line.merchandiseId),
          metadataByMerchandiseId
        );
        const nextMetadata = {
          ...metadataByMerchandiseId,
          ...fetchedMetadata,
        };
        const items = cart.lines.map((line) => mapLineToItem(line, nextMetadata[line.merchandiseId]));
        const selectedDeliveryOption = currentState.selectedDeliveryOption
          ? currentState.deliveryOptions.find((option) => option.id === currentState.selectedDeliveryOption?.id) ?? currentState.selectedDeliveryOption
          : null;

        const serverCart: ServerCart = {
          id: cart.id,
          items,
          cost: normalizeCost(cart.cost),
          buyerIdentity: cart.buyerIdentity ?? null,
          note: cart.note ?? null,
          attributes: cart.attributes ?? [],
          discountCodes: cart.discountCodes ?? [],
          createdAt: cart.createdAt ?? null,
          updatedAt: cart.updatedAt ?? null,
          deliveryOptions: currentState.deliveryOptions,
          selectedDeliveryOption,
        };

        set({
          cartId: cart.id,
          items,
          cost: serverCart.cost,
          buyerIdentity: serverCart.buyerIdentity,
          note: cart.note ?? '',
          attributes: serverCart.attributes,
          discountCodes: serverCart.discountCodes,
          serverCart,
          metadataByMerchandiseId: nextMetadata,
          isLoading: false,
          initialized: true,
          error: null,
        });
      };

      const handleCartPayload = async (
        payload: CartPayload | null | undefined,
        metadataPatch?: Record<string, CartLineMetadata>
      ): Promise<CartOperationResult> => {
        const userErrorMessage = getUserErrorMessage(payload?.userErrors);

        if (userErrorMessage) {
          set({ isLoading: false, error: userErrorMessage });
          return { success: false, message: userErrorMessage };
        }

        if (!payload?.cart) {
          const message = 'Cart response did not include a cart.';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }

        await applyCartSnapshot(payload.cart, metadataPatch);
        return { success: true, message: null };
      };

      return {
        ...createEmptyState(),

        hydrateCart: async () => {
          const cartId = get().cartId;

          if (!cartId) {
            set({ initialized: true, isLoading: false, error: null });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartQueryResponse>(GET_CART_QUERY, { id: cartId });
            const message = getGraphqlErrorMessage(response.errors);

            if (message) {
              set({ isLoading: false, initialized: true, error: message });
              return;
            }

            await applyCartSnapshot(response.data?.cart ?? null);
          } catch (error) {
            set({
              isLoading: false,
              initialized: true,
              error: error instanceof Error ? error.message : 'Failed to hydrate cart.',
            });
          }
        },

        ensureCart: async (input) => {
          const existingCartId = get().cartId;

          if (existingCartId) {
            return existingCartId;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartCreateResponse>(CART_CREATE_MUTATION, {
              channel: getCurrentChannel(),
              input: {
                lines: input?.lines,
                buyerIdentity: input?.buyerIdentity,
                note: input?.note,
                discountCodes: input?.discountCodes,
              },
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return null;
            }

            const result = await handleCartPayload(response.data?.cartCreate, input?.metadata);
            return result.success ? get().cartId : null;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to create cart.',
            });
            return null;
          }
        },

        addItem: async (item) => {
          return get().addLines(
            [{ merchandiseId: item.variantId, quantity: item.quantity ?? 1 }],
            { [item.variantId]: buildMetadataFromInput(item) }
          );
        },

        addLines: async (lines, metadata = {}) => {
          if (lines.length === 0) {
            return true;
          }

          const cartId = get().cartId;
          const metadataPatch = {
            ...get().metadataByMerchandiseId,
            ...metadata,
          };

          if (!cartId) {
            const createdCartId = await get().ensureCart({ lines, metadata: metadataPatch });
            return Boolean(createdCartId);
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartLinesAddResponse>(CART_LINES_ADD_MUTATION, {
              cartId,
              lines,
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return false;
            }

            const result = await handleCartPayload(response.data?.cartLinesAdd, metadataPatch);
            return result.success;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to add cart lines.',
            });
            return false;
          }
        },

        updateQuantity: async (identifier, quantity) => {
          const item = resolveCartItem(get().items, identifier);

          if (!item) {
            set({ error: 'Cart item not found.' });
            return false;
          }

          return get().updateLines([{ id: item.id, quantity }]);
        },

        updateLines: async (lines) => {
          const cartId = get().cartId;

          if (!cartId || lines.length === 0) {
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartLinesUpdateResponse>(CART_LINES_UPDATE_MUTATION, {
              cartId,
              lines,
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return false;
            }

            const result = await handleCartPayload(response.data?.cartLinesUpdate);
            return result.success;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update cart lines.',
            });
            return false;
          }
        },

        removeItem: async (identifier) => {
          const item = resolveCartItem(get().items, identifier);

          if (!item) {
            set({ error: 'Cart item not found.' });
            return false;
          }

          return get().removeLines([item.id]);
        },

        removeLines: async (lineIds) => {
          const cartId = get().cartId;

          if (!cartId || lineIds.length === 0) {
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartLinesRemoveResponse>(CART_LINES_REMOVE_MUTATION, {
              cartId,
              lineIds,
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return false;
            }

            const result = await handleCartPayload(response.data?.cartLinesRemove);
            return result.success;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to remove cart lines.',
            });
            return false;
          }
        },

        updateBuyerIdentity: async (buyerIdentity) => {
          const mergedBuyerIdentity = {
            ...(get().buyerIdentity ?? {}),
            ...buyerIdentity,
          };
          const cartId = await get().ensureCart({ buyerIdentity: mergedBuyerIdentity });

          if (!cartId) {
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartBuyerIdentityUpdateResponse>(CART_BUYER_IDENTITY_UPDATE_MUTATION, {
              cartId,
              buyerIdentity: mergedBuyerIdentity,
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return false;
            }

            const result = await handleCartPayload(response.data?.cartBuyerIdentityUpdate);
            return result.success;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update buyer identity.',
            });
            return false;
          }
        },

        updateDiscountCodes: async (discountCodes) => {
          const cartId = get().cartId;

          if (!cartId) {
            set({ error: 'Cart does not exist.' });
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartDiscountCodesUpdateResponse>(CART_DISCOUNT_CODES_UPDATE_MUTATION, {
              cartId,
              discountCodes,
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return false;
            }

            const result = await handleCartPayload(response.data?.cartDiscountCodesUpdate);
            return result.success;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update discount codes.',
            });
            return false;
          }
        },

        applyDiscountCode: async (code) => {
          return get().updateDiscountCodes(code.trim() ? [code.trim()] : []);
        },

        removeDiscountCodes: async () => {
          return get().updateDiscountCodes([]);
        },

        updateNote: async (note) => {
          const cartId = await get().ensureCart({ note });

          if (!cartId) {
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartNoteUpdateResponse>(CART_NOTE_UPDATE_MUTATION, {
              cartId,
              note,
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return false;
            }

            const result = await handleCartPayload(response.data?.cartNoteUpdate);
            return result.success;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update note.',
            });
            return false;
          }
        },

        fetchDeliveryOptions: async () => {
          const cartId = get().cartId;

          if (!cartId) {
            set({ deliveryOptions: [], selectedDeliveryOption: null, error: 'Cart does not exist.' });
            return [];
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartDeliveryOptionsResponse>(CART_DELIVERY_OPTIONS_QUERY, {
              cartId,
              channel: getCurrentChannel(),
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return [];
            }

            const options = response.data?.cartDeliveryOptions ?? [];
            const selectedDeliveryOption = get().selectedDeliveryOption
              ? options.find((option) => option.id === get().selectedDeliveryOption?.id) ?? null
              : null;

            set((state) => ({
              isLoading: false,
              error: null,
              deliveryOptions: options,
              selectedDeliveryOption,
              serverCart: state.serverCart
                ? {
                    ...state.serverCart,
                    deliveryOptions: options,
                    selectedDeliveryOption,
                  }
                : state.serverCart,
            }));

            return options;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to fetch delivery options.',
            });
            return [];
          }
        },

        selectDeliveryOption: async (option) => {
          const cartId = get().cartId;

          set((state) => ({
            selectedDeliveryOption: option,
            serverCart: state.serverCart
              ? {
                  ...state.serverCart,
                  selectedDeliveryOption: option,
                }
              : state.serverCart,
          }));

          if (!cartId) {
            set({ error: 'Cart does not exist.' });
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartSelectedDeliveryOptionsUpdateResponse>(
              CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION,
              {
                cartId,
                selectedDeliveryOptions: [
                  {
                    deliveryGroupId: option.id,
                    deliveryOptionHandle: option.id,
                  },
                ],
              }
            );
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return false;
            }

            const result = await handleCartPayload(response.data?.cartSelectedDeliveryOptionsUpdate);
            return result.success;
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update delivery option.',
            });
            return false;
          }
        },

        submitForCompletion: async () => {
          const cartId = get().cartId;

          if (!cartId) {
            const message = 'Cart does not exist.';
            set({ error: message });
            return { success: false, message };
          }

          set({ isLoading: true, error: null });

          try {
            const response = await graphqlRequest<CartSubmitForCompletionResponse>(CART_SUBMIT_FOR_COMPLETION_MUTATION, {
              cartId,
            });
            const topLevelMessage = getGraphqlErrorMessage(response.errors);

            if (topLevelMessage) {
              set({ isLoading: false, error: topLevelMessage });
              return { success: false, message: topLevelMessage };
            }

            const result = await handleCartPayload(response.data?.cartSubmitForCompletion);
            return result;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to submit cart for completion.';
            set({ isLoading: false, error: message });
            return { success: false, message };
          }
        },

        clearCart: () => {
          set({
            ...createEmptyState(),
            initialized: true,
          });
        },

        clear: () => {
          get().clearCart();
        },

        getSubtotal: () => {
          const subtotal = get().cost.subtotalAmount?.amount;
          if (typeof subtotal === 'number') {
            return subtotal;
          }

          return get().items.reduce((sum, item) => sum + (item.totalPrice ?? item.price * item.quantity), 0);
        },

        getItemCount: () => {
          return get().items.reduce((sum, item) => sum + item.quantity, 0);
        },

        getItemsByZone: () => {
          return buildGroupedItems(get().items);
        },
      };
    },
    {
      name: 'grocery-cart',
      version: 1,
      partialize: (state) => ({
        cartId: state.cartId,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<CartState> | undefined),
      }),
    }
  )
);
