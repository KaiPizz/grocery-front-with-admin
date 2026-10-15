'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCustomerStateGeneration } from '@/lib/auth';
import {
  ACCOUNT_CART_SYNC_MUTATION,
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

interface AccountCartSyncResponse {
  accountCartSync: CartPayload | null;
}

type CartSyncStatus = 'waiting' | 'guest' | 'unverified' | 'pending' | 'ready' | 'error' | 'unavailable';

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
  cartOwnerId: string | null;
  customerId: string | null;
  customerVerified: boolean;
  syncStatus: CartSyncStatus;
  syncNotice: 'changed' | 'attention' | null;
  setCustomerSession: (customerId: string | null, verified: boolean, available?: boolean) => void;
  syncAccountCart: () => Promise<boolean>;
  checkoutCompleted: (sourceCartId: string | null, cartChanged: boolean) => Promise<void>;
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

const CART_METADATA_PAGE_SIZE = 100;
const CART_METADATA_MAX_PAGES = 20;

function createEmptyState(): Omit<
  CartState,
  | 'hydrateCart'
  | 'customerId'
  | 'customerVerified'
  | 'syncStatus'
  | 'syncNotice'
  | 'setCustomerSession'
  | 'syncAccountCart'
  | 'checkoutCompleted'
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
    cartOwnerId: null,
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

function hasPositiveAmount(amount: number | null | undefined): amount is number {
  return typeof amount === 'number' && amount > 0;
}

function resolveAmount(serverAmount: number | null | undefined, fallbackAmount: number | null | undefined): number {
  if (hasPositiveAmount(serverAmount) || !hasPositiveAmount(fallbackAmount)) {
    return serverAmount ?? fallbackAmount ?? 0;
  }

  return fallbackAmount;
}

function calculateItemsSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.totalPrice ?? item.price * item.quantity), 0);
}

