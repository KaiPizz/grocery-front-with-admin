'use client';

/* eslint-disable @next/next/no-img-element -- Runtime-configured storefront logos can use arbitrary URLs until the production media loader policy is defined. */

import { useLocale, useTranslations } from 'next-intl';
import { Banknote, CheckCircle2, Leaf, Mail, MapPin, Phone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SocialBar } from '@/components/layout/SocialBar';
import { Link } from '@/i18n/navigation';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import {
  getConfiguredText,
  getFulfillmentConfig,
  isPickupFulfillment,
  usesAvailabilityOnlyStock,
  usesBankTransferPromise,
} from '@/lib/fulfillment';

interface FooterServiceNote {
  label: string;
  icon: LucideIcon;
}

interface FooterContactItem {
  label: string;
  href?: string;
  icon: LucideIcon;
}

export function Footer() {
  const locale = useLocale();
  const tNav = useTranslations('nav');
  const t = useTranslations('footer');
  const tFulfillment = useTranslations('fulfillment');
  const siteConfig = useStorefrontConfig();

  const storeName = siteConfig?.branding?.storeName || 'Grocery';
  const logoUrl = siteConfig?.branding?.logoUrl;
  const logoText = logoUrl && storeName.trim().toLowerCase() === 'asia deli go' ? '' : storeName;
  const footerCfg = siteConfig?.layout?.footer;
  const configuredTagline = footerCfg?.tagline?.trim();
  const normalizedStoreName = storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const isAsiaDeliGo = normalizedStoreName === 'asiadeligo' || normalizedStoreName === 'asiandeligo';
  const tagline = locale === 'en' && isAsiaDeliGo
    ? t('asiaDeliGoTagline')
    : configuredTagline || t('tagline');
  const socialLinks = siteConfig?.general?.socialLinks ?? [];
  const fulfillment = getFulfillmentConfig(siteConfig);
  const pickupMode = isPickupFulfillment(siteConfig);
  const bankTransferMode = usesBankTransferPromise(siteConfig);
  const availabilityOnlyStock = usesAvailabilityOnlyStock(siteConfig);
  const policyLinks = siteConfig?.general?.policyLinks;
  const copyrightText = (footerCfg?.copyrightText || `\u00A9 {year} ${storeName}. Powered by Zira AI.`).replace('{year}', String(new Date().getFullYear()));

  // Map known footer labels to i18n translations so config doesn't force English
  const footerI18n: Record<string, string> = {
    'Shop': t('shop'), 'Sklep': t('shop'),
    'Info': t('info'), 'Informacje': t('info'),
    'Legal': t('legal'), 'Prawne': t('legal'),
    'Products': tNav('products'), 'Produkty': tNav('products'),
    'Recipes': tNav('recipes'), 'Przepisy': tNav('recipes'),
    'About': t('about'), 'O nas': t('about'),
    'Contact': t('contact'), 'Kontakt': t('contact'),
    'Delivery': t('delivery'), 'Dostawa': t('delivery'),
    'Privacy': t('privacy'), 'Polityka prywatności': t('privacy'),
    'Terms': t('terms'), 'Regulamin': t('terms'),
    'Korean pantry': tNav('koreanPantry'), 'Koreańska spiżarnia': tNav('koreanPantry'),
  };
  const tr = (label: string) => footerI18n[label.trim()] || label;
  const footerLinkI18n: Record<string, string> = {
    '/categories': tNav('categories'),
    '/products': tNav('products'),
    '/recipes': tNav('recipes'),
    '/collections/korean-pantry': tNav('koreanPantry'),
    '/privacy': t('privacy'),
    '/terms': t('terms'),
  };

  const columns = footerCfg?.columns?.length ? footerCfg.columns.map(col => ({
    ...col,
    title: tr(col.title),
    links: col.links.map(link => ({
      ...link,
      label: footerLinkI18n[link.href] || tr(link.label),
    })),
  })) : null;
  const serviceNotes: FooterServiceNote[] = [
    pickupMode
      ? {
          label: getConfiguredText(fulfillment.pickupInstructions, tFulfillment('pickupService')),
          icon: MapPin,
        }
      : null,
    bankTransferMode
      ? {
          label: getConfiguredText(fulfillment.bankTransferInstructions, tFulfillment('bankTransferService')),
          icon: Banknote,
        }
      : null,
    availabilityOnlyStock
      ? {
          label: tFulfillment('manualConfirmationShort'),
          icon: CheckCircle2,
        }
      : null,
  ].filter((item): item is FooterServiceNote => item !== null);
  const configuredEmail = siteConfig?.general?.email?.trim();
  const configuredPhone = siteConfig?.general?.phone?.trim();
  const configuredAddress = siteConfig?.general?.address?.trim();
  const email = configuredEmail && !(
    isAsiaDeliGo && configuredEmail.toLowerCase() === 'kontakt@asiandeligo.pl'
  ) ? configuredEmail : null;
  const phone = configuredPhone && !(
    isAsiaDeliGo && configuredPhone.replace(/\D/g, '') === '48000000000'
  ) ? configuredPhone : null;
  const address = configuredAddress && !(
    isAsiaDeliGo && configuredAddress.toLowerCase() === 'warszawa, polska'
  ) ? configuredAddress : null;
  const contactItems: FooterContactItem[] = [
    email
      ? { label: email, href: `mailto:${email}`, icon: Mail }
      : null,
    phone
      ? { label: phone, href: `tel:${phone}`, icon: Phone }
      : null,
    address
      ? { label: address, icon: MapPin }
      : null,
  ].filter((item): item is FooterContactItem => item !== null);
  const fallbackInfoLinks = [
    policyLinks?.about
      && policyLinks.about !== '#'
      && policyLinks.about !== policyLinks.privacy
      && policyLinks.about !== policyLinks.terms
      ? { href: policyLinks.about, label: t('about') }
      : null,
  ].filter((link): link is { href: string; label: string } => link !== null);
  const footerColumnCount = columns
    ? 1 + columns.length + (contactItems.length > 0 ? 1 : 0)
    : 4;
  const footerGridColumns = footerColumnCount <= 2
    ? 'md:grid-cols-2'
    : footerColumnCount === 3
      ? 'md:grid-cols-3'
      : 'md:grid-cols-4';
  const serviceGridColumns = serviceNotes.length === 2
    ? 'sm:grid-cols-2'
    : serviceNotes.length >= 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : '';

  function renderFooterLink(href: string, label: string) {
    if (!href || href === '#') {
      return (
        <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {label}
        </span>
      );
    }

    return (
      <Link href={href} className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>
        {label}
      </Link>
    );
  }

  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      role="contentinfo"
    >
      <div className="container-grocery py-12 md:py-16">
        <div className={`grid grid-cols-2 gap-8 md:gap-12 ${footerGridColumns}`}>
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-12 max-w-[8.5rem] w-auto rounded-lg object-contain" />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Leaf className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
              )}
              {logoText && (
                <span
                  className="font-display text-lg font-bold tracking-tight"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {logoText}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {tagline}
            </p>
            <SocialBar links={socialLinks} />
          </div>

          {columns ? (
            <>
              {columns.map((col) => (
                <nav key={col.title} aria-label={col.title}>
                  <h3 className="heading-section text-sm mb-4" style={{ color: 'var(--color-foreground)' }}>{col.title}</h3>
                  <ul className="space-y-2.5" role="list">
                    {col.links.map((link) => (
                      <li key={`${link.label}-${link.href}`}>
                        {renderFooterLink(link.href, link.label)}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
              {contactItems.length > 0 && (
                <nav aria-label={t('contact')}>
                  <h3 className="heading-section text-sm mb-4" style={{ color: 'var(--color-foreground)' }}>{t('contact')}</h3>
                  <ul className="space-y-2.5" role="list">
                    {contactItems.map(({ label, href, icon: Icon }) => (
                      <li key={label} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {href ? (
                          <a href={href} className="break-words transition-colors duration-fast hover:text-primary">
                            {label}
                          </a>
                        ) : (
                          <span className="break-words">{label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </>
          ) : (
            <>
              <nav aria-label={t('shop')}>
                <h3 className="heading-section text-sm mb-4" style={{ color: 'var(--color-foreground)' }}>{t('shop')}</h3>
                <ul className="space-y-2.5" role="list">
                  <li><Link href="/products" className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>{tNav('products')}</Link></li>
                  <li><Link href="/recipes" className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>{tNav('recipes')}</Link></li>
                </ul>
              </nav>
              <nav aria-label={t('info')}>
                <h3 className="heading-section text-sm mb-4" style={{ color: 'var(--color-foreground)' }}>{t('info')}</h3>
                <ul className="space-y-2.5" role="list">
                  {fallbackInfoLinks.map((link) => (
                    <li key={link.href}>{renderFooterLink(link.href, link.label)}</li>
                  ))}
                  {contactItems.map(({ label, href, icon: Icon }) => (
                    <li key={label} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {href ? (
                        <a href={href} className="break-words transition-colors duration-fast hover:text-primary">
                          {label}
                        </a>
                      ) : (
                        <span className="break-words">{label}</span>
                      )}
                    </li>
                  ))}
                  {fallbackInfoLinks.length === 0 && contactItems.length === 0 && serviceNotes.length === 0 && (
                    <li className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('catalogNote')}
                    </li>
                  )}
                </ul>
              </nav>
              <nav aria-label={t('legal')}>
                <h3 className="heading-section text-sm mb-4" style={{ color: 'var(--color-foreground)' }}>{t('legal')}</h3>
                <ul className="space-y-2.5" role="list">
                  <li><Link href="/privacy" className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>{t('privacy')}</Link></li>
                  <li><Link href="/terms" className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>{t('terms')}</Link></li>
                </ul>
              </nav>
            </>
          )}
        </div>

        {serviceNotes.length > 0 && (
          <div
            className={`mt-10 grid gap-px overflow-hidden rounded-[20px] border ${serviceGridColumns}`}
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-border)' }}
            data-testid="footer-service-notes"
          >
            {serviceNotes.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex min-h-16 items-center gap-3 px-4 py-3"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 94%, var(--color-accent))' }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium leading-snug" style={{ color: 'var(--color-foreground)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 pt-6 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
}
