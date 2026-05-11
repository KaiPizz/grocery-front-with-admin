import { create } from 'zustand';

type MobileHeaderVisibleSetter = boolean | ((current: boolean) => boolean);

interface MobileChromeState {
  mobileHeaderVisible: boolean;
  setMobileHeaderVisible: (next: MobileHeaderVisibleSetter) => void;
}

/**
 * Tiny UI store for mobile chrome state. Currently drives the Header's
 * hide-on-scroll + idle-cycle visibility on mobile. Kept separate from
 * cart/auth/wishlist so its frequent scroll-driven updates don't widen
 * subscriptions on the larger stores. Setter mirrors React's useState
 * signature so it stays a drop-in replacement for the previous local state.
 */
export const useMobileChromeStore = create<MobileChromeState>((set) => ({
  mobileHeaderVisible: true,
  setMobileHeaderVisible: (next) =>
    set((state) => ({
      mobileHeaderVisible:
        typeof next === 'function' ? next(state.mobileHeaderVisible) : next,
    })),
}));