function mapLineToItem(line: CartGraphqlLine, metadata?: CartLineMetadata): CartItem {
  const serverUnitAmount = line.cost?.amountPerQuantity?.amount;
  const metadataUnitAmount = metadata?.price;
  const useMetadataUnitPrice = hasPositiveAmount(metadataUnitAmount) && !hasPositiveAmount(serverUnitAmount);
  const unitPrice = resolveAmount(serverUnitAmount, metadataUnitAmount);
  const totalPrice = useMetadataUnitPrice
    ? resolveAmount(line.cost?.totalAmount?.amount, unitPrice * line.quantity)
    : line.cost?.totalAmount?.amount ?? unitPrice * line.quantity;
  const currency = useMetadataUnitPrice
    ? metadata?.currency ?? getFallbackCurrency()
    : line.cost?.amountPerQuantity?.currency ?? metadata?.currency ?? getFallbackCurrency();

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
    totalPrice,
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

  for (let page = 0; page < CART_METADATA_MAX_PAGES && unresolved.size > 0; page += 1) {
    const metadataResponse: Awaited<ReturnType<typeof graphqlRequest<ProductMetadataResponse>>> =
      await graphqlRequest<ProductMetadataResponse>(CART_PRODUCT_METADATA_QUERY, {
      channel: getCurrentChannel(),
      first: CART_METADATA_PAGE_SIZE,
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
      let snapshotVersion = 0;
      let pendingWrites = 0;
      let writeQueue: Promise<void> = Promise.resolve();
      let queueGeneration = getCustomerStateGeneration();
      let syncFlight: { generation: number; version: number; promise: Promise<boolean> } | null = null;
      let createFlight: { generation: number; version: number; promise: Promise<string | null> } | null = null;
      let resolveSession: () => void;
      const sessionReady = new Promise<void>((resolve) => { resolveSession = resolve; });

      function normalizeWriteQueue(): number {
        const generation = getCustomerStateGeneration();
        if (queueGeneration !== generation) {
          queueGeneration = generation;
          writeQueue = Promise.resolve();
          pendingWrites = 0;
        }
        return generation;
      }

      function scopedSetter(): typeof set {
        const generation = getCustomerStateGeneration();
        const version = snapshotVersion;
        return (partial) => {
          if (generation === getCustomerStateGeneration() && version === snapshotVersion) set(partial);
        };
      }

      async function cartRequest<T>(query: string, variables?: Record<string, unknown>) {
        const generation = getCustomerStateGeneration();
        const version = snapshotVersion;
        const response = await graphqlRequest<T>(query, variables);
        if (generation !== getCustomerStateGeneration() || version !== snapshotVersion) throw new Error('Cart operation was superseded.');
        return response;
      }

      function serializeMutation<TArgs extends unknown[], TResult>(action: (...args: TArgs) => Promise<TResult>, fallback: TResult, recoverGuest?: (...args: TArgs) => boolean) {
        return (...args: TArgs): Promise<TResult> => {
          const generation = normalizeWriteQueue();
          pendingWrites++;
          const result = writeQueue.then(async () => {
            await sessionReady;
            if (generation !== getCustomerStateGeneration() || get().syncStatus === 'unavailable') return fallback;
            if (get().customerId && get().customerVerified && get().syncStatus !== 'ready') {
              if (!await syncAccountCart(true) && !(get().cartId && get().cartOwnerId === null && recoverGuest?.(...args))) return fallback;
            }
            if (generation !== getCustomerStateGeneration()) return fallback;
            snapshotVersion++;
            set({ syncNotice: null });
            const value = await action(...args);
            return generation === getCustomerStateGeneration() ? value : fallback;
          });
          writeQueue = result.then(() => {}, () => {});
          return result.finally(() => { if (generation === queueGeneration) pendingWrites--; });
        };
      }

      const applyCartSnapshot = async (
        cart: CartGraphqlShape | null,
        metadataPatch?: Record<string, CartLineMetadata>,
        expectedVersion = snapshotVersion,
      ) => {
        const generation = getCustomerStateGeneration();
        if (expectedVersion !== snapshotVersion) return;
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
        if (generation !== getCustomerStateGeneration() || expectedVersion !== snapshotVersion) return;
        const resolvedMetadata = {
          ...metadataByMerchandiseId,
          ...fetchedMetadata,
        };
        const activeMerchandiseIds = new Set(cart.lines.map((line) => line.merchandiseId));
        const nextMetadata = Object.fromEntries(
          Object.entries(resolvedMetadata).filter(([merchandiseId]) => activeMerchandiseIds.has(merchandiseId))
        );
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

      async function syncAccountCart(fromWrite = false): Promise<boolean> {
        const generation = normalizeWriteQueue();
        const customerId = get().customerId;
        if (!fromWrite && get().cartOwnerId === null && pendingWrites > 0) {
          await writeQueue;
          if (generation !== getCustomerStateGeneration()) return false;
          return syncAccountCart();
        }
        if (!customerId || !get().customerVerified) return true;
        if (syncFlight?.generation === generation && syncFlight.version === snapshotVersion) return syncFlight.promise;
        if (pendingWrites > 0 && get().syncStatus === 'ready') return true;
        const expectedVersion = ++snapshotVersion;
        const guestCartId = get().cartOwnerId === null ? get().cartId : null;
        const promise = (async () => {
          set({ syncStatus: get().syncStatus === 'ready' ? 'ready' : 'pending', isLoading: true });
          try {
            const response = await graphqlRequest<AccountCartSyncResponse>(ACCOUNT_CART_SYNC_MUTATION, { guestCartId });
            if (generation !== getCustomerStateGeneration() || expectedVersion !== snapshotVersion) return false;
            const payload = response.data?.accountCartSync;
            const requiresAttention = payload?.userErrors?.some((error) => error.code === 'CART_REQUIRES_ATTENTION') === true;
            const fatalError = payload?.userErrors?.some((error) => error.code !== 'CART_REQUIRES_ATTENTION') === true;
            if (getGraphqlErrorMessage(response.errors) || fatalError || !payload?.cart) {
              set({ syncStatus: 'error', isLoading: false, initialized: true });
              return false;
            }
            await applyCartSnapshot(payload.cart, undefined, expectedVersion);
            if (generation !== getCustomerStateGeneration() || expectedVersion !== snapshotVersion) return false;
            set({ cartOwnerId: customerId, syncStatus: 'ready', isLoading: false, syncNotice: requiresAttention ? 'attention' : get().syncNotice === 'changed' ? 'changed' : null });
            return true;
          } catch {
            if (generation === getCustomerStateGeneration() && expectedVersion === snapshotVersion) set({ syncStatus: 'error', isLoading: false, initialized: true });
            return false;
          }
        })();
        const flight = { generation, version: expectedVersion, promise };
        syncFlight = flight;
        try { return await promise; } finally { if (syncFlight === flight) syncFlight = null; }
      }

      return {
        ...createEmptyState(),
        customerId: null,
        customerVerified: false,
        syncStatus: 'waiting',
        syncNotice: null,

        setCustomerSession: (customerId, verified, available = true) => {
          if (available && get().customerId === customerId && get().customerVerified === verified && get().syncStatus !== 'waiting' && get().syncStatus !== 'unavailable') return;
          try {
            set({ customerId, customerVerified: verified, syncStatus: !available ? 'unavailable' : !customerId ? 'guest' : verified ? 'pending' : 'unverified' });
          } catch {
            // Zustand has updated memory; denied persistence must not block auth.
          }
          resolveSession();
        },

        syncAccountCart: () => syncAccountCart(),

        checkoutCompleted: async (sourceCartId, cartChanged) => {
          const generation = getCustomerStateGeneration();
          if (!sourceCartId || !get().customerId || !get().customerVerified) {
            get().clearCart();
            return;
          }
          // A replay can describe an older order/source. Only the server's
          // canonical snapshot proves what remains; keep local recovery data
          // until that snapshot arrives, fencing older responses meanwhile.
          snapshotVersion++;
          set({ syncStatus: 'pending' });
          await get().syncAccountCart();
          if (generation !== getCustomerStateGeneration()) return;
          if (cartChanged) set({ syncNotice: 'changed' });
        },

        hydrateCart: async () => {
          const set = scopedSetter();
          if (get().customerId && get().customerVerified) { await get().syncAccountCart(); return; }
          if (pendingWrites > 0) return;
          const generation = getCustomerStateGeneration();
          const expectedVersion = snapshotVersion;
          const cartId = get().cartId;

          if (!cartId) {
            set({ initialized: true, isLoading: false, error: null });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await cartRequest<CartQueryResponse>(GET_CART_QUERY, { id: cartId });
            if (generation !== getCustomerStateGeneration() || expectedVersion !== snapshotVersion) return;
            const message = getGraphqlErrorMessage(response.errors);

            if (message) {
              set({ isLoading: false, initialized: true, error: message });
              return;
            }

            await applyCartSnapshot(response.data?.cart ?? null, undefined, expectedVersion);
          } catch (error) {
            if (generation !== getCustomerStateGeneration()) return;
            set({
              isLoading: false,
              initialized: true,
              error: error instanceof Error ? error.message : 'Failed to hydrate cart.',
            });
          }
        },

        ensureCart: async (input) => {
          const set = scopedSetter();
          await sessionReady;
          const generation = getCustomerStateGeneration();
          if (get().syncStatus === 'unavailable') return null;
          if (get().customerId && get().customerVerified && get().syncStatus !== 'ready') {
            if (!await syncAccountCart(true)) return null;
          }
          if (generation !== getCustomerStateGeneration()) return null;
          const existingCartId = get().cartId;

          if (existingCartId) {
            return existingCartId;
          }

          if (createFlight?.generation === generation && createFlight.version === snapshotVersion) return createFlight.promise;
          const expectedVersion = snapshotVersion;
          const promise = (async () => {
            set({ isLoading: true, error: null });

            try {
              const response = await cartRequest<CartCreateResponse>(CART_CREATE_MUTATION, {
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
          })();
          const flight = { generation, version: expectedVersion, promise };
          createFlight = flight;
          try { return await promise; } finally { if (createFlight === flight) createFlight = null; }
        },

        addItem: async (item) => {
          return get().addLines(
            [{ merchandiseId: item.variantId, quantity: item.quantity ?? 1 }],
            { [item.variantId]: buildMetadataFromInput(item) }
          );
        },

        addLines: serializeMutation(async (lines: AddCartLineInput[], metadata: Record<string, CartLineMetadata> = {}) => {
          const set = scopedSetter();
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
            const response = await cartRequest<CartLinesAddResponse>(CART_LINES_ADD_MUTATION, {
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
        }, false),

        updateQuantity: async (identifier, quantity) => {
          const item = resolveCartItem(get().items, identifier);

          if (!item) {
            set({ error: 'Cart item not found.' });
            return false;
          }

          return get().updateLines([{ id: item.id, quantity }]);
        },

        updateLines: serializeMutation(async (lines: UpdateCartLineInput[]) => {
          const set = scopedSetter();
          const cartId = get().cartId;

          if (!cartId || lines.length === 0) {
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await cartRequest<CartLinesUpdateResponse>(CART_LINES_UPDATE_MUTATION, {
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
        }, false, (lines) => lines.every((line) => {
          const existing = get().items.find((item) => item.id === line.id);
          return existing !== undefined && line.quantity >= 0 && line.quantity <= existing.quantity;
        })),

        removeItem: async (identifier) => {
          const item = resolveCartItem(get().items, identifier);

          if (!item) {
            set({ error: 'Cart item not found.' });
            return false;
          }

          return get().removeLines([item.id]);
        },

        removeLines: serializeMutation(async (lineIds: string[]) => {
          const set = scopedSetter();
          const cartId = get().cartId;

          if (!cartId || lineIds.length === 0) {
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await cartRequest<CartLinesRemoveResponse>(CART_LINES_REMOVE_MUTATION, {
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
        }, false, () => true),

        updateBuyerIdentity: serializeMutation(async (buyerIdentity: CartBuyerIdentity) => {
          const set = scopedSetter();
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
            const response = await cartRequest<CartBuyerIdentityUpdateResponse>(CART_BUYER_IDENTITY_UPDATE_MUTATION, {
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
        }, false),

        updateDiscountCodes: serializeMutation(async (discountCodes: string[]) => {
          const set = scopedSetter();
          const cartId = get().cartId;

          if (!cartId) {
            set({ error: 'Cart does not exist.' });
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await cartRequest<CartDiscountCodesUpdateResponse>(CART_DISCOUNT_CODES_UPDATE_MUTATION, {
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
        }, false),

        applyDiscountCode: async (code) => {
          return get().updateDiscountCodes(code.trim() ? [code.trim()] : []);
        },

        removeDiscountCodes: async () => {
          return get().updateDiscountCodes([]);
        },

        updateNote: serializeMutation(async (note: string) => {
          const set = scopedSetter();
          const cartId = await get().ensureCart({ note });

          if (!cartId) {
            return false;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await cartRequest<CartNoteUpdateResponse>(CART_NOTE_UPDATE_MUTATION, {
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
        }, false),

        fetchDeliveryOptions: async () => {
          const set = scopedSetter();
          const cartId = get().cartId;

          if (!cartId) {
            set({ deliveryOptions: [], selectedDeliveryOption: null, error: 'Cart does not exist.' });
            return [];
          }

          set({ isLoading: true, error: null });

          try {
            const response = await cartRequest<CartDeliveryOptionsResponse>(CART_DELIVERY_OPTIONS_QUERY, {
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

        selectDeliveryOption: serializeMutation(async (option: CartDeliveryOption) => {
          const set = scopedSetter();
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
            const response = await cartRequest<CartSelectedDeliveryOptionsUpdateResponse>(
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
        }, false),

        submitForCompletion: serializeMutation(async () => {
          const set = scopedSetter();
          const cartId = get().cartId;

          if (!cartId) {
            const message = 'Cart does not exist.';
            set({ error: message });
            return { success: false, message };
          }

          set({ isLoading: true, error: null });

          try {
            const response = await cartRequest<CartSubmitForCompletionResponse>(CART_SUBMIT_FOR_COMPLETION_MUTATION, {
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
        }, { success: false, message: null } as CartOperationResult),

        clearCart: () => {
          snapshotVersion++;
          set({
            ...createEmptyState(),
            initialized: true,
            syncStatus: get().customerId && get().customerVerified ? 'pending' : get().syncStatus,
          });
        },

        clear: () => {
          get().clearCart();
        },

        getSubtotal: () => {
          const itemSubtotal = calculateItemsSubtotal(get().items);
          const subtotal = get().cost.subtotalAmount?.amount;
          return resolveAmount(subtotal, itemSubtotal);
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
        cartOwnerId: state.cartOwnerId,
        metadataByMerchandiseId: state.metadataByMerchandiseId,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<CartState> | undefined),
      }),
    }
  )
);
