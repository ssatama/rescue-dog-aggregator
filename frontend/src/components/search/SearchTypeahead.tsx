"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";
import { useDebouncedCallback } from "use-debounce";
import { trackSearch } from "@/lib/monitoring/breadcrumbs";
import {
  fuzzySearch,
  generateDidYouMeanSuggestions,
} from "@/utils/fuzzySearch";
import type {
  SearchTypeaheadProps,
  SearchTypeaheadRef,
} from "@/types/searchComponents";

const SearchTypeahead = forwardRef<SearchTypeaheadRef, SearchTypeaheadProps>(
  (
    {
      value = "",
      placeholder = "Search...",
      suggestions = [],
      onValueChange,
      onSearch,
      onSuggestionSelect,
      onClear,
      debounceMs = 300,
      maxSuggestions = 5,
      maxHistoryItems = 5,
      showHistory = true,
      showClearButton = true,
      showResultCount = true,
      showDidYouMean = true,
      className = "",
      inputClassName = "",
      suggestionsClassName = "",
      loading = false,
      error = null,
      disabled = false,
      autoFocus = false,
      size = "default",
      variant = "default",
      icon = "search",
      historyKey = "search-history",
      fetchSuggestions = null,
      skipLocalFuzzySearch = false,
      enableHistory = false,
      ...props
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [didYouMeanSuggestions, setDidYouMeanSuggestions] = useState<string[]>([]);
    const [localError, setLocalError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Expose ref methods
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => handleClear(),
      getValue: () => inputValue,
      setValue: (newValue: string) => setInputValue(newValue),
    }));

    // Load search history from localStorage
    useEffect(() => {
      if (showHistory && typeof window !== "undefined") {
        try {
          const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
          // Limit history to maxHistoryItems when loading
          setSearchHistory(history.slice(0, maxHistoryItems));
        } catch (error) {
          console.warn("Failed to load search history:", error);
          setSearchHistory([]);
        }
      }
    }, [historyKey, showHistory, maxHistoryItems]);

    // Sync external value changes with internal input value
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    // Save to search history
    const saveToHistory = useCallback(
      (searchTerm: string) => {
        if (!showHistory || !searchTerm.trim()) return;

        try {
          const newHistory = [
            searchTerm,
            ...searchHistory.filter((item) => item !== searchTerm),
          ].slice(0, maxHistoryItems);

          setSearchHistory(newHistory);
          localStorage.setItem(historyKey, JSON.stringify(newHistory));
        } catch (error) {
          console.warn("Failed to save search history:", error);
        }
      },
      [searchHistory, showHistory, maxHistoryItems, historyKey],
    );

    // Debounced search function
    const debouncedSearch = useDebouncedCallback(
      async (query: string) => {
        if (!query.trim()) {
          setFilteredSuggestions([]);
          setDidYouMeanSuggestions([]);
          return;
        }

        setIsLoading(true);

        try {
          let remoteSuggestions: string[] = [];

          // Fetch remote suggestions if available
          if (fetchSuggestions && typeof fetchSuggestions === "function") {
            try {
              remoteSuggestions = await fetchSuggestions(query);
              // Ensure remoteSuggestions is always an array
              if (!Array.isArray(remoteSuggestions)) {
                remoteSuggestions = [];
              }
            } catch (fetchError) {
              console.error("Error fetching remote suggestions:", fetchError);
              remoteSuggestions = [];
              // Set error state for user feedback when skipLocalFuzzySearch is true
              if (skipLocalFuzzySearch) {
                setLocalError("Unable to fetch suggestions. Please try again.");
                // Auto-clear error after 5 seconds
                setTimeout(() => setLocalError(null), 5000);
              }
              // Continue with local suggestions only when not skipping fuzzy search
            }
          }

          // If skipLocalFuzzySearch is true and we have remote suggestions, use them directly
          if (skipLocalFuzzySearch && remoteSuggestions.length > 0) {
            setFilteredSuggestions(remoteSuggestions.slice(0, maxSuggestions));
            setDidYouMeanSuggestions([]); // No "did you mean" when using direct API results
          } else {
            // Combine local and remote suggestions and apply fuzzy search
            const allSuggestions = [...suggestions, ...remoteSuggestions];
            const fuzzyResults = fuzzySearch(
              query,
              allSuggestions,
              maxSuggestions,
            );
            setFilteredSuggestions(fuzzyResults);

            // Generate "Did you mean?" suggestions
            if (showDidYouMean && fuzzyResults.length === 0) {
              const didYouMean = generateDidYouMeanSuggestions(
                query,
                allSuggestions,
                3,
              );
              setDidYouMeanSuggestions(didYouMean);
            } else {
              setDidYouMeanSuggestions([]);
            }
          }
        } catch (error) {
          console.error("Error processing suggestions:", error);
          setFilteredSuggestions([]);
          setDidYouMeanSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      },
      debounceMs,
    );

    // Input change handler
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        setInputValue(newValue);
        setSelectedIndex(-1);
        setIsOpen(true);
        setLocalError(null); // Clear any previous errors

        onValueChange?.(newValue);
        debouncedSearch(newValue);
      },
      [onValueChange, debouncedSearch],
    );

    // Clear handler
    const handleClear = useCallback(() => {
      setInputValue("");
      setFilteredSuggestions([]);
      setDidYouMeanSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      onClear?.();
      onValueChange?.("");
      inputRef.current?.focus();
    }, [onClear, onValueChange]);

    // Suggestion selection handler
    const handleSuggestionSelect = useCallback(
      (suggestion: string) => {
        setInputValue(suggestion);
        setIsOpen(false);
        setSelectedIndex(-1);
        saveToHistory(suggestion);
        onSuggestionSelect?.(suggestion);
        onValueChange?.(suggestion);
        inputRef.current?.focus();
      },
      [onSuggestionSelect, onValueChange, saveToHistory],
    );

    // Search handler
    const handleSearch = useCallback(() => {
      if (inputValue.trim()) {
        saveToHistory(inputValue);

        // Track search with basic filters (empty object for now)
        try {
          trackSearch(inputValue, {}, filteredSuggestions.length);
        } catch (error) {
          console.error("Failed to track search:", error);
        }

        onSearch?.(inputValue);
        setIsOpen(false);
      }
    }, [inputValue, onSearch, saveToHistory, filteredSuggestions.length]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
          if (e.key === "ArrowDown" && filteredSuggestions.length > 0) {
            setIsOpen(true);
            setSelectedIndex(0);
            e.preventDefault();
          }
          return;
        }

        const totalItems = filteredSuggestions.length + searchHistory.length;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < totalItems - 1 ? prev + 1 : prev,
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
            break;
          case "Enter":
            e.preventDefault();
            if (selectedIndex >= 0) {
              if (selectedIndex < filteredSuggestions.length) {
                handleSuggestionSelect(filteredSuggestions[selectedIndex]);
              } else {
                const historyIndex = selectedIndex - filteredSuggestions.length;
                handleSuggestionSelect(searchHistory[historyIndex]);
              }
            } else {
              handleSearch();
            }
            break;
          case "Escape":
            setIsOpen(false);
            setSelectedIndex(-1);
            inputRef.current?.blur();
            break;
          case "Tab":
            setIsOpen(false);
            setSelectedIndex(-1);
            break;
        }
      },
      [
        isOpen,
        selectedIndex,
        filteredSuggestions,
        searchHistory,
        handleSuggestionSelect,
        handleSearch,
      ],
    );

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          !inputRef.current?.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSelectedIndex(-1);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus management
    const handleFocus = useCallback(() => {
      if (inputValue.trim() || searchHistory.length > 0) {
        setIsOpen(true);
        debouncedSearch(inputValue);
      }
    }, [inputValue, searchHistory.length, debouncedSearch]);

    const handleBlur = useCallback(() => {
      // Delay to allow click events on suggestions
      setTimeout(() => {
        setSelectedIndex(-1);
      }, 150);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
        suggestionRefs.current[selectedIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }, [selectedIndex]);

    // Size classes
    const sizeClasses = {
      sm: "h-8 text-sm",
      default: "h-10",
      lg: "h-12 text-lg",
    };

    // Variant classes
    const variantClasses = {
      default: "border-input bg-background",
      ghost: "border-transparent bg-transparent",
      outline: "border-2 border-primary",
    };

    const showSuggestions =
      isOpen &&
      (filteredSuggestions.length > 0 ||
        searchHistory.length > 0 ||
        didYouMeanSuggestions.length > 0 ||
        isLoading ||
        (inputValue.trim() && !isLoading) || // Show dropdown for empty results
        error ||
        localError); // Show dropdown for errors

    return (
      <div className={`relative w-full ${className}`}>
        {/* Input field */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon
              name={icon as IconName}
              size="small"
              className={`text-muted-foreground ${
                isLoading ? "animate-pulse" : ""
              }`}
            />
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            placeholder={placeholder}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            autoFocus={autoFocus}
            className={`pl-12 pr-${showClearButton && inputValue ? "20" : "4"} ${
              sizeClasses[size]
            } ${variantClasses[variant]} ${inputClassName}`}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
            {...props}
          />
          {showClearButton && inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
              aria-label="Clear search"
            >
              <Icon name="x" size="small" />
            </Button>
          )}
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md ${suggestionsClassName}`}
              role="listbox"
            >
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground dark:text-gray-400">
                  <Icon name="loader" size="small" className="animate-spin" />
                  Searching...
                </div>
              )}

              {/* Suggestions */}
              {filteredSuggestions.length > 0 && (
                <div className="py-1">
                  {showResultCount && (
                    <div className="px-3 py-1 text-xs text-muted-foreground dark:text-gray-400 border-b dark:border-gray-700">
                      {filteredSuggestions.length} suggestion
                      {filteredSuggestions.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={`suggestion-${index}`}
                      ref={(el) => { suggestionRefs.current[index] = el; }}
                      className={`w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
                        selectedIndex === index
                          ? "bg-gray-100 dark:bg-gray-700"
                          : ""
                      }`}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      role="option"
                      aria-selected={selectedIndex === index}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name="search"
                          size="small"
                          className="text-muted-foreground dark:text-gray-400"
                        />
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Search history */}
              {searchHistory.length > 0 && !isLoading && (
                <div className="py-1 border-t dark:border-gray-700">
                  <div className="px-3 py-1 text-xs text-muted-foreground dark:text-gray-400">
                    Recent searches
                  </div>
                  {searchHistory.map((item, index) => {
                    const actualIndex = filteredSuggestions.length + index;
                    return (
                      <button
                        key={`history-${index}`}
                        ref={(el) => { suggestionRefs.current[actualIndex] = el; }}
                        className={`w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
                          selectedIndex === actualIndex
                            ? "bg-gray-100 dark:bg-gray-700"
                            : ""
                        }`}
                        onClick={() => handleSuggestionSelect(item)}
                        role="option"
                        aria-selected={selectedIndex === actualIndex}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            name="clock"
                            size="small"
                            className="text-muted-foreground dark:text-gray-400"
                          />
                          <span className="text-gray-600 dark:text-gray-300">
                            {item}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Did you mean suggestions */}
              {didYouMeanSuggestions.length > 0 && !isLoading && (
                <div className="py-1 border-t dark:border-gray-700">
                  <div className="px-3 py-1 text-xs text-muted-foreground dark:text-gray-400">
                    Did you mean?
                  </div>
                  {didYouMeanSuggestions.map((suggestion, index) => (
                    <button
                      key={`didyoumean-${index}`}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      role="option"
                      aria-selected={false}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name="help-circle"
                          size="small"
                          className="text-muted-foreground dark:text-gray-400"
                        />
                        <span className="text-blue-600 dark:text-blue-400">
                          {suggestion}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Error message in dropdown */}
              {(error || localError) && !isLoading && (
                <div className="px-3 py-2 text-sm text-destructive dark:text-red-400 flex items-center gap-1">
                  <Icon name="alert-circle" size="small" />
                  {error || localError}
                </div>
              )}

              {/* No results */}
              {!isLoading &&
                filteredSuggestions.length === 0 &&
                searchHistory.length === 0 &&
                didYouMeanSuggestions.length === 0 &&
                inputValue.trim() &&
                !error &&
                !localError && (
                  <div className="px-3 py-2 text-sm text-muted-foreground dark:text-gray-400">
                    No suggestions found
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

SearchTypeahead.displayName = "SearchTypeahead";

export default SearchTypeahead;