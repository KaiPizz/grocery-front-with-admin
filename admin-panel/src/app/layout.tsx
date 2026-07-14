import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'Asia Deli Go Admin',
  description: 'Secure administration for the Asia Deli Go storefront',
  applicationName: 'Asia Deli Go Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
