'use client';

import { useTranslations } from 'next-intl';
import { Leaf } from 'lucide-react';
import { SocialBar } from '@/components/layout/SocialBar';
import { Link } from '@/i18n/navigation';
import { useStorefrontConfig } from '@/components/ConfigProvider';

export function Footer() {
  const tNav = useTranslations('nav');
  const t = useTranslations('footer');
  const siteConfig = useStorefrontConfig();

  const storeName = siteConfig?.branding?.storeName || 'Grocery';
  const logoUrl = siteConfig?.branding?.logoUrl;
  const footerCfg = siteConfig?.layout?.footer;
  const tagline = footerCfg?.tagline || t('tagline');
  const socialLinks = siteConfig?.general?.socialLinks ?? [];
  const copyrightText = (footerCfg?.copyrightText || `\u00A9 {year} ${storeName}. Powered by Zira AI.`).replace('{year}', String(new Date().getFullYear()));

  // Map known footer labels to i18n translations so config doesn't force English
  const footerI18n: Record<string, string> = {
    'Shop': t('shop'), 'Info': t('info'), 'Legal': t('legal'),
    'Products': tNav('products'), 'Recipes': tNav('recipes'),
    'About': t('about'), 'Contact': t('contact'), 'Delivery': t('delivery'),
    'Privacy': t('privacy'), 'Terms': t('terms'),
  };
  const tr = (label: string) => footerI18n[label] || label;

  const columns = footerCfg?.columns?.map(col => ({
    ...col,
    title: tr(col.title),
    links: col.links.map(link => ({ ...link, label: tr(link.label) })),
  }));

  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      role="contentinfo"
    >
      <div className="container-grocery py-12 md:py-16">
        <div className={`grid grid-cols-2 gap-8 md:gap-12 ${columns ? `md:grid-cols-${Math.min(columns.length + 1, 4)}` : 'md:grid-cols-4'}`}>
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-9 w-auto rounded-xl" />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Leaf className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
              )}
              <span className="font-display font-bold text-lg tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                {storeName}
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {tagline}
            </p>
            <SocialBar links={socialLinks} />
          </div>

          {columns ? (
            columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="heading-section text-sm mb-4" style={{ color: 'var(--color-foreground)' }}>{col.title}</h3>
                <ul className="space-y-2.5" role="list">
                  {col.links.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      <Link href={link.href} className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))
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
                  <li><Link href="#" className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>{t('about')}</Link></li>
                  <li><Link href="#" className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>{t('contact')}</Link></li>
                  <li><Link href="#" className="text-sm transition-colors duration-fast hover:text-primary" style={{ color: 'var(--color-muted-foreground)' }}>{t('delivery')}</Link></li>
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

        <div className="mt-10 pt-6 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
}
