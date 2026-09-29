export type PageItem = number | 'ellipsis';

// The storefront API pages with cursors that are base64 of `offset:N`
// (backend CursorPaginationService). When a listing hands out cursors in that
// format the pager can jump to any page; opaque cursors keep the step-by-step
// pager.
const OFFSET_CURSOR = /^offset:(\d+)$/;

export function decodeOffsetCursor(cursor: string | null | undefined): number | null {
  if (!cursor) return null;
  try {
    const match = atob(cursor).match(OFFSET_CURSOR);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/** The `after` cursor whose next item is the first product of `page`. */
export function offsetAfterCursorForPage(page: number, pageSize: number): string | null {
  if (page <= 1) return null;
  return btoa(`offset:${(page - 1) * pageSize - 1}`);
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
}

/**
 * First page, last page and `siblings` pages either side of the current one,
 * in a fixed number of slots (2 × siblings + 5) so the pager never changes
 * width: siblings 1 → `1 2 3 4 5 … 10`, siblings 0 → `1 2 3 … 10`.
 */
export function buildPageItems(currentPage: number, totalPages: number, siblings: number): PageItem[] {
  if (totalPages <= siblings * 2 + 5) return range(1, totalPages);

  const start = Math.max(Math.min(currentPage - siblings, totalPages - siblings * 2 - 2), 3);
  const end = Math.min(Math.max(currentPage + siblings, siblings * 2 + 3), totalPages - 2);

  return [
    1,
    start > 3 ? 'ellipsis' : 2,
    ...range(start, end),
    end < totalPages - 2 ? 'ellipsis' : totalPages - 1,
    totalPages,
  ];
}
