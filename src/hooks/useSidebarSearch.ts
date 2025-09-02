import React from 'react';
import { useSearchDebounce } from './useSearchDebounce';

interface UseSidebarSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;
  clearSearch: () => void;
  hasSearchQuery: boolean;
}

export const useSidebarSearch = (): UseSidebarSearchReturn => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedQuery = useSearchDebounce(searchQuery, 300);

  const clearSearch = React.useCallback(() => {
    setSearchQuery('');
  }, []);

  const hasSearchQuery = searchQuery.trim().length > 0;

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    clearSearch,
    hasSearchQuery
  };
};
