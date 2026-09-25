// Catalog imports often copy the product name into the description (250 of 1 778
// Asia Deli Go products on 2026-09-25 were exactly the name, 198 more began with it).
// The PDP already shows the name as its heading, so the description section should
// only carry what the name does not already say.

function normalize(value: string): string {
  return value.replace(/[\s\p{P}]+/gu, ' ').trim().toLowerCase();
}

export function getDescriptionBeyondTitle(
  description: string | null | undefined,
  title: string | null | undefined,
): string | null {
  const text = description?.trim();
  if (!text) return null;
  const name = title?.trim();
  if (!name) return text;
  if (normalize(text) === normalize(name)) return null;
  if (!text.toLowerCase().startsWith(name.toLowerCase())) return text;
  const rest = text.slice(name.length).replace(/^[\s\p{P}]+/u, '');
  return rest || null;
}
