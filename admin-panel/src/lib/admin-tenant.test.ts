import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

import {
  AdminTenantConfigurationError,
  getAllowedAdminSlugs,
  getPublishedCorsHeaders,
  isValidConfigSlug,
} from './admin-tenant';

test('validates strict storefront slugs', () => {
  assert.equal(isValidConfigSlug('asiandeligo'), true);
  assert.equal(isValidConfigSlug('asian-deli-go'), true);
  assert.equal(isValidConfigSlug('../asiandeligo'), false);
  assert.equal(isValidConfigSlug('AsianDeliGo'), false);
});

test('fails closed when admin tenant scope is missing', () => {
  const previousAllowed = process.env.ADMIN_ALLOWED_SLUGS;
  const previousPublic = process.env.NEXT_PUBLIC_SALON_SLUG;
  delete process.env.ADMIN_ALLOWED_SLUGS;
  delete process.env.NEXT_PUBLIC_SALON_SLUG;

  try {
    assert.throws(() => getAllowedAdminSlugs(), AdminTenantConfigurationError);
  } finally {
    if (previousAllowed === undefined) delete process.env.ADMIN_ALLOWED_SLUGS;
    else process.env.ADMIN_ALLOWED_SLUGS = previousAllowed;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SALON_SLUG;
    else process.env.NEXT_PUBLIC_SALON_SLUG = previousPublic;
  }
});

test('uses the explicit server-side tenant allowlist', () => {
  const previous = process.env.ADMIN_ALLOWED_SLUGS;
  process.env.ADMIN_ALLOWED_SLUGS = 'asiandeligo,kenmito';
  try {
    assert.deepEqual(Array.from(getAllowedAdminSlugs()), ['asiandeligo', 'kenmito']);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_ALLOWED_SLUGS;
    else process.env.ADMIN_ALLOWED_SLUGS = previous;
  }
});

test('adds CORS only for an explicitly allowed published-config origin', () => {
  const previous = process.env.STOREFRONT_ORIGINS;
  process.env.STOREFRONT_ORIGINS = 'https://shop.example.test';
  try {
    const allowed = new NextRequest('https://admin.example.test/api/config/shop', {
      headers: { Origin: 'https://shop.example.test' },
    });
    const denied = new NextRequest('https://admin.example.test/api/config/shop', {
      headers: { Origin: 'https://attacker.example.test' },
    });
    assert.equal(
      getPublishedCorsHeaders(allowed)['Access-Control-Allow-Origin'],
      'https://shop.example.test'
    );
    assert.equal(getPublishedCorsHeaders(denied)['Access-Control-Allow-Origin'], undefined);
  } finally {
    if (previous === undefined) delete process.env.STOREFRONT_ORIGINS;
    else process.env.STOREFRONT_ORIGINS = previous;
  }
});
