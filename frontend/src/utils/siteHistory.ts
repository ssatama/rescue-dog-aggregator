/**
 * Whether going back stays on the site (#518). The Navigation API lists only
 * this site's entries and ignores replaces, so a visitor who landed from
 * Google or a shared link has none behind them. Browsers without it fall back
 * to the history length, which also counts other sites' pages.
 */
export function canGoBackOnSite(): boolean {
  const navigation = (window as { navigation?: { canGoBack: boolean } }).navigation;
  return navigation ? navigation.canGoBack : window.history.length > 1;
}
