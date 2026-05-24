export interface GroupableCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  products?: {
    totalCount: number;
  } | null;
}

export interface CategoryDisplayGroup<TCategory extends GroupableCategory = GroupableCategory> {
  id: string;
  title: string;
  categories: TCategory[];
}

interface CategoryGroupRule {
  id: string;
  title: string;
  keywords: string[];
}

const CATEGORY_GROUP_RULES: CategoryGroupRule[] = [
  {
    id: 'kimchi-fermented',
    title: 'Kimchi and fermented food',
    keywords: ['kimchi', 'ferment', 'pickle', 'pickled', 'banchan'],
  },
  {
    id: 'ramyun-instant-meals',
    title: 'Ramyun and instant meals',
    keywords: ['ramyun', 'ramen', 'instant', 'cup noodle', 'meal'],
  },
  {
    id: 'rice-noodles',
    title: 'Rice and noodles',
    keywords: ['rice', 'noodle', 'udon', 'soba', 'vermicelli'],
  },
  {
    id: 'sauces-condiments',
    title: 'Sauces, pastes, and condiments',
    keywords: ['sauce', 'paste', 'condiment', 'gochujang', 'doenjang', 'soy'],
  },
  {
    id: 'seaweed-sushi',
    title: 'Seaweed and sushi',
    keywords: ['seaweed', 'nori', 'sushi', 'gimbap'],
  },
  {
    id: 'snacks-sweets',
    title: 'Snacks and sweets',
    keywords: ['snack', 'sweet', 'candy', 'chocolate', 'chip', 'cracker'],
  },
  {
    id: 'drinks-tea',
    title: 'Drinks and tea',
    keywords: ['drink', 'tea', 'coffee', 'juice', 'soda', 'beverage'],
  },
  {
    id: 'tofu-miso-plant-based',
    title: 'Tofu, miso, and plant-based',
    keywords: ['tofu', 'miso', 'plant', 'vegan', 'vegetarian'],
  },
  {
    id: 'frozen-chilled',
    title: 'Frozen and chilled',
    keywords: ['frozen', 'chilled', 'fresh', 'refrigerated'],
  },
  {
    id: 'pantry-essentials',
    title: 'Pantry essentials',
    keywords: [],
  },
];

const FALLBACK_GROUP_ID = 'pantry-essentials';

function getCategorySearchText(category: GroupableCategory): string {
  return `${category.name} ${category.slug} ${category.description ?? ''}`.toLowerCase();
}

function getGroupId(category: GroupableCategory): string {
  const searchText = getCategorySearchText(category);
  const match = CATEGORY_GROUP_RULES.find((group) => {
    return group.keywords.some((keyword) => searchText.includes(keyword));
  });

  return match?.id ?? FALLBACK_GROUP_ID;
}

export function groupCategories<TCategory extends GroupableCategory>(
  categories: TCategory[]
): Array<CategoryDisplayGroup<TCategory>> {
  const categoriesByGroup = new Map<string, TCategory[]>(
    CATEGORY_GROUP_RULES.map((group) => [group.id, []])
  );

  for (const category of categories) {
    categoriesByGroup.get(getGroupId(category))?.push(category);
  }

  return CATEGORY_GROUP_RULES
    .map((group) => ({
      id: group.id,
      title: group.title,
      categories: categoriesByGroup.get(group.id) ?? [],
    }))
    .filter((group) => group.categories.length > 0);
}

export function searchCategories<TCategory extends GroupableCategory>(
  categories: TCategory[],
  query: string
): TCategory[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return categories;

  return categories.filter((category) => getCategorySearchText(category).includes(normalizedQuery));
}
