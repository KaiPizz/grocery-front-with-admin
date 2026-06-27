const DIACRITIC_REGEX = /[\u0300-\u036f]/g;
const NON_WORD_REGEX = /[^a-z0-9\s]/g;

export interface SearchableProduct {
  id: string;
  name: string;
  slug: string;
  translation?: {
    language?: string | null;
    name?: string | null;
    description?: string | null;
    shortDescription?: string | null;
  } | null;
  thumbnail?: { url?: string | null; alt?: string | null } | null;
  category?: { name?: string | null; slug?: string | null } | null;
  pricing?: {
    priceRange?: {
      start?: {
        gross?: {
          amount?: number | null;
          currency?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
}

interface RankedSearchProduct extends SearchableProduct {
  score: number;
}

export function normalizeSearchTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIC_REGEX, '')
    .replace(NON_WORD_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;

    for (let column = 1; column <= b.length; column += 1) {
      const current = previous[column];
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;

      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + cost
      );

      diagonal = current;
    }
  }

  return previous[b.length];
}

function scoreWordMatch(word: string, token: string): number {
  if (!word || !token) return 0;
  if (word === token) return 260;
  if (word.startsWith(token)) return 220 - Math.min(40, word.length - token.length);
  if (word.includes(token)) return 180 - Math.min(60, word.indexOf(token) * 8);

  if (token.length >= 3) {
    const sample = word.slice(0, Math.min(word.length, token.length + 1));
    const distance = levenshteinDistance(sample, token);
    if (distance <= 2) {
      return 150 - distance * 35;
    }
  }

  return 0;
}

function scoreTextMatch(text: string, query: string): number {
  if (!text || !query) return 0;
  if (text === query) return 900;
  if (text.startsWith(query)) return 760 - Math.min(80, text.length - query.length);
  if (text.includes(` ${query}`)) return 680;
  if (text.includes(query)) return 620;

  if (query.length >= 4) {
    const distance = levenshteinDistance(text.slice(0, query.length + 1), query);
    if (distance <= 2) {
      return 460 - distance * 80;
    }
  }

  return 0;
}

export function rankProductsForSearch(products: SearchableProduct[], rawQuery: string): RankedSearchProduct[] {
  const query = normalizeSearchTerm(rawQuery);
  if (!query) return [];

  const queryTokens = query.split(' ').filter(Boolean);

  return products
    .map((product) => {
      const normalizedName = normalizeSearchTerm(product.name);
      const normalizedCategory = normalizeSearchTerm(product.category?.name || '');
      const nameWords = normalizedName.split(' ').filter(Boolean);
      const categoryWords = normalizedCategory.split(' ').filter(Boolean);

      let score = scoreTextMatch(normalizedName, query);
      score += Math.round(scoreTextMatch(normalizedCategory, query) * 0.45);

      let matchedTokens = 0;

      for (const token of queryTokens) {
        let tokenScore = 0;

        for (const word of nameWords) {
          tokenScore = Math.max(tokenScore, scoreWordMatch(word, token));
        }

        for (const word of categoryWords) {
          tokenScore = Math.max(tokenScore, Math.round(scoreWordMatch(word, token) * 0.65));
        }

        if (tokenScore > 0) {
          matchedTokens += 1;
          score += tokenScore;
        }
      }

      if (matchedTokens === queryTokens.length && queryTokens.length > 1) {
        score += 160;
      }

      return { ...product, score };
    })
    .filter((product) => product.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.name.localeCompare(right.name);
    });
}

export function buildSearchSuggestions(
  products: SearchableProduct[],
  query: string,
  recentSearches: string[],
  limit = 4
): string[] {
  const normalizedQuery = normalizeSearchTerm(query);
  const seen = new Set<string>();
  const suggestions: string[] = [];

  const pushSuggestion = (value: string) => {
    const trimmed = value.trim();
    const normalized = normalizeSearchTerm(trimmed);

    if (!trimmed || !normalized || seen.has(normalized)) return;
    if (normalizedQuery && !normalized.includes(normalizedQuery) && !normalizedQuery.includes(normalized)) return;

    seen.add(normalized);
    suggestions.push(trimmed);
  };

  for (const recentSearch of recentSearches) {
    pushSuggestion(recentSearch);
    if (suggestions.length >= limit) return suggestions;
  }

  for (const product of rankProductsForSearch(products, query).slice(0, limit * 2)) {
    pushSuggestion(product.name);
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}
