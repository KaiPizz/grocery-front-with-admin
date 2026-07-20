import { ArrowLeft, Leaf, ShoppingBasket } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { fetchServerConfig, getConfigString } from '@/lib/storefront-config';

export default async function NotFoundPage() {
  const [requestLocale, siteConfig] = await Promise.all([
    getLocale(),
    fetchServerConfig(),
  ]);
  const locale = requestLocale === 'en' ? 'en' : 'pl';
  const t = await getTranslations({ locale, namespace: 'notFoundPage' });
  const storeName = getConfigString(siteConfig?.branding?.storeName) ?? 'Asia Deli Go';
  const logoUrl = getConfigString(siteConfig?.branding?.logoUrl);
  const homeHref = locale === 'en' ? '/en' : '/';
  const productsHref = locale === 'en' ? '/en/products' : '/products';

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center">
        <Link
          href={homeHref}
          className="inline-flex min-h-11 items-center gap-3 rounded-full px-2 transition-opacity hover:opacity-80"
          aria-label={t('brandHomeLabel', { storeName })}
        >
          {logoUrl ? (
            // Runtime logo hosts are tenant-configurable, so this intentionally remains a plain image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-11 max-w-[8.5rem] object-contain" />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
              aria-hidden="true"
            >
              <Leaf className="h-5 w-5" />
            </span>
          )}
          <span className="font-display text-lg font-bold" style={{ color: 'var(--color-foreground)' }}>
            {storeName}
          </span>
        </Link>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-6xl items-center py-8 sm:py-12">
        <section
          className="grid w-full overflow-hidden rounded-[2rem] border shadow-[0_24px_70px_-45px_rgba(15,92,42,0.55)] md:grid-cols-[1.15fr_0.85fr]"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-card)',
          }}
          aria-labelledby="not-found-title"
        >
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-20">
            <p
              className="mb-4 text-sm font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-primary)' }}
            >
              {t('eyebrow')}
            </p>
            <h1
              id="not-found-title"
              className="heading-display max-w-xl text-4xl sm:text-5xl lg:text-6xl"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('title')}
            </h1>
            <p
              className="mt-5 max-w-xl text-base leading-7 sm:text-lg"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              {t('description')}
            </p>

            <nav className="mt-8 flex flex-col gap-3 sm:flex-row" aria-label={t('actionsLabel')}>
              <Link
                href={homeHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t('home')}
              </Link>
              <Link
                href={productsHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-muted)]"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
                {t('products')}
              </Link>
            </nav>
          </div>

          <div
            className="relative hidden min-h-[24rem] items-center justify-center overflow-hidden md:flex"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 72%, var(--color-card))',
            }}
            aria-hidden="true"
            data-testid="not-found-illustration"
          >
            <div
              className="absolute -right-12 -top-16 h-56 w-56 rounded-full opacity-60"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 18%, transparent)' }}
            />
            <div
              className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full opacity-50"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)' }}
            />
            <span
              className="relative font-display text-[9rem] font-bold leading-none tracking-[-0.08em] lg:text-[11rem]"
              style={{ color: 'color-mix(in srgb, var(--color-primary) 72%, var(--color-foreground))' }}
            >
              404
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
