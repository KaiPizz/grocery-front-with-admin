export interface PublicTaxonomyRawCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  level?: number | null;
  displayOrder?: number | null;
  parent?: { id: string } | null;
  translation?: { name?: string | null; description?: string | null } | null;
  backgroundImage?: { url?: string | null; alt?: string | null } | null;
  products?: {
    totalCount: number;
  } | null;
}

export interface PublicCategoryLeaf {
  id: string;
  slug: string;
  name: string;
  description: string;
  products: {
    totalCount: number | null;
  };
  backgroundImageUrl: string | null;
}

export interface PublicCategory extends PublicCategoryLeaf {
  kind: 'group' | 'leaf';
  parent: { id: string; slug: string; name: string } | null;
  children: PublicCategoryLeaf[];
  /** group: the ids of its kept leaves (its own id when leafless); leaf: its own id. */
  rawCategoryIds: string[];
  rawCategorySlugs: string[];
}

export interface PublicCategoryDefinition {
  slug: string;
  names: {
    pl: string;
    en: string;
  };
  descriptions: {
    pl: string;
    en: string;
  };
}

export interface BuildPublicCategoriesOptions {
  requireProductCount?: boolean;
  includeEmpty?: boolean;
}

const HIDDEN_CATEGORY_KEYWORDS = [
  'kategoria tymczasowa',
  'unmapped',
  'pozostale produkty',
  'pozostałe produkty',
  'pozostale-produkty',
  'temporary',
];

