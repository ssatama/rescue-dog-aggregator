import { canGoBackOnSite } from "../siteHistory";

describe("canGoBackOnSite", () => {
  const win = window as { navigation?: { canGoBack: boolean } };
  afterEach(() => {
    delete win.navigation;
  });

  it("follows the Navigation API, which counts only this site's entries", () => {
    win.navigation = { canGoBack: false };
    expect(canGoBackOnSite()).toBe(false);
    win.navigation = { canGoBack: true };
    expect(canGoBackOnSite()).toBe(true);
  });

  it("falls back to the history length without it", () => {
    const length = jest.spyOn(window.history, "length", "get");
    length.mockReturnValue(1);
    expect(canGoBackOnSite()).toBe(false);
    length.mockReturnValue(3);
    expect(canGoBackOnSite()).toBe(true);
    length.mockRestore();
  });
});
