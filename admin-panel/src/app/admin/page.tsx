'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Clock,
  Home,
  Image as ImageIcon,
  Loader2,
  Palette,
  PanelTop,
  Radio,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { useConfig } from '@/hooks/use-config';
import { useLanguage } from '@/i18n';
import { getAdminReadiness } from '@/lib/admin-readiness';

import type { SetupSection, SetupSectionState } from '@/lib/admin-readiness';

const SECTION_DEFS = [
  { href: '/admin/branding', navKey: 'nav.branding', icon: Palette, descKey: 'branding.description' },
  { href: '/admin/homepage', navKey: 'nav.homepage', icon: Home, descKey: 'homepage.description' },
  { href: '/admin/layout-config', navKey: 'nav.layout', icon: PanelTop, descKey: 'layout.description' },
  { href: '/admin/tracking', navKey: 'nav.tracking', icon: BarChart3, descKey: 'tracking.description' },
  { href: '/admin/seo', navKey: 'nav.seo', icon: Search, descKey: 'seo.description' },
  { href: '/admin/general', navKey: 'nav.general', icon: Settings, descKey: 'general.description' },
];

const SETUP_ICON_BY_SECTION = {
  branding: Palette,
  homepage: Home,
  layout: PanelTop,
  general: Settings,
  seo: Search,
  tracking: BarChart3,
} as const;

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
  );
}

function getSetupDescriptionKey(section: SetupSection): string {
  if (section.id === 'branding' && section.state === 'recommended') {
    return 'dashboard.setupSections.branding.recommended';
  }
  if (section.id === 'homepage' && section.state === 'blocking') {
    return 'dashboard.setupSections.homepage.blocking';
  }
  if (section.id === 'general' && section.state === 'recommended') {
    return 'dashboard.setupSections.general.recommended';
  }
  if (section.id === 'seo' && section.state === 'recommended') {
    return 'dashboard.setupSections.seo.recommended';
  }
  if (section.id === 'tracking' && section.state === 'blocking') {
    return 'dashboard.setupSections.tracking.blocking';
  }
  if (section.id === 'tracking' && section.state === 'optional') {
    return 'dashboard.setupSections.tracking.optional';
  }

  return `dashboard.setupSections.${section.id}.complete`;
}

function getSetupStateLabelKey(state: SetupSectionState): string {
  switch (state) {
    case 'blocking':
      return 'dashboard.state.required';
    case 'recommended':
      return 'dashboard.state.recommended';
    case 'optional':
      return 'dashboard.state.optional';
    case 'complete':
      return 'dashboard.state.complete';
  }
}

function getSetupStateStyles(state: SetupSectionState): string {
  switch (state) {
    case 'blocking':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'recommended':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'optional':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'complete':
      return 'border-green-200 bg-green-50 text-green-700';
  }
}

function getSetupStateIcon(state: SetupSectionState) {
  switch (state) {
    case 'blocking':
      return AlertCircle;
    case 'recommended':
    case 'optional':
      return CircleDashed;
    case 'complete':
      return CheckCircle2;
  }
}

export default function DashboardPage() {
  const { config, loading, publishing, lastSaved, error, publish } = useConfig();
  const { t } = useLanguage();

  const activeBanners = config.homepage.promoBanners.filter((banner) => banner.enabled).length;
  const totalBanners = config.homepage.promoBanners.length;
  const enabledSections = config.homepage.sections.filter((section) => section.enabled).length;
  const totalSections = config.homepage.sections.length;
  const trackingServices = [
    { name: 'Facebook Pixel', on: config.tracking.facebookPixel.enabled },
    { name: 'Google Analytics', on: config.tracking.googleAnalytics.enabled },
    { name: 'Google Tag Manager', on: config.tracking.googleTagManager.enabled },
    { name: 'Hotjar', on: config.tracking.hotjar.enabled },
  ];
  const activeTracking = trackingServices.filter((service) => service.on).length;
  const hasLogo = !!config.branding.logoUrl;
  const heroEnabled = config.homepage.hero.enabled;
  const readiness = getAdminReadiness(config);
  const hasRecommendations = readiness.recommendedIssues.length > 0;
  const setupTitle = readiness.canPublish
    ? hasRecommendations
      ? t('dashboard.readyWithRecommendationsTitle')
      : t('dashboard.readyTitle')
    : t('dashboard.blockedTitle');
  const setupDescription = readiness.canPublish
    ? hasRecommendations
      ? t('dashboard.readyWithRecommendationsDescription')
      : t('dashboard.readyDescription')
    : t('dashboard.blockedDescription');

  async function handlePublish() {
    try {
      await publish();
    } catch {
      // `useConfig().publish()` already exposes the visible error and toast.
    }
  }

  return (
    <div>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />

      {loading && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loadingConfig')}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <>
          <section
            className={`mb-6 rounded-xl border p-5 ${
              readiness.canPublish ? 'border-green-200 bg-green-50/70' : 'border-red-200 bg-red-50/70'
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    readiness.canPublish ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {readiness.canPublish ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">{t('dashboard.setupTitle')}</p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">{setupTitle}</h2>
                  <p className="mt-1 text-sm text-gray-600">{setupDescription}</p>
                </div>
              </div>

              {readiness.canPublish ? (
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={publishing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {publishing ? t('common.publishing') : t('dashboard.publishStorefront')}
                </button>
              ) : readiness.firstBlockingSection ? (
                <Link
                  href={readiness.firstBlockingSection.href}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  {t('dashboard.continueSetup')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </section>

          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('dashboard.checklist')}</h3>
            <div className="divide-y divide-gray-100">
              {readiness.sections.map((section) => {
                const Icon = SETUP_ICON_BY_SECTION[section.id];
                const StateIcon = getSetupStateIcon(section.state);
                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{t(`nav.${section.id === 'layout' ? 'layout' : section.id}`)}</p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getSetupStateStyles(
                            section.state
                          )}`}
                        >
                          <StateIcon className="h-3 w-3" />
                          {t(getSetupStateLabelKey(section.state))}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">{t(getSetupDescriptionKey(section))}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Status Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.banners')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {activeBanners}
            <span className="text-sm font-normal text-gray-400">/{totalBanners}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">{t('dashboard.active')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Radio className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.sections')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {enabledSections}
            <span className="text-sm font-normal text-gray-400">/{totalSections}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">{t('dashboard.enabled')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.tracking')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {activeTracking}
            <span className="text-sm font-normal text-gray-400">/4</span>
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">{t('dashboard.servicesActive')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('dashboard.lastUpdate')}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {lastSaved ? new Date(lastSaved).toLocaleDateString() : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {lastSaved ? new Date(lastSaved).toLocaleTimeString() : t('dashboard.never')}
          </p>
        </div>
      </div>

      {/* Quick Status */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('dashboard.quickStatus')}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            {hasLogo ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
            <span className="text-xs text-gray-600">{t('dashboard.logoUploaded')}</span>
          </div>
          <div className="flex items-center gap-2">
            {heroEnabled ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
            <span className="text-xs text-gray-600">{t('dashboard.heroBanner')}</span>
          </div>
          {trackingServices.map((service) => (
            <div key={service.name} className="flex items-center gap-2">
              <StatusDot active={service.on} />
              <span className="text-xs text-gray-600">{service.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Config Sections */}
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('dashboard.configuration')}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTION_DEFS.map(({ href, navKey, icon: Icon, descKey }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-sm"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 transition-colors group-hover:bg-indigo-100">
                <Icon className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{t(navKey)}</h3>
            </div>
            <p className="text-xs text-gray-500">{t(descKey)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
