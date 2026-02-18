import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";

interface DebouncedSearchReturn {
  searchValue: string;
  debouncedValue: string;
  handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  clearSearch: () => void;
  setSearchValue: (value: string) => void;
}

export function useDebouncedSearch(
  initialValue = "",
  delay = 300,
): DebouncedSearchReturn {
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

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchValue(event.target.value);
    },
    [],
  );

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
