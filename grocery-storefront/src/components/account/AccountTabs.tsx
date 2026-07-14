'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { UserRound, Package, MapPin, Shield } from 'lucide-react';
import { ProfilePanel } from '@/components/account/ProfilePanel';
import { OrdersPanel } from '@/components/account/OrdersPanel';
import { AddressesPanel } from '@/components/account/AddressesPanel';

export type AccountTab = 'profile' | 'orders' | 'addresses' | 'security';

const TABS: { id: AccountTab; icon: typeof UserRound }[] = [
  { id: 'profile', icon: UserRound },
  { id: 'orders', icon: Package },
  { id: 'addresses', icon: MapPin },
  { id: 'security', icon: Shield },
];

function getHashTab(): AccountTab {
  const hash = window.location.hash.replace('#', '') as AccountTab;
  return TABS.some((t) => t.id === hash) ? hash : 'profile';
}

export function AccountTabs() {
  const tAccount = useTranslations('account');
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  useEffect(() => {
    setActiveTab(getHashTab());
    function onHashChange() {
      setActiveTab(getHashTab());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const switchTab = useCallback((tab: AccountTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
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
        {activeTab === 'security' && <SecurityPlaceholder />}
      </div>
    </div>
  );
}

function SecurityPlaceholder() {
  const tAccount = useTranslations('account');
  return (
    <section
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
        >
          <Shield className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('securityTitle')}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('securityDescription')}
          </p>
          <span
            className="inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
          >
            {tAccount('status')}
          </span>
        </div>
      </div>
    </section>
  );
}
