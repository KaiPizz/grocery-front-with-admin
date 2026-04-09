const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#e8f5e9"/>
  <path d="M20 40c0-10 7-18 18-22-1 13-8 21-18 22Z" fill="#2f9e44"/>
  <path d="M44 40c0-10-7-18-18-22 1 13 8 21 18 22Z" fill="#58b368"/>
  <path d="M32 18v28" stroke="#1f7a36" stroke-width="3" stroke-linecap="round"/>
</svg>
`.trim();

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
