'use client';

import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/i18n';
import { Palette, Home, PanelTop, BarChart3, Search, Settings, Loader2, Image, Radio, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

const SECTION_DEFS = [
  { href: '/admin/branding', navKey: 'nav.branding', icon: Palette, descKey: 'branding.description' },
  { href: '/admin/homepage', navKey: 'nav.homepage', icon: Home, descKey: 'homepage.description' },
  { href: '/admin/layout-config', navKey: 'nav.layout', icon: PanelTop, descKey: 'layout.description' },
  { href: '/admin/tracking', navKey: 'nav.tracking', icon: BarChart3, descKey: 'tracking.description' },
  { href: '/admin/seo', navKey: 'nav.seo', icon: Search, descKey: 'seo.description' },
  { href: '/admin/general', navKey: 'nav.general', icon: Settings, descKey: 'general.description' },
];

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
  );
}

export default function DashboardPage() {
  const { config, loading, lastSaved, error } = useConfig();
  const { t } = useLanguage();

  const activeBanners = config.homepage.promoBanners.filter(b => b.enabled).length;
  const totalBanners = config.homepage.promoBanners.length;
  const enabledSections = config.homepage.sections.filter(s => s.enabled).length;
  const totalSections = config.homepage.sections.length;
  const trackingServices = [
    { name: 'Facebook Pixel', on: config.tracking.facebookPixel.enabled },
    { name: 'Google Analytics', on: config.tracking.googleAnalytics.enabled },
    { name: 'Google Tag Manager', on: config.tracking.googleTagManager.enabled },
    { name: 'Hotjar', on: config.tracking.hotjar.enabled },
  ];
  const activeTracking = trackingServices.filter(s => s.on).length;
  const hasLogo = !!config.branding.logoUrl;
  const heroEnabled = config.homepage.hero.enabled;

  return (
    <div>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loadingConfig')}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.banners')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeBanners}<span className="text-sm font-normal text-gray-400">/{totalBanners}</span></p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('dashboard.active')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.sections')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{enabledSections}<span className="text-sm font-normal text-gray-400">/{totalSections}</span></p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('dashboard.enabled')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.tracking')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeTracking}<span className="text-sm font-normal text-gray-400">/4</span></p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('dashboard.servicesActive')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.lastUpdate')}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {lastSaved ? new Date(lastSaved).toLocaleDateString() : '—'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {lastSaved ? new Date(lastSaved).toLocaleTimeString() : t('dashboard.never')}
          </p>
        </div>
      </div>

      {/* Quick Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.quickStatus')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            {hasLogo ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
            <span className="text-xs text-gray-600">{t('dashboard.logoUploaded')}</span>
          </div>
          <div className="flex items-center gap-2">
            {heroEnabled ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
            <span className="text-xs text-gray-600">{t('dashboard.heroBanner')}</span>
          </div>
          {trackingServices.map(s => (
            <div key={s.name} className="flex items-center gap-2">
              <StatusDot active={s.on} />
              <span className="text-xs text-gray-600">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Config Sections */}
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.configuration')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTION_DEFS.map(({ href, navKey, icon: Icon, descKey }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-gray-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Icon className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{t(navKey)}</h3>
            </div>
            <p className="text-xs text-gray-500">{t(descKey)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
