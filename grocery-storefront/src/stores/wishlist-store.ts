'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAuthToken } from '@/lib/auth';
import {
  WISHLIST_PRODUCT_FIELDS,
  WISHLIST_QUERY,
  WISHLIST_SYNC_MUTATION,
} from '@/lib/graphql/operations/grocery';
import { resolveChannel } from '@/lib/channel';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { useSalonStore } from '@/stores/salon-store';
import type { WishlistItem, WishlistServerItem } from '@/types';

interface WishlistState {
  items: WishlistItem[];
  guestItems: WishlistItem[];
  pendingSyncProductIds: string[] | null;
  source: 'guest' | 'server';
  serverStatus: 'unknown' | 'available' | 'unavailable';
  isLoading: boolean;
  initialized: boolean;
  loadWishlist: () => Promise<void>;
  syncGuestWishlist: (items?: WishlistItem[]) => Promise<boolean>;
  addItem: (item: Omit<WishlistItem, 'addedAt'>) => Promise<boolean>;
  removeItem: (productId: string) => Promise<boolean>;
  toggleItem: (item: Omit<WishlistItem, 'addedAt'>) => Promise<boolean>;
  hasItem: (productId: string) => boolean;
  clear: () => Promise<void>;
  resetLocal: () => void;
}

interface WishlistQueryResponse {
  wishlist: {
    items: WishlistServerItem[] | null;
  } | null;
}

interface WishlistSyncResponse {
  wishlistSync: {
    success: boolean;
    message: string | null;
    items: WishlistServerItem[] | null;
  } | null;
}

type WishlistSetter = (partial: Partial<WishlistState>) => void;

function setGuestWishlistState(
  set: WishlistSetter,
  items: WishlistItem[],
  serverStatus: WishlistState['serverStatus'] = 'unknown',
  pendingSyncProductIds: string[] | null = null
) {
  set({
    items,
    guestItems: items,
    pendingSyncProductIds,
    source: 'guest',
    serverStatus,
    initialized: true,
    isLoading: false,
  });
}

function isWishlistAuthUnavailable(message: string | null | undefined): boolean {
  const value = message?.toLowerCase() ?? '';
  return value.includes('auth') || value.includes('unauthorized') || value.includes('authentication required');
}

function getCurrentChannel(): string {
  return resolveChannel(useSalonStore.getState().salonSlug);
}

function upsertWishlistItem(
  items: WishlistItem[],
  item: Omit<WishlistItem, 'addedAt'>
): WishlistItem[] {
  const existing = items.find((entry) => entry.productId === item.productId);

  if (existing) {
    return items.map((entry) =>
      entry.productId === item.productId
        ? { ...entry, ...item, addedAt: existing.addedAt }
        : entry
    );
  }

  return [...items, { ...item, addedAt: new Date().toISOString() }];
}

function removeWishlistItem(items: WishlistItem[], productId: string): WishlistItem[] {
  return items.filter((item) => item.productId !== productId);
}

function getWishlistProductIds<T extends { productId: string }>(items: T[]): string[] {
  return Array.from(new Set(items.map((item) => item.productId).filter(Boolean)));
}

function sameWishlistProductIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;

  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function buildWishlistProductsQuery(productIds: string[]) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      query: '',
      variables: {},
    };
  }

  const variableDefinitions = uniqueIds
    .map((_, index) => `$id${index}: ID!`)
    .join(', ');

  const selections = uniqueIds
    .map(
      (_, index) => `
        product${index}: product(channel: $channel, id: $id${index}) {
          ...WishlistProductFields
        }
      `
    )
    .join('\n');

  const variables: Record<string, unknown> = { channel: getCurrentChannel() };
  uniqueIds.forEach((id, index) => {
    variables[`id${index}`] = id;
  });

  return {
    query: `
      ${WISHLIST_PRODUCT_FIELDS}
      query WishlistProducts($channel: String!, ${variableDefinitions}) {
        ${selections}
      }
    `,
    variables,
  };
}

async function fetchWishlistProducts(productIds: string[]) {
  const { query, variables } = buildWishlistProductsQuery(productIds);

  if (!query) {
    return {} as Record<string, any>;
  }

  const response = await graphqlRequest<Record<string, any>>(query, variables);
  const message = getGraphqlErrorMessage(response.errors);
  if (message) {
    throw new Error(message);
  }

  return Object.values(response.data ?? {}).reduce<Record<string, any>>((acc, product: any) => {
    if (product?.id) {
      acc[product.id] = product;
    }

    return acc;
  }, {});
}

