import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const candidateLocale = locale ?? await requestLocale;
  const resolvedLocale = candidateLocale && locales.includes(candidateLocale as Locale)
    ? (candidateLocale as Locale)
    : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
