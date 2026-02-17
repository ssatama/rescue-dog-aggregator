import * as Sentry from "@sentry/nextjs";

// Debounce timers for tracking functions
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Tracks when a user views a dog detail page.
 * Should be called on dog detail page load.
 * @param dogId - Unique identifier for the dog
 * @param dogName - Name of the dog for human-readable context
 * @param orgSlug - Organization slug the dog belongs to
 */
export function trackDogView(
  dogId: string,
  dogName: string,
  orgSlug: string,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Viewed dog: ${dogName}`,
      data: {
        dogId,
        dogName,
        orgSlug,
      },
    });
  } catch (error) {
    console.error("Failed to track dog view:", error);
  }
}

/**
 * Tracks when a user clicks on a dog card from any listing.
 * Should be called when dog card is clicked before navigation.
 * @param dogId - Unique identifier for the dog
 * @param dogName - Name of the dog
 * @param position - Position of the card in the list (0-indexed)
 * @param listContext - Where the card was clicked from
 */
export function trackDogCardClick(
  dogId: string,
  dogName: string,
  position: number,
  listContext: "search" | "org-page" | "home" | "favorites" | "breed-page",
): void {
  try {
    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `Clicked dog card: ${dogName} at position ${position + 1}`,
      data: {
        dogId,
        dogName,
        position,
        listContext,
      },
    });
  } catch (error) {
    console.error("Failed to track dog card click:", error);
  }
}

/**
 * Tracks when a user interacts with dog image gallery.
 * Should be called when user clicks through images.
 * @param dogId - Unique identifier for the dog
 * @param imageIndex - Current image index (0-indexed)
 * @param totalImages - Total number of images available
 */
export function trackDogImageView(
  dogId: string,
  imageIndex: number,
  totalImages: number,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `Viewed image ${imageIndex + 1} of ${totalImages}`,
      data: {
        dogId,
        imageIndex,
        totalImages,
      },
    });
  } catch (error) {
    console.error("Failed to track dog image view:", error);
  }
}

/**
 * Tracks when a user adds or removes a dog from favorites.
 * Should be called when favorite button/heart icon is clicked.
 * @param action - Whether dog was added or removed from favorites
 * @param dogId - Unique identifier for the dog
 * @param dogName - Name of the dog
 * @param orgSlug - Organization slug the dog belongs to
 */
export function trackFavoriteToggle(
  action: "add" | "remove",
  dogId: string,
  dogName: string,
  orgSlug: string,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `${action === "add" ? "Added" : "Removed"} favorite: ${dogName}`,
      data: {
        action,
        dogId,
        dogName,
        orgSlug,
      },
    });
  } catch (error) {
    console.error("Failed to track favorite toggle:", error);
  }
}

/**
 * Tracks when a user views their favorites page.
 * Should be called on favorites page load.
 * @param count - Number of dogs in favorites
 */
export function trackFavoritesPageView(count: number): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Viewed favorites page with ${count} dogs`,
      data: {
        count,
      },
    });
  } catch (error) {
    console.error("Failed to track favorites page view:", error);
  }
}

/**
 * Tracks when a user performs a search.
 * Should be called when search is executed.
 * @param query - Search query text (optional)
 * @param filters - Active filters as key-value pairs
 * @param resultCount - Number of results returned
 */
export function trackSearch(
  query: string | undefined,
  filters: Record<string, any>,
  resultCount: number,
): void {
  try {
    const filterCount = Object.keys(filters).length;
    const message = query
      ? `Searched for "${query}" with ${filterCount} filters`
      : `Applied ${filterCount} filters`;

    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `${message} (${resultCount} results)`,
      data: {
        query: query || null,
        filters,
        resultCount,
      },
    });
  } catch (error) {
    console.error("Failed to track search:", error);
  }
}

/**
 * Tracks when a user changes a filter.
 * Should be called when any individual filter is modified.
 * @param filterType - Type of filter changed (e.g., 'breed', 'age', 'size')
 * @param value - New value of the filter
 * @param resultCount - Number of results after filter applied
 */
export function trackFilterChange(
  filterType: string,
  value: any,
  resultCount: number,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `Changed filter: ${filterType} to ${JSON.stringify(value)}`,
      data: {
        filterType,
        value,
        resultCount,
      },
    });
  } catch (error) {
    console.error("Failed to track filter change:", error);
  }
}

/**
 * Tracks when a user changes sort order.
 * Should be called when sort dropdown/option is changed.
 * @param sortBy - New sort option (e.g., 'newest', 'name', 'age')
 */
export function trackSortChange(sortBy: string): void {
  try {
    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `Changed sort to: ${sortBy}`,
      data: {
        sortBy,
      },
    });
  } catch (error) {
    console.error("Failed to track sort change:", error);
  }
}

/**
 * Tracks when a user views an organization page.
 * Should be called on organization page load.
 * @param orgSlug - Organization slug/identifier
 * @param dogCount - Number of dogs from this organization
 */
