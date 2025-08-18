"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/badge";
import { useDebouncedCallback } from "use-debounce";

/**
 * Calculates Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Enhanced fuzzy search with word-level matching for better breed suggestions
 */
function fuzzySearch(query, items, maxResults = 5) {
  if (!query || query.length === 0) return [];

  const scored = items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => {
      const normalizedItem = item.toLowerCase();
      const normalizedQuery = query.toLowerCase();

      // Exact match gets highest score
      if (normalizedItem === normalizedQuery) return { item, score: 100 };

      // Check if any word in the item starts with the query (for multi-word breeds)
      const words = normalizedItem.split(/\s+/);
      const queryWords = normalizedQuery.split(/\s+/);

      // Check if any word in the breed starts with the query
      for (const word of words) {
        if (word.startsWith(normalizedQuery)) {
          return { item, score: 95 - normalizedQuery.length };
        }
      }

      // Check if the full string starts with query
      if (normalizedItem.startsWith(normalizedQuery))
        return { item, score: 90 - normalizedQuery.length };

      // Check if query matches beginning of multi-word search
      if (queryWords.length > 1) {
        const matches = queryWords.every((qWord) =>
          words.some((word) => word.startsWith(qWord)),
        );
        if (matches) return { item, score: 85 };
      }

      // Contains query gets medium score
      if (normalizedItem.includes(normalizedQuery))
        return { item, score: 70 - normalizedQuery.length };

      // Fuzzy match based on Levenshtein distance
      const distance = levenshteinDistance(normalizedQuery, normalizedItem);
      const maxLength = Math.max(normalizedQuery.length, normalizedItem.length);
      if (distance <= maxLength * 0.4) {
        return { item, score: 50 - distance };
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((s) => s.item);
}

/**
 * Generates "Did you mean?" suggestions
 */
function generateDidYouMeanSuggestions(query, items, maxSuggestions = 3) {
  if (!query || query.length < 3) return [];

  const suggestions = items
    .filter((item) => typeof item === "string" && item.trim()) // Filter out non-strings and empty strings
    .map((item) => {
      const distance = levenshteinDistance(
        query.toLowerCase(),
        item.toLowerCase(),
      );
      const similarity = 1 - distance / Math.max(query.length, item.length);
      return { item, similarity };
    })
    .filter((s) => s.similarity > 0.6 && s.similarity < 0.95)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxSuggestions)
    .map((s) => s.item);

  return suggestions;
}

/**
 * SearchTypeahead Component
 * World-class typeahead with fuzzy matching, keyboard navigation, and accessibility
 */
const SearchTypeahead = forwardRef(
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
      size = "default", // "sm" | "default" | "lg"
      variant = "default", // "default" | "ghost" | "outline"
      icon = "search",
      historyKey = "search-history",
      fetchSuggestions = null, // async function for remote suggestions
      skipLocalFuzzySearch = false, // Skip local fuzzy search when API provides filtered results
      enableHistory = false, // Enable search history
      ...props
    },
    ref,
  ) => {
    // State management
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [searchHistory, setSearchHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [didYouMeanSuggestions, setDidYouMeanSuggestions] = useState([]);
    const [localError, setLocalError] = useState(null);

    // Refs
    const inputRef = useRef(null);
    const suggestionRefs = useRef([]);
    const dropdownRef = useRef(null);

    // Expose ref methods
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => handleClear(),
      getValue: () => inputValue,
      setValue: (newValue) => setInputValue(newValue),
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
      (searchTerm) => {
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
      async (query) => {
        if (!query.trim()) {
          setFilteredSuggestions([]);
          setDidYouMeanSuggestions([]);
          return;
        }

        setIsLoading(true);

        try {
          let remoteSuggestions = [];

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
      [
        fetchSuggestions,
        skipLocalFuzzySearch,
        maxSuggestions,
        showDidYouMean,
        suggestions,
      ],
    );

    // Input change handler
    const handleInputChange = useCallback(
      (e) => {
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
      (suggestion) => {
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
        onSearch?.(inputValue);
        setIsOpen(false);
      }
    }, [inputValue, onSearch, saveToHistory]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e) => {
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
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          !inputRef.current?.contains(event.target)
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
              name={icon}
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
            className={`pl-10 pr-${showClearButton && inputValue ? "20" : "4"} ${
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
              className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover shadow-md ${suggestionsClassName}`}
              role="listbox"
            >
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Icon name="loader" size="small" className="animate-spin" />
                  Searching...
                </div>
              )}

              {/* Suggestions */}
              {filteredSuggestions.length > 0 && (
                <div className="py-1">
                  {showResultCount && (
                    <div className="px-3 py-1 text-xs text-muted-foreground border-b">
                      {filteredSuggestions.length} suggestion
                      {filteredSuggestions.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={`suggestion-${index}`}
                      ref={(el) => (suggestionRefs.current[index] = el)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none ${
                        selectedIndex === index ? "bg-accent" : ""
                      }`}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      role="option"
                      aria-selected={selectedIndex === index}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name="search"
                          size="small"
                          className="text-muted-foreground"
                        />
                        <span>{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Search history */}
              {searchHistory.length > 0 && !isLoading && (
                <div className="py-1 border-t">
                  <div className="px-3 py-1 text-xs text-muted-foreground">
                    Recent searches
                  </div>
                  {searchHistory.map((item, index) => {
                    const actualIndex = filteredSuggestions.length + index;
                    return (
                      <button
                        key={`history-${index}`}
                        ref={(el) => (suggestionRefs.current[actualIndex] = el)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none ${
                          selectedIndex === actualIndex ? "bg-accent" : ""
                        }`}
                        onClick={() => handleSuggestionSelect(item)}
                        role="option"
                        aria-selected={selectedIndex === actualIndex}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            name="clock"
                            size="small"
                            className="text-muted-foreground"
                          />
                          <span className="text-muted-foreground">{item}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Did you mean suggestions */}
              {didYouMeanSuggestions.length > 0 && !isLoading && (
                <div className="py-1 border-t">
                  <div className="px-3 py-1 text-xs text-muted-foreground">
                    Did you mean?
                  </div>
                  {didYouMeanSuggestions.map((suggestion, index) => (
                    <button
                      key={`didyoumean-${index}`}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      role="option"
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name="help-circle"
                          size="small"
                          className="text-muted-foreground"
                        />
                        <span className="text-blue-600">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Error message in dropdown */}
              {(error || localError) && !isLoading && (
                <div className="px-3 py-2 text-sm text-destructive flex items-center gap-1">
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
                  <div className="px-3 py-2 text-sm text-muted-foreground">
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
