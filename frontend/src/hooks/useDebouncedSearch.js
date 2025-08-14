/**
 * Hook for debounced search input
 * Phase 2 Implementation for Performance Optimization
 */
import { useState, useEffect, useCallback } from "react";

export function useDebouncedSearch(initialValue = "", delay = 300) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [searchValue, delay]);

  const handleSearchChange = useCallback((event) => {
    setSearchValue(event.target.value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchValue("");
    setDebouncedValue("");
  }, []);

  return {
    searchValue,
    debouncedValue,
    handleSearchChange,
    clearSearch,
    setSearchValue,
  };
}
