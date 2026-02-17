import type React from "react";

interface SearchTypeaheadProps {
  value?: string;
  placeholder?: string;
  suggestions?: string[];
  onValueChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onSuggestionSelect?: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  maxSuggestions?: number;
  maxHistoryItems?: number;
  showHistory?: boolean;
  showClearButton?: boolean;
  showResultCount?: boolean;
  showDidYouMean?: boolean;
  className?: string;
  inputClassName?: string;
  suggestionsClassName?: string;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "ghost" | "outline";
  icon?: string;
  historyKey?: string;
  fetchSuggestions?: ((query: string, limit?: number) => Promise<string[]>) | null;
  skipLocalFuzzySearch?: boolean;
  enableHistory?: boolean;
  "data-testid"?: string;
  "aria-label"?: string;
  [key: string]: unknown;
}

declare const SearchTypeahead: React.ForwardRefExoticComponent<
  SearchTypeaheadProps & React.RefAttributes<HTMLInputElement>
>;

export default SearchTypeahead;
