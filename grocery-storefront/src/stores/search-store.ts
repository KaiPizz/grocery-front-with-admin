'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeSearchTerm } from '@/lib/search';

const RECENT_SEARCH_LIMIT = 6;

interface SearchState {
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],

      addRecentSearch: (query) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;

          const normalizedQuery = normalizeSearchTerm(trimmed);
          const nextSearches = state.recentSearches.filter(
            (entry) => normalizeSearchTerm(entry) !== normalizedQuery
          );

          return {
            recentSearches: [trimmed, ...nextSearches].slice(0, RECENT_SEARCH_LIMIT),
          };
        }),

      removeRecentSearch: (query) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter(
            (entry) => normalizeSearchTerm(entry) !== normalizeSearchTerm(query)
          ),
        })),

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'grocery-search-history',
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    }
  )
);