async function hydrateWishlistItems(
  serverItems: WishlistServerItem[],
  cachedItems: WishlistItem[]
): Promise<WishlistItem[]> {
  if (serverItems.length === 0) return [];

  const productMap = await fetchWishlistProducts(serverItems.map((item) => item.productId));
  const fallbackCurrency = useSalonStore.getState().salon?.currency ?? 'PLN';

  return serverItems.map((serverItem) => {
    const product = productMap[serverItem.productId];
    const cachedItem = cachedItems.find((item) => item.productId === serverItem.productId);
    const variant = product?.variants?.find((entry: any) => entry.id === serverItem.variantId)
      ?? product?.variants?.[0];

    const price = variant?.pricing?.price?.gross?.amount
      ?? product?.pricing?.priceRange?.start?.gross?.amount
      ?? cachedItem?.price
      ?? serverItem.price
      ?? 0;

    const currency = variant?.pricing?.price?.gross?.currency
      ?? product?.pricing?.priceRange?.start?.gross?.currency
      ?? cachedItem?.currency
      ?? fallbackCurrency;

    return {
      productId: serverItem.productId,
      variantId: variant?.id ?? serverItem.variantId ?? cachedItem?.variantId ?? '',
      slug: product?.slug ?? cachedItem?.slug,
      name: product?.name ?? cachedItem?.name ?? serverItem.name ?? 'Saved item',
      thumbnail: product?.thumbnail?.url ?? cachedItem?.thumbnail,
      price,
      currency,
      quantity: cachedItem?.quantity ?? 1,
      storageZone: product?.storageZone ?? cachedItem?.storageZone,
      addedAt: serverItem.addedAt ?? cachedItem?.addedAt ?? new Date().toISOString(),
    };
  });
}

