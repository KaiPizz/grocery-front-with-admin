import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement, SVGProps } from 'react';
import type { SocialLink } from '@/types/storefront-config';

interface SocialBarProps {
  links: SocialLink[];
}

type SvgIcon = (props: SVGProps<SVGSVGElement>) => ReactElement;
type SocialIcon = LucideIcon | SvgIcon;

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.8 3c.35 2.05 1.53 3.61 3.2 4.35v3.15a7.56 7.56 0 0 1-3.25-.86v5.55c0 3.44-2.45 5.81-5.65 5.81A5.5 5.5 0 0 1 5.5 15.5c0-3.3 2.68-5.68 6.02-5.32v3.22c-1.47-.29-2.8.63-2.8 2.1 0 1.28 1.01 2.22 2.34 2.22 1.45 0 2.37-.93 2.37-2.62V3h3.37Z" />
    </svg>
  );
}

function LineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 4C7.6 4 4 6.9 4 10.47c0 3.2 2.84 5.89 6.67 6.4.26.06.62.19.71.43.08.22.05.56.02.78l-.11.72c-.04.22-.18.86.69.47.87-.38 4.7-2.77 6.41-4.75A5.72 5.72 0 0 0 20 10.47C20 6.9 16.4 4 12 4Zm-3.5 8.3H6.7V8.65h1.1v2.72h.7v.93Zm2.17 0h-1.1V8.65h1.1v3.65Zm3.37 0h-1.02l-1.45-1.98v1.98h-1.09V8.65h1.02l1.45 1.98V8.65h1.09v3.65Zm3.23-2.72h-1.55v.58h1.55v.93h-1.55v.58h1.55v.93h-2.65V8.65h2.65v.93Z" />
    </svg>
  );
}

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 4a7.9 7.9 0 0 0-6.79 11.94L4.2 20l4.17-1.03A7.94 7.94 0 1 0 12.04 4Zm.01 1.36a6.58 6.58 0 1 1 0 13.16 6.7 6.7 0 0 1-3.38-.91l-.24-.14-2.47.61.64-2.4-.16-.25a6.58 6.58 0 0 1 5.61-10.07Zm-2.2 3.39c-.13 0-.34.05-.52.25-.18.2-.68.66-.68 1.62 0 .95.7 1.87.8 2 .1.13 1.36 2.18 3.38 2.97 1.68.66 2.02.53 2.39.5.36-.04 1.17-.48 1.33-.94.16-.46.16-.86.11-.94-.05-.08-.18-.13-.38-.23-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.19-.51.63-.62.76-.11.13-.23.15-.43.05-.2-.1-.84-.31-1.6-.99-.59-.53-.99-1.18-1.11-1.38-.11-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.11.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.44-1.05-.6-1.44-.16-.38-.32-.32-.44-.33h-.38Z" />
    </svg>
  );
}

function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.5 4.7 17.7 18c-.21.94-.77 1.17-1.56.73l-4.3-3.17-2.08 2c-.23.23-.42.42-.86.42l.31-4.37 7.96-7.19c.35-.31-.08-.48-.54-.17l-9.84 6.2-4.24-1.33c-.92-.29-.94-.92.19-1.36L19.3 3.38c.77-.29 1.45.18 1.2 1.32Z" />
    </svg>
  );
}

function PinterestIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.05 3.5a8.4 8.4 0 0 0-3.06 16.22c-.08-.69-.15-1.75.03-2.51l.96-4.07s-.24-.5-.24-1.23c0-1.15.67-2.01 1.5-2.01.71 0 1.05.53 1.05 1.17 0 .71-.45 1.77-.68 2.75-.2.82.41 1.48 1.22 1.48 1.46 0 2.59-1.54 2.59-3.77 0-1.97-1.42-3.35-3.44-3.35-2.35 0-3.73 1.76-3.73 3.58 0 .71.27 1.47.61 1.88.07.08.08.15.06.24l-.23.94c-.04.15-.13.18-.29.11-1.06-.49-1.72-2.03-1.72-3.27 0-2.66 1.94-5.1 5.57-5.1 2.92 0 5.19 2.08 5.19 4.87 0 2.9-1.83 5.23-4.37 5.23-.85 0-1.65-.44-1.93-.97l-.52 2c-.19.73-.7 1.65-1.04 2.21A8.4 8.4 0 1 0 12.05 3.5Z" />
    </svg>
  );
}

function normalizePlatform(platform: string) {
  return platform.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getIcon(platform: string): SocialIcon {
  const icons: Record<string, SocialIcon> = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    twitterx: Twitter,
    x: Twitter,
    tiktok: TikTokIcon,
    youtube: Youtube,
    line: LineIcon,
    whatsapp: WhatsAppIcon,
    telegram: TelegramIcon,
    linkedin: Linkedin,
    pinterest: PinterestIcon,
  };

  return icons[normalizePlatform(platform)] ?? Globe;
}

export function SocialBar({ links }: SocialBarProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Social links" className="mt-5">
      <ul className="flex flex-wrap gap-2" role="list">
        {links.map((link, index) => {
          const Icon = getIcon(link.platform);

          return (
            <li key={`${link.platform}-${link.url}-${index}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.platform}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-colors duration-fast hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