export function trackOrgPageView(orgSlug: string, dogCount: number): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Viewed organization: ${orgSlug}`,
      data: {
        orgSlug,
        dogCount,
      },
    });
  } catch (error) {
    console.error("Failed to track organization page view:", error);
  }
}

/**
 * Tracks when a user clicks an external link.
 * Should be called before navigation to external site.
 * @param linkType - Type of external link
 * @param orgSlug - Organization associated with the link
 * @param dogId - Dog ID if link is dog-specific (optional)
 */
export function trackExternalLinkClick(
  linkType: "adopt" | "donate" | "org-website",
  orgSlug: string,
  dogId?: string,
): void {
  try {
    const message = dogId
      ? `Clicked ${linkType} link for dog ${dogId}`
      : `Clicked ${linkType} link for ${orgSlug}`;

    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message,
      data: {
        linkType,
        orgSlug,
        dogId: dogId || null,
      },
    });
  } catch (error) {
    console.error("Failed to track external link click:", error);
  }
}

/**
 * Tracks when a user navigates using pagination.
 * Should be called when pagination buttons are clicked.
 * @param page - Page number navigated to (1-indexed)
 * @param totalPages - Total number of pages available
 */
export function trackPaginationClick(page: number, totalPages: number): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Navigated to page ${page} of ${totalPages}`,
      data: {
        page,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to track pagination click:", error);
  }
}

/**
 * Utility function to get current breadcrumb count for testing.
 * Only works in development mode.
 */
export function getCurrentBreadcrumbCount(): number {
  if (process.env.NODE_ENV !== "development") {
    return 0;
  }

  try {
    const client = Sentry.getClient();
    const scope = Sentry.getCurrentScope();
    // This is a simplified approach - actual implementation may vary
    return 0; // Sentry doesn't expose breadcrumb count directly
  } catch {
    return 0;
  }
}

/**
 * Utility function to manually add a test breadcrumb for development.
 * Only works in development mode.
 */
export function addTestBreadcrumb(
  message: string,
  data?: Record<string, any>,
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  try {
    Sentry.addBreadcrumb({
      category: "test",
      type: "debug",
      level: "debug",
      message: `[TEST] ${message}`,
      data: data || {},
    });
  } catch (error) {
    console.error("Failed to add test breadcrumb:", error);
  }
}

/**
 * Debounced version of trackSearch.
 * Waits for user to stop typing before tracking search.
 * @param query - Search query text (optional)
 * @param filters - Active filters as key-value pairs
 * @param resultCount - Number of results returned
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 */
export function trackSearchDebounced(
  query: string | undefined,
  filters: Record<string, any>,
  resultCount: number,
  delay: number = 500,
): void {
  const timerId = debounceTimers.get("search");
  if (timerId) {
    clearTimeout(timerId);
  }

  const newTimer = setTimeout(() => {
    trackSearch(query, filters, resultCount);
    debounceTimers.delete("search");
  }, delay);

  debounceTimers.set("search", newTimer);
}

/**
 * Debounced version of trackFilterChange.
 * Waits for user to stop changing filters before tracking.
 * @param filterType - Type of filter changed (e.g., 'breed', 'age', 'size')
 * @param value - New value of the filter
 * @param resultCount - Number of results after filter applied
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 */
export function trackFilterChangeDebounced(
  filterType: string,
  value: any,
  resultCount: number,
  delay: number = 300,
): void {
  const timerKey = `filter-${filterType}`;
  const timerId = debounceTimers.get(timerKey);
  if (timerId) {
    clearTimeout(timerId);
  }

  const newTimer = setTimeout(() => {
    trackFilterChange(filterType, value, resultCount);
    debounceTimers.delete(timerKey);
  }, delay);

  debounceTimers.set(timerKey, newTimer);
}

/**
 * Cancels all pending debounced tracking calls.
 * Useful for cleanup when component unmounts.
 */
export function cancelPendingTracking(): void {
  debounceTimers.forEach((timer) => clearTimeout(timer));
  debounceTimers.clear();
}

/**
 * Tracks when a user selects dogs for comparison.
 * Should be called when dogs are added/removed from comparison selection.
 * @param action - Whether dog was selected or deselected for comparison
 * @param dogId - Unique identifier for the dog
 * @param dogName - Name of the dog
 * @param selectedCount - Current number of dogs selected for comparison
 */
export function trackCompareSelection(
  action: "select" | "deselect",
  dogId: string,
  dogName: string,
  selectedCount: number,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `${action === "select" ? "Selected" : "Deselected"} dog for comparison: ${dogName}`,
      data: {
        action,
        dogId,
        dogName,
        selectedCount,
      },
    });
  } catch (error) {
    console.error("Failed to track compare selection:", error);
  }
}

/**
 * Tracks when a user initiates dog comparison.
 * Should be called when compare button is clicked.
 * @param dogIds - Array of dog IDs being compared
 * @param dogNames - Array of dog names being compared
 */
