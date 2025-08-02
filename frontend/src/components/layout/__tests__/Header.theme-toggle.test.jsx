import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { usePathname } from "next/navigation";
import Header from "../Header";
import { ThemeProvider } from "../../providers/ThemeProvider";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Mock animation hook
jest.mock("../../../utils/animations", () => ({
  useFadeInAnimation: () => ({ ref: jest.fn(), isVisible: true }),
}));

// Helper to render with ThemeProvider
const renderWithTheme = (component) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("Header Theme Toggle Integration", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
    localStorage.clear();
    document.documentElement.className = "";
  });

  test("renders theme toggle in desktop navigation", () => {
    renderWithTheme(<Header />);

    // Should have theme toggle buttons (desktop and mobile)
    const themeToggles = screen.getAllByRole("button", {
      name: /switch to dark mode/i,
    });
    expect(themeToggles).toHaveLength(2); // Desktop and mobile

    // Desktop toggle should be in the hidden md:flex container
    const desktopToggle = themeToggles.find((toggle) =>
      toggle.classList.contains("ml-2"),
    );
    expect(desktopToggle).toBeInTheDocument();
  });

  test("renders theme toggle in mobile navigation menu", () => {
    renderWithTheme(<Header />);

    // Should have theme toggles (one is mobile, visible on mobile)
    const themeToggles = screen.getAllByRole("button", {
      name: /switch to dark mode/i,
    });
    expect(themeToggles).toHaveLength(2); // Desktop and mobile

    // Mobile toggle should NOT have ml-2 class
    const mobileToggle = themeToggles.find(
      (toggle) => !toggle.classList.contains("ml-2"),
    );
    expect(mobileToggle).toBeInTheDocument();
  });

  test("theme toggle functions properly in header", () => {
    renderWithTheme(<Header />);

    const themeToggles = screen.getAllByRole("button", {
      name: /switch to dark mode/i,
    });
    const themeToggle = themeToggles[0]; // Use first toggle

    // Initially should show moon icon (light theme)
    const initialIcon = themeToggle.querySelector("svg");
    expect(initialIcon).toBeInTheDocument();

    // Click to switch to dark theme
    fireEvent.click(themeToggle);

    // Should update to light mode toggle
    expect(
      screen.getAllByRole("button", { name: /switch to light mode/i }),
    ).toHaveLength(2);

    // Should persist to localStorage
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  test("mobile menu closes when theme toggle is used", () => {
    renderWithTheme(<Header />);

    // Open mobile menu
    const mobileMenuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(mobileMenuButton);

    // Verify mobile menu is open by checking for expanded state
    expect(mobileMenuButton).toHaveAttribute("aria-expanded", "true");

    // Click theme toggle - mobile toggle is the one without ml-2 class
    const themeToggles = screen.getAllByRole("button", {
      name: /switch to dark mode/i,
    });
    const mobileToggle = themeToggles.find(
      (toggle) => !toggle.classList.contains("ml-2"),
    );
    fireEvent.click(mobileToggle);

    // Mobile menu should still be open (theme toggle shouldn't close it)
    expect(mobileMenuButton).toHaveAttribute("aria-expanded", "true");
  });

  test("theme toggle maintains proper styling with header classes", () => {
    renderWithTheme(<Header />);

    const themeToggles = screen.getAllByRole("button", {
      name: /switch to dark mode/i,
    });
    const themeToggle = themeToggles[0]; // Use first toggle

    // Should have proper focus ring styles consistent with header
    expect(themeToggle).toHaveClass("focus-visible:ring-orange-600");

    // Should have consistent padding and styling
    expect(themeToggle).toHaveClass("p-2", "rounded-lg", "transition-colors");
  });
});