// English names and descriptions for the 10 top-level groups when the database
// carries no translation. The tree itself (groups, leaves, order) comes from the
// database: `parent`, `level` and `displayOrder` on each category.
export const PUBLIC_CATEGORY_DEFINITIONS: PublicCategoryDefinition[] = [
  { slug: 'makaron-i-ryz', names: { pl: 'Makaron i ryż', en: 'Noodles and rice' }, descriptions: { pl: 'Ramyun, udon, soba, makaron ryżowy, tteok i ryż.', en: 'Ramyun, udon, soba, rice noodles, tteok, and rice.' } },
  { slug: 'sosy-i-oleje', names: { pl: 'Sosy i oleje', en: 'Sauces and oils' }, descriptions: { pl: 'Sos sojowy, sosy rybne i ostrygowe, ostre, do sushi, majonezy i oleje.', en: 'Soy, fish, oyster, hot and sushi sauces, mayonnaise, and oils.' } },
  { slug: 'pasty-przyprawy-i-buliony', names: { pl: 'Pasty, przyprawy i buliony', en: 'Pastes, spices and stocks' }, descriptions: { pl: 'Gochujang, curry, miso, przyprawy, octy, buliony, wasabi i sezam.', en: 'Gochujang, curry, miso, spices, vinegars, stocks, wasabi, and sesame.' } },
  { slug: 'kimchi-i-kiszonki', names: { pl: 'Kimchi i kiszonki', en: 'Kimchi and pickles' }, descriptions: { pl: 'Kimchi, marynowane warzywa i owoce, imbir marynowany.', en: 'Kimchi, pickled vegetables and fruit, pickled ginger.' } },
  { slug: 'przekaski-i-slodycze', names: { pl: 'Przekąski i słodycze', en: 'Snacks and sweets' }, descriptions: { pl: 'Chipsy, ciastka, Pocky, żelki, mochi i słone przekąski z Azji.', en: 'Chips, cookies, Pocky, gummies, mochi, and savory Asian snacks.' } },
  { slug: 'napoje-herbaty-i-kawy', names: { pl: 'Napoje, herbaty i kawy', en: 'Drinks, tea and coffee' }, descriptions: { pl: 'Herbaty, kawy, napoje gazowane, soki i napoje mleczne.', en: 'Teas, coffee, soft drinks, juices, and milk drinks.' } },
  { slug: 'dania-gotowe', names: { pl: 'Dania gotowe i zupy instant', en: 'Ready meals and instant soups' }, descriptions: { pl: 'Dania gotowe, curry i zupy instant.', en: 'Ready meals, curry, and instant soups.' } },
  { slug: 'do-gotowania-i-sushi', names: { pl: 'Do gotowania i sushi', en: 'Cooking and sushi essentials' }, descriptions: { pl: 'Algi, grzyby suszone, tofu, mąki, mleczko kokosowe i papier ryżowy.', en: 'Seaweed, dried mushrooms, tofu, flours, coconut milk, and rice paper.' } },
  { slug: 'akcesoria-kuchenne', names: { pl: 'Akcesoria kuchenne', en: 'Kitchen accessories' }, descriptions: { pl: 'Pałeczki, noże, woki, miski, parowary i zestawy do sushi.', en: 'Chopsticks, knives, woks, bowls, steamers, and sushi kits.' } },
  { slug: 'kosmetyki-koreanskie', names: { pl: 'Kosmetyki koreańskie', en: 'Korean cosmetics' }, descriptions: { pl: 'Maseczki, kremy, serum, oczyszczanie i filtry UV.', en: 'Sheet masks, creams, serums, cleansing, and sunscreens.' } },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function getSearchText(category: PublicTaxonomyRawCategory) {
  return normalizeText(`${category.slug} ${category.name} ${category.description ?? ''}`);
}

function isHiddenCategory(category: PublicTaxonomyRawCategory) {
  const searchText = getSearchText(category);
  return HIDDEN_CATEGORY_KEYWORDS.some((keyword) => searchText.includes(normalizeText(keyword)));
}

function definitionFor(slug: string) {
  return PUBLIC_CATEGORY_DEFINITIONS.find((definition) => definition.slug === slug) ?? null;
}

function localizedName(node: PublicTaxonomyRawCategory, locale: string) {
  if (locale === 'en') {
    const translated = node.translation?.name?.trim();
    if (translated) return translated;
    const definition = definitionFor(node.slug);
    if (definition) return definition.names.en;
  }
  return node.name;
}

function localizedDescription(node: PublicTaxonomyRawCategory, locale: string) {
  if (locale === 'en') {
    const translated = node.translation?.description?.trim();
    if (translated) return translated;
  }
  const own = node.description?.trim();
  if (own) return own;
  const definition = definitionFor(node.slug);
  if (!definition) return '';
  return locale === 'en' ? definition.descriptions.en : definition.descriptions.pl;
}

function toLeaf(node: PublicTaxonomyRawCategory, locale: string): PublicCategoryLeaf {
  const count = node.products?.totalCount;
  return {
    id: node.id,
    slug: node.slug,
    name: localizedName(node, locale),
    description: localizedDescription(node, locale),
    products: { totalCount: typeof count === 'number' ? count : null },
    backgroundImageUrl: node.backgroundImage?.url?.trim() || null,
  };
}

function keepNode(node: PublicTaxonomyRawCategory, requireProductCount: boolean, includeEmpty: boolean) {
  const count = node.products?.totalCount;
  const hasKnownCount = typeof count === 'number';
  if (requireProductCount && !hasKnownCount) return false;
  if (!includeEmpty && hasKnownCount && count <= 0) return false;
  return true;
}

/**
 * Builds the public 2-level tree from the flat category list: every visible
 * node whose `parent.id` is another visible node is a leaf of that group; any
 * other node (no parent, or a parent this list does not carry) is a group, so
 * nothing disappears when the data is only half migrated. Groups come back
 * sorted by `displayOrder`, then name.
 */
export function buildCategoryTree(
  categories: PublicTaxonomyRawCategory[],
  locale = 'pl',
  options: BuildPublicCategoriesOptions = {},
): PublicCategory[] {
  const requireProductCount = options.requireProductCount ?? true;
  const includeEmpty = options.includeEmpty ?? false;
  const visible = categories.filter((node) => node.slug && node.name && !isHiddenCategory(node));
  const byId = new Map(visible.map((node) => [node.id, node]));
  const isLeafNode = (node: PublicTaxonomyRawCategory) => Boolean(
    node.parent?.id && node.parent.id !== node.id && byId.has(node.parent.id),
  );
  const byOrder = (left: PublicTaxonomyRawCategory, right: PublicTaxonomyRawCategory) => (
    (left.displayOrder ?? 0) - (right.displayOrder ?? 0) || left.name.localeCompare(right.name, locale)
  );
  const leavesByParent = new Map<string, PublicTaxonomyRawCategory[]>();
  for (const node of visible) {
    if (!isLeafNode(node)) continue;
    const parentId = node.parent!.id;
    const siblings = leavesByParent.get(parentId) ?? [];
    siblings.push(node);
    leavesByParent.set(parentId, siblings);
  }

  const groups: PublicCategory[] = [];
  for (const node of visible.filter((candidate) => !isLeafNode(candidate)).sort(byOrder)) {
    const children = (leavesByParent.get(node.id) ?? [])
      .filter((leaf) => keepNode(leaf, requireProductCount, includeEmpty))
      .sort(byOrder)
      .map((leaf) => toLeaf(leaf, locale));
    const base = toLeaf(node, locale);
    let totalCount: number | null;
    if (children.length > 0) {
      totalCount = children.every((leaf) => leaf.products.totalCount !== null)
        ? children.reduce((sum, leaf) => sum + (leaf.products.totalCount ?? 0), 0)
        : null;
    } else {
      totalCount = base.products.totalCount;
    }
    if (requireProductCount && totalCount === null) continue;
    if (!includeEmpty && totalCount !== null && totalCount <= 0) continue;
    groups.push({
      ...base,
      products: { totalCount },
      kind: 'group',
      parent: null,
      children,
      rawCategoryIds: children.length > 0 ? children.map((leaf) => leaf.id) : [node.id],
      rawCategorySlugs: children.length > 0 ? children.map((leaf) => leaf.slug) : [node.slug],
    });
  }
  return groups;
}

/** Kept under its old name for the existing importers. */
export const buildPublicCategories = buildCategoryTree;

export function findPublicCategory(
  categories: PublicTaxonomyRawCategory[],
  slug: string,
  locale = 'pl',
  options: BuildPublicCategoriesOptions = {},
): PublicCategory | null {
  const groups = buildCategoryTree(categories, locale, options);
  const group = groups.find((candidate) => candidate.slug === slug);
  if (group) return group;
  for (const parent of groups) {
    const leaf = parent.children.find((candidate) => candidate.slug === slug);
    if (leaf) {
      return {
        ...leaf,
        kind: 'leaf',
        parent: { id: parent.id, slug: parent.slug, name: parent.name },
        children: [],
        rawCategoryIds: [leaf.id],
        rawCategorySlugs: [leaf.slug],
      };
    }
  }
  return null;
}
