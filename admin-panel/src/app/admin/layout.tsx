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
  Rocket,
  Home,
  LogOut,
  ImageIcon,
} from 'lucide-react';
import { useLanguage, LangSwitcher } from '@/i18n';

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { t } = useLanguage();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-indigo-950 text-indigo-100
          transform transition-transform duration-200 ease-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-indigo-900/50">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-white tracking-tight">
              Asia-Deli Admin
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-indigo-900/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_HREFS.map(({ href, key, icon: Icon }) => {
            const isActive = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-indigo-800/60 text-white'
                    : 'text-indigo-300 hover:bg-indigo-900/40 hover:text-white'}
                `}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span>{t(key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer with logout */}
        <div className="px-3 py-3 border-t border-indigo-900/50">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-300 hover:bg-indigo-900/40 hover:text-white transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{loggingOut ? t('common.signingOut') : t('common.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1" />
          <LangSwitcher />
          <span className="text-xs text-gray-400">
            Slug: <code className="font-mono text-indigo-600">{process.env.NEXT_PUBLIC_SALON_SLUG || 'my-grocery-store'}</code>
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
