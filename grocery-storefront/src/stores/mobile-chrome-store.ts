import { create } from 'zustand';

type MobileHeaderVisibleSetter = boolean | ((current: boolean) => boolean);

interface MobileChromeState {
  mobileHeaderVisible: boolean;
  setMobileHeaderVisible: (next: MobileHeaderVisibleSetter) => void;
}

/**
 * Tiny UI store for mobile chrome state shared across Header + floating chrome
 * components (e.g. MobileFloatingCart). Kept separate from cart/auth/wishlist
 * so its frequent updates (scroll-driven) don't widen subscriptions on the
 * larger stores.
 *
 * Setter mirrors React's useState signature so it's a drop-in replacement for
 * the previous local state in Header.tsx.
 */
export const useMobileChromeStore = create<MobileChromeState>((set) => ({
  mobileHeaderVisible: true,
  setMobileHeaderVisible: (next) =>
    set((state) => ({
      mobileHeaderVisible:
        typeof next === 'function' ? next(state.mobileHeaderVisible) : next,
    })),
}));
