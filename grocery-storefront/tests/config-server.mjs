import { createServer } from 'node:http';

const PORT = Number(process.env.TEST_CONFIG_SERVER_PORT ?? 4199);

const config = {
  branding: {
    logoUrl: null,
    faviconUrl: 'https://cdn.example.test/favicon.ico',
    storeName: 'Configured Test Grocery',
    colors: {
      primary: '#16a34a',
      primaryHover: '#15803d',
      background: '#ffffff',
      foreground: '#0a0a0a',
      accent: '#f59e0b',
      accentForeground: '#ffffff',
      muted: '#f5f5f5',
      mutedForeground: '#525252',
      border: '#e5e5e5',
      card: '#ffffff',
      cardForeground: '#0a0a0a',
      destructive: '#dc2626',
      ring: '#16a34a',
    },
  },
  homepage: {
    hero: {
      enabled: false,
      headline: '',
      subtitle: '',
      ctaText: '',
      ctaLink: '',
      backgroundImageUrl: null,
    },
    promoBanners: [],
    blocks: [],
    sections: [],
  },
  layout: {
    header: {
      navItems: [],
      showSearch: true,
      showWishlist: true,
      showLanguageSwitcher: true,
      showThemeToggle: true,
    },
    footer: {
      tagline: '',
      columns: [],
      copyrightText: '',
    },
    bannerPosition: 'below-hero',
  },
  tracking: {
    facebookPixel: { enabled: false, pixelId: '' },
    googleAnalytics: { enabled: false, measurementId: '' },
    googleTagManager: { enabled: false, containerId: '' },
    hotjar: { enabled: false, siteId: '' },
  },
  seo: {
    defaultTitle: 'Configured SEO Title',
    defaultDescription: 'Configured SEO description from the admin panel.',
    ogImageUrl: 'https://cdn.example.test/og-image.jpg',
    canonical: 'https://store.example.test/en',
  },
  general: {
    phone: '',
    email: '',
    address: '',
    socialLinks: [],
    policyLinks: {
      privacy: '/privacy',
      terms: '/terms',
      about: '#',
    },
    freeShippingThreshold: 150,
    sameDayShippingCutoff: '12:00',
    lowStockThreshold: 10,
  },
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/api/config/')) {
    sendJson(response, 200, {
      slug: 'test',
      config,
      version: 1,
      updatedAt: '2026-05-12T00:00:00.000Z',
    });
    return;
  }

  sendJson(response, 200, { ok: true });
});

server.listen(PORT, '127.0.0.1');
