/**
 * CRITICAL TEST: Tablet Filter Bug Prevention
 *
 * This test ensures the specific bug that affected tablets (768px-1023px) never happens again:
 * - Mobile filter button shows
 * - Button click opens the drawer
 * - Drawer is actually visible to the user
 *
 * This is the EXACT test that would have caught the original bug.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import DogsPageClient from "../../app/dogs/DogsPageClient";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock service calls
jest.mock("../../services/animalsService", () => ({
  getAnimals: jest.fn(() => Promise.resolve([])),
  getStandardizedBreeds: jest.fn(() => Promise.resolve(["Labrador"])),
  getLocationCountries: jest.fn(() => Promise.resolve(["Germany"])),
  getAvailableCountries: jest.fn(() => Promise.resolve(["Germany"])),
  getAvailableRegions: jest.fn(() => Promise.resolve(["Any region"])),
  getFilterCounts: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../../services/organizationsService", () => ({
  getOrganizations: jest.fn(() =>
    Promise.resolve([{ id: 1, name: "Test Org" }]),
  ),
}));

// Mock Layout
jest.mock("../../components/layout/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

// Set viewport and mock matchMedia
const setTabletViewport = (width) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: width < 1024, // lg:hidden logic
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  window.dispatchEvent(new Event("resize"));
};

describe("CRITICAL: Tablet Filter Bug Prevention", () => {
  const mockRouter = {
    push: jest.fn(),
    pathname: "/dogs",
  };

  const mockSearchParams = {
    get: jest.fn(() => null),
    toString: jest.fn(() => ""),
  };

  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    useSearchParams.mockReturnValue(mockSearchParams);
    jest.clearAllMocks();

    // Reset body styles that might be set by drawer
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
  });

  // These are the exact tablet dimensions that were broken
  const CRITICAL_TABLET_WIDTHS = [
    { width: 744, device: "iPad Mini" },
    { width: 768, device: "Standard Tablet" },
    { width: 820, device: "iPad Air" },
    { width: 1023, device: "Large Tablet" },
  ];

  test.each(CRITICAL_TABLET_WIDTHS)(
    "CRITICAL: $device ($width px) - filter button MUST open drawer",
    async ({ width, device }) => {
      setTabletViewport(width);

      render(<DogsPageClient />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByTestId("dogs-page-container")).toBeInTheDocument();
      });

      // STEP 1: Verify mobile filter button is present and visible
      const mobileFilterButton = screen.getByTestId("mobile-filter-button");
      expect(mobileFilterButton).toBeInTheDocument();
      expect(mobileFilterButton).toBeVisible();

      // STEP 2: Verify desktop filters are properly hidden
      const desktopFilters = document.querySelector(
        '[data-testid="desktop-filters-container"]',
      );
      expect(desktopFilters).toHaveClass("hidden", "lg:block");

      // STEP 3: THE CRITICAL TEST - Click button and drawer MUST appear
      // This is the exact interaction that was broken!
      act(() => {
        fireEvent.click(mobileFilterButton);
      });

      // STEP 4: Verify drawer opens and is visible
      // This assertion would have FAILED before our fix
      await waitFor(
        () => {
          const drawer = screen.getByTestId("mobile-filter-drawer");
          expect(drawer).toBeInTheDocument();
          expect(drawer).toBeVisible();
        },
        { timeout: 1000 },
      );

      // STEP 5: Verify backdrop is also present (may be animating)
      const backdrop = screen.getByTestId("filter-drawer-backdrop");
      expect(backdrop).toBeInTheDocument();

      console.log(
        `✅ CRITICAL TEST PASSED: ${device} (${width}px) - Filter button opens drawer`,
      );
    },
  );

  test("CRITICAL: No dead zone between 768px and 1024px", async () => {
    // Test every major breakpoint in the critical zone
    const testWidths = [768, 800, 900, 1000, 1023];

    for (const width of testWidths) {
      setTabletViewport(width);

      const { unmount } = render(<DogsPageClient />);

      await waitFor(() => screen.getByTestId("dogs-page-container"));

      // Mobile filter button must be present
      const button = screen.getByTestId("mobile-filter-button");
      expect(button).toBeVisible();

      // Button click must open drawer
      act(() => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        const drawer = screen.getByTestId("mobile-filter-drawer");
        expect(drawer).toBeVisible();
      });

      unmount();
    }
  });

  test("CRITICAL: Drawer closes properly", async () => {
    setTabletViewport(768);

    render(<DogsPageClient />);
    await waitFor(() => screen.getByTestId("dogs-page-container"));

    // Open drawer
    act(() => {
      fireEvent.click(screen.getByTestId("mobile-filter-button"));
    });

    await waitFor(() => screen.getByTestId("mobile-filter-drawer"));

    // Close via close button
    const closeButton = screen.getByLabelText("Close filters");
    act(() => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("mobile-filter-drawer"),
      ).not.toBeInTheDocument();
    });
  });

  test("CRITICAL: Drawer closes on backdrop click", async () => {
    setTabletViewport(768);

    render(<DogsPageClient />);
    await waitFor(() => screen.getByTestId("dogs-page-container"));

    // Open drawer
    act(() => {
      fireEvent.click(screen.getByTestId("mobile-filter-button"));
    });

    await waitFor(() => screen.getByTestId("mobile-filter-drawer"));

    // Close via backdrop click
    const backdrop = screen.getByTestId("filter-drawer-backdrop");
    act(() => {
      fireEvent.click(backdrop);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("mobile-filter-drawer"),
      ).not.toBeInTheDocument();
    });
  });

  test("CRITICAL: Multiple rapid clicks do not break drawer", async () => {
    setTabletViewport(768);

    render(<DogsPageClient />);
    await waitFor(() => screen.getByTestId("dogs-page-container"));

    const button = screen.getByTestId("mobile-filter-button");

    // Rapid fire clicks
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    });

    // Should still open properly
    await waitFor(() => {
      expect(screen.getByTestId("mobile-filter-drawer")).toBeVisible();
    });
  });
});
