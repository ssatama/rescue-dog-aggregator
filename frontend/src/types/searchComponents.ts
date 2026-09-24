import type { SearchResultGroup, SearchSurface } from "@/lib/analytics";

export interface SearchTypeaheadProps {
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
  fetchSuggestions?:
    | ((query: string, limit?: number) => Promise<string[]>)
    | null;
  skipLocalFuzzySearch?: boolean;
  enableHistory?: boolean;
  /** Set on search boxes (not filter boxes) to send `search_performed`.
   * `suggestionGroup` is the kind of result its suggestions are. */
  analytics?: { surface: SearchSurface; suggestionGroup: SearchResultGroup };
  "data-testid"?: string;
  "aria-label"?: string;
}

export interface SearchTypeaheadRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
}