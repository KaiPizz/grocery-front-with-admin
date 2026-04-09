import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'Storefront Admin Panel',
  description: 'Manage storefront configuration, branding, and content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
