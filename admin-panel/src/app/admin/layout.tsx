'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Palette,
  LayoutDashboard,
  PanelTop,
  BarChart3,
  Search,
  Settings,
  Menu,
  X,
  Home,
  LogOut,
  ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage, LangSwitcher } from '@/i18n';
import { getClientSalonSlug } from '@/lib/client-config';
import { toast } from 'sonner';

const SALON_SLUG = getClientSalonSlug();

const NAV_HREFS = [
  { href: '/admin', key: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/admin/branding', key: 'nav.branding', icon: Palette },
  { href: '/admin/homepage', key: 'nav.homepage', icon: Home },
  { href: '/admin/layout-config', key: 'nav.layout', icon: PanelTop },
  { href: '/admin/tracking', key: 'nav.tracking', icon: BarChart3 },
  { href: '/admin/seo', key: 'nav.seo', icon: Search },
  { href: '/admin/general', key: 'nav.general', icon: Settings },
  { href: '/admin/media', key: 'nav.media', icon: ImageIcon },
];

const SECURITY_NAV = {
  href: '/admin/security',
  key: 'nav.security',
  icon: ShieldCheck,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { t } = useLanguage();
  const salonSlug = SALON_SLUG;
  const activeNav = [...NAV_HREFS, SECURITY_NAV].find(({ href }) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Logout failed');
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error(t('common.signOutFailed'));
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-slate-950 text-slate-100
          transform transition-transform duration-200 ease-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950">
              <PanelTop className="h-4 w-4" />
            </div>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-white">
                {t('login.title')}
              </span>
              <span className="block truncate text-[11px] text-slate-400">
                {salonSlug}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('common.closeNavigation')}
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_HREFS.map(({ href, key, icon: Icon }) => {
            const isActive = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-[background-color,color,box-shadow] duration-150
                  ${isActive
                    ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer with logout */}
        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href={SECURITY_NAV.href}
            onClick={() => setSidebarOpen(false)}
            aria-current={pathname.startsWith(SECURITY_NAV.href) ? 'page' : undefined}
            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
              pathname.startsWith(SECURITY_NAV.href)
                ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{t(SECURITY_NAV.key)}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{loggingOut ? t('common.signingOut') : t('common.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('common.openNavigation')}
            aria-controls="admin-sidebar"
            aria-expanded={sidebarOpen}
            className="rounded-md p-2 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {activeNav ? t(activeNav.key) : t('login.title')}
            </p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {t('dashboard.description')}
            </p>
          </div>
          <LangSwitcher />
          <span className="hidden items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 sm:inline-flex">
            Slug: <code className="ml-1 font-mono text-slate-800">{salonSlug}</code>
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-100 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