async function syncServerWishlist(nextGuestItems: WishlistItem[], set: WishlistSetter): Promise<boolean> {
  const productIds = getWishlistProductIds(nextGuestItems);
  const response = await graphqlRequest<WishlistSyncResponse>(WISHLIST_SYNC_MUTATION, { productIds });
  const topLevelMessage = getGraphqlErrorMessage(response.errors);
  const payload = response.data?.wishlistSync;
  const message = topLevelMessage ?? payload?.message ?? null;

  if (isWishlistAuthUnavailable(message)) {
    setGuestWishlistState(set, nextGuestItems, 'unavailable');
    return true;
  }

  if (topLevelMessage || !payload) {
    throw new Error(message ?? 'Wishlist sync failed');
  }

  if (!payload.success) {
    if (isWishlistAuthUnavailable(payload.message)) {
      setGuestWishlistState(set, nextGuestItems, 'unavailable');
      return true;
    }

    throw new Error(payload.message ?? 'Wishlist sync failed');
  }

  if (!payload.items) {
    setGuestWishlistState(set, nextGuestItems, 'unavailable');
    return true;
  }

  // If the backend accepted the sync (success) but returned no items while we
  // sent product IDs, the server didn't persist them yet.  Keep the local
  // items so the UI isn't cleared and mark the server as available.
  if (payload.items.length === 0 && productIds.length > 0) {
    set({
      items: nextGuestItems,
      guestItems: nextGuestItems,
      pendingSyncProductIds: productIds,
      source: 'guest',
      serverStatus: 'available',
      initialized: true,
      isLoading: false,
    });
    return true;
  }

  const responseProductIds = getWishlistProductIds(payload.items);

  if (!sameWishlistProductIds(responseProductIds, productIds)) {
    set({
      items: nextGuestItems,
      guestItems: nextGuestItems,
      pendingSyncProductIds: productIds,
      source: 'guest',
      serverStatus: 'available',
      initialized: true,
      isLoading: false,
    });
    return true;
  }

  try {
    const hydratedItems = await hydrateWishlistItems(payload.items, nextGuestItems);
    set({
      items: hydratedItems,
      guestItems: hydratedItems,
      pendingSyncProductIds: null,
      source: 'server',
      serverStatus: 'available',
      initialized: true,
      isLoading: false,
    });
  } catch {
    setGuestWishlistState(set, nextGuestItems, 'unavailable', productIds);
  }

  return true;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      guestItems: [],
      pendingSyncProductIds: null,
      source: 'guest',
      serverStatus: 'unknown',
      isLoading: false,
      initialized: false,

      loadWishlist: async () => {
        const token = getAuthToken();

        if (!token) {
          setGuestWishlistState(set, get().guestItems);
          return;
        }

        if (get().serverStatus === 'unavailable') {
          setGuestWishlistState(set, get().guestItems, 'unavailable');
          return;
        }

        set({ isLoading: true, initialized: true });

        try {
          const response = await graphqlRequest<WishlistQueryResponse>(WISHLIST_QUERY, undefined, { token });
          const message = getGraphqlErrorMessage(response.errors);

          if (isWishlistAuthUnavailable(message)) {
            setGuestWishlistState(set, get().guestItems, 'unavailable');
            return;
          }

          if (message) {
            throw new Error(message);
          }

          const serverItems = response.data?.wishlist?.items;

          if (serverItems == null) {
            setGuestWishlistState(set, get().guestItems, 'unavailable');
            return;
          }
          const currentGuestItems = get().guestItems;
          const currentGuestProductIds = getWishlistProductIds(currentGuestItems);
          const serverProductIds = getWishlistProductIds(serverItems);
          const pendingSyncProductIds = get().pendingSyncProductIds;

          if (
            pendingSyncProductIds !== null
            && !sameWishlistProductIds(serverProductIds, pendingSyncProductIds)
          ) {
            set({
              items: currentGuestItems,
              guestItems: currentGuestItems,
              pendingSyncProductIds,
              source: 'guest',
              serverStatus: 'available',
              isLoading: false,
              initialized: true,
            });
            return;
          }

          // Server returned an empty wishlist but we have local items — keep
          // the local items so they aren't cleared while the backend isn't
          // persisting yet, and try to sync them up.
          if (serverItems.length === 0 && currentGuestItems.length > 0) {
            set({
              items: currentGuestItems,
              guestItems: currentGuestItems,
              pendingSyncProductIds: currentGuestProductIds,
              source: 'guest',
              serverStatus: 'available',
              isLoading: false,
              initialized: true,
            });
            return;
          }

          const hydratedItems = await hydrateWishlistItems(serverItems, get().guestItems);

          set({
            items: hydratedItems,
            guestItems: hydratedItems,
            pendingSyncProductIds: null,
            source: 'server',
            serverStatus: 'available',
            isLoading: false,
            initialized: true,
          });
        } catch {
          setGuestWishlistState(set, get().guestItems, 'unavailable');
        }
      },

      syncGuestWishlist: async (items) => {
        const nextGuestItems = items ?? get().guestItems;
        const token = getAuthToken();

        if (!token) {
          setGuestWishlistState(set, nextGuestItems);
          return true;
        }

        if (get().serverStatus === 'unavailable') {
          setGuestWishlistState(set, nextGuestItems, 'unavailable');
          return true;
        }

        set({
          items: nextGuestItems,
          guestItems: nextGuestItems,
          pendingSyncProductIds: getWishlistProductIds(nextGuestItems),
          source: 'guest',
          isLoading: true,
          initialized: true,
        });

        try {
          return await syncServerWishlist(nextGuestItems, set);
        } catch {
          setGuestWishlistState(set, nextGuestItems, 'unavailable', getWishlistProductIds(nextGuestItems));
          return true;
        }
      },

      addItem: async (item) => {
        const nextGuestItems = upsertWishlistItem(get().guestItems, item);
        const nextProductIds = getWishlistProductIds(nextGuestItems);
        const hasToken = Boolean(getAuthToken());
        const canUseServer = hasToken && get().serverStatus !== 'unavailable';

        set({
          items: nextGuestItems,
          guestItems: nextGuestItems,
          pendingSyncProductIds: canUseServer ? nextProductIds : null,
          source: 'guest',
          initialized: true,
        });

        if (!canUseServer) {
          return true;
        }

        try {
          return await syncServerWishlist(nextGuestItems, set);
        } catch {
          setGuestWishlistState(set, nextGuestItems, 'unavailable', nextProductIds);
          return true;
        }
      },

      removeItem: async (productId) => {
        const nextGuestItems = removeWishlistItem(get().guestItems, productId);
        const nextProductIds = getWishlistProductIds(nextGuestItems);
        const hasToken = Boolean(getAuthToken());
        const canUseServer = hasToken && get().serverStatus !== 'unavailable';

        set({
          items: removeWishlistItem(get().items, productId),
          guestItems: nextGuestItems,
          pendingSyncProductIds: canUseServer ? nextProductIds : null,
          source: 'guest',
          initialized: true,
        });

        if (!canUseServer) {
          return true;
        }

        try {
          return await syncServerWishlist(nextGuestItems, set);
        } catch {
          setGuestWishlistState(set, nextGuestItems, 'unavailable', nextProductIds);
          return true;
        }
      },

      toggleItem: async (item) => {
        if (get().hasItem(item.productId)) {
          return get().removeItem(item.productId);
        }

        return get().addItem(item);
      },

      hasItem: (productId) => get().items.some((item) => item.productId === productId),

      clear: async () => {
        const hasToken = Boolean(getAuthToken());
        const canUseServer = hasToken && get().serverStatus !== 'unavailable';
        const emptyItems: WishlistItem[] = [];

        set({
          items: emptyItems,
          guestItems: emptyItems,
          pendingSyncProductIds: canUseServer ? [] : null,
          source: 'guest',
          initialized: true,
        });

        if (!canUseServer) return;

        try {
          await syncServerWishlist(emptyItems, set);
        } catch {
          setGuestWishlistState(set, get().guestItems, 'unavailable', []);
        }
      },

      resetLocal: () => {
        setGuestWishlistState(set, []);
      },
    }),
    {
      name: 'grocery-wishlist',
      partialize: (state) => ({
        guestItems: state.guestItems,
        pendingSyncProductIds: state.pendingSyncProductIds,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<WishlistState> & { items?: WishlistItem[] } | undefined;
        const guestItems = persisted?.guestItems ?? persisted?.items ?? [];
        const pendingSyncProductIds = persisted?.pendingSyncProductIds ?? null;

        return {
          ...currentState,
          guestItems,
          items: guestItems,
          pendingSyncProductIds,
          source: 'guest',
          serverStatus: 'unknown',
          initialized: false,
          isLoading: false,
        };
      },
    }
  )
);
