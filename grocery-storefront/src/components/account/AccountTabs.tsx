'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserRound, Package, MapPin, Shield } from 'lucide-react';
import { ProfilePanel } from '@/components/account/ProfilePanel';
import { OrdersPanel } from '@/components/account/OrdersPanel';
import { AddressesPanel } from '@/components/account/AddressesPanel';
import { SecurityPanel } from '@/components/account/SecurityPanel';

export type AccountTab = 'profile' | 'orders' | 'addresses' | 'security';

const TABS: { id: AccountTab; icon: typeof UserRound }[] = [
  { id: 'profile', icon: UserRound },
  { id: 'orders', icon: Package },
  { id: 'addresses', icon: MapPin },
  { id: 'security', icon: Shield },
];

export const ACCOUNT_TAB_PARAM = 'tab';

function resolveTab(value: string | null | undefined): AccountTab | null {
  return TABS.some((t) => t.id === value) ? (value as AccountTab) : null;
}

/**
 * The active tab lives in `?tab=` so the Next router re-renders on every
 * navigation: header links are soft navigations that never fire `hashchange`,
 * which is why a hash-only URL left the panel stuck. `#orders`-style links from
 * older e-mails and bookmarks still resolve as a fallback.
 */
export function AccountTabs() {
  const tAccount = useTranslations('account');
  const searchParams = useSearchParams();
  const requestedTab = resolveTab(searchParams.get(ACCOUNT_TAB_PARAM));
  const [hashTab, setHashTab] = useState<AccountTab | null>(null);
  const [clickedTab, setClickedTab] = useState<AccountTab | null>(null);

  useEffect(() => {
    function readHash() {
      setHashTab(resolveTab(window.location.hash.replace('#', '')));
    }
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  // A navigation (header menu, back button) always wins over the last tab click.
  useEffect(() => {
    setClickedTab(null);
  }, [requestedTab]);

  const activeTab: AccountTab = clickedTab ?? requestedTab ?? hashTab ?? 'profile';

  const switchTab = useCallback((tab: AccountTab) => {
    setClickedTab(tab);
    window.history.replaceState(null, '', `${window.location.pathname}?${ACCOUNT_TAB_PARAM}=${tab}`);
  }, []);

  const tabLabelKey: Record<AccountTab, string> = {
    profile: 'tabProfile',
    orders: 'tabOrders',
    addresses: 'tabAddresses',
    security: 'tabSecurity',
  };

  return (
    <div>
      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl border p-1.5"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        role="tablist"
        aria-label={tAccount('title')}
      >
        {TABS.map(({ id, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              id={`tab-${id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              aria-label={tAccount(tabLabelKey[id])}
              onClick={() => switchTab(id)}
              className={
                'flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-fast sm:px-4 ' +
                (isActive ? 'shadow-sm' : 'hover:opacity-80')
              }
              style={
                isActive
                  ? { backgroundColor: 'var(--color-primary)', color: 'white' }
                  : { color: 'var(--color-muted-foreground)' }
              }
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{tAccount(tabLabelKey[id])}</span>
            </button>
          );
        })}
      </nav>

      <div
        className="mt-6"
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'profile' && <ProfilePanel />}
        {activeTab === 'orders' && <OrdersPanel />}
        {activeTab === 'addresses' && <AddressesPanel />}
        {activeTab === 'security' && <SecurityPanel />}
      </div>
    </div>
  );
}