export function trackCompareInitiation(
  dogIds: string[],
  dogNames: string[],
): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Started comparison of ${dogIds.length} dogs`,
      data: {
        dogIds,
        dogNames,
        compareCount: dogIds.length,
      },
    });
  } catch (error) {
    console.error("Failed to track compare initiation:", error);
  }
}

/**
 * Tracks when a user shares content.
 * Should be called when any share action is triggered.
 * @param shareType - Type of content being shared
 * @param method - Share method used
 * @param contentId - ID of content being shared (dog ID, favorites list ID, etc.)
 * @param contentDescription - Human-readable description of shared content
 */
export function trackShare(
  shareType: "dog" | "favorites" | "search-results",
  method: "copy-link" | "email" | "social" | "native-share",
  contentId: string,
  contentDescription?: string,
): void {
  try {
    const message = contentDescription
      ? `Shared ${shareType}: ${contentDescription} via ${method}`
      : `Shared ${shareType} via ${method}`;

    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message,
      data: {
        shareType,
        method,
        contentId,
        contentDescription: contentDescription || null,
      },
    });
  } catch (error) {
    console.error("Failed to track share:", error);
  }
}

/**
 * Tracks when a user interacts with the favorites share feature.
 * Should be called when user generates or shares a favorites link.
 * @param action - Action performed with favorites
 * @param favoritesCount - Number of favorites being shared
 * @param shareUrl - Generated share URL (optional)
 */
export function trackFavoritesShare(
  action: "generate-link" | "copy-link" | "share",
  favoritesCount: number,
  shareUrl?: string,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message: `${action} favorites list with ${favoritesCount} dogs`,
      data: {
        action,
        favoritesCount,
        shareUrl: shareUrl || null,
      },
    });
  } catch (error) {
    console.error("Failed to track favorites share:", error);
  }
}

/**
 * Tracks page load performance metrics.
 * Should be called after page has fully loaded with performance data.
 * @param page - Page identifier
 * @param loadTime - Time taken to load in milliseconds
 * @param dataFetchTime - Time taken to fetch data in milliseconds (optional)
 */
export function trackPageLoadPerformance(
  page: string,
  loadTime: number,
  dataFetchTime?: number,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "performance",
      type: "default",
      level: "info",
      message: `Page ${page} loaded in ${loadTime}ms`,
      data: {
        page,
        loadTime,
        dataFetchTime: dataFetchTime || null,
        slow: loadTime > 3000,
      },
    });
  } catch (error) {
    console.error("Failed to track page load performance:", error);
  }
}

/**
 * Tracks header navigation clicks.
 * Should be called when any header navigation item is clicked.
 * @param destination - Navigation destination
 * @param isAuthenticated - Whether user is authenticated (if applicable)
 */
export function trackHeaderNavigation(
  destination: string,
  isAuthenticated?: boolean,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Header navigation to: ${destination}`,
      data: {
        destination,
        isAuthenticated: isAuthenticated ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to track header navigation:", error);
  }
}

/**
 * Tracks footer navigation clicks.
 * Should be called when any footer link is clicked.
 * @param destination - Navigation destination or link type
 * @param isExternal - Whether the link is external
 */
export function trackFooterNavigation(
  destination: string,
  isExternal: boolean,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Footer navigation to: ${destination}`,
      data: {
        destination,
        isExternal,
      },
    });
  } catch (error) {
    console.error("Failed to track footer navigation:", error);
  }
}

/**
 * Tracks empty state interactions.
 * Should be called when user interacts with empty state UI.
 * @param context - Where the empty state was shown
 * @param action - What action was taken (if any)
 */
export function trackEmptyStateInteraction(
  context: "favorites" | "search" | "organization",
  action?: "browse-all" | "clear-filters" | "add-first",
): void {
  try {
    const message = action
      ? `Empty state interaction in ${context}: ${action}`
      : `Viewed empty state in ${context}`;

    Sentry.addBreadcrumb({
      category: "ui",
      type: "user",
      level: "info",
      message,
      data: {
        context,
        action: action || null,
      },
    });
  } catch (error) {
    console.error("Failed to track empty state interaction:", error);
  }
}

/**
 * Tracks catalog page loads with initial state.
 * Should be called when catalog/search page loads.
 * @param initialResultCount - Number of dogs shown initially
 * @param hasFilters - Whether any filters are pre-applied
 */
export function trackCatalogPageLoad(
  initialResultCount: number,
  hasFilters: boolean,
): void {
  try {
    Sentry.addBreadcrumb({
      category: "navigation",
      type: "navigation",
      level: "info",
      message: `Loaded catalog with ${initialResultCount} dogs`,
      data: {
        initialResultCount,
        hasFilters,
      },
    });
  } catch (error) {
    console.error("Failed to track catalog page load:", error);
  }
}

/**
 * Tracks about page interactions.
 * Should be called for significant interactions on about page.
 * @param action - Type of interaction
 * @param target - What was interacted with
 */
export function trackAboutPageInteraction(
  action: "view" | "mailto-click" | "external-link",
  target?: string,
): void {
  try {
    const message = target
      ? `About page ${action}: ${target}`
      : `About page ${action}`;

    Sentry.addBreadcrumb({
      category: action === "view" ? "navigation" : "ui",
      type: action === "view" ? "navigation" : "user",
      level: "info",
      message,
      data: {
        action,
        target: target || null,
      },
    });
  } catch (error) {
    console.error("Failed to track about page interaction:", error);
  }
}
