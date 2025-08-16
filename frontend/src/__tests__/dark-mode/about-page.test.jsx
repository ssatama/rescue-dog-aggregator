/**
 * @jest-environment jsdom
 */

import { render, screen } from "../../test-utils";
import "@testing-library/jest-dom";
import AboutPage from "../../app/about/page";

// Mock Layout component
jest.mock("../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: function MockButton({ children, asChild, size, ...props }) {
    if (asChild) {
      return <div {...props}>{children}</div>;
    }
    return <button {...props}>{children}</button>;
  },
}));

// Mock Link component
jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("About Page Dark Mode", () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = "";
  });

  test("page header has dark mode text colors", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<AboutPage />);

    // Main title
    const title = screen.getByText("About Rescue Dog Aggregator");
    expect(title).toHaveClass("text-gray-900");
    expect(title).toHaveClass("dark:text-gray-100");

    // Subtitle
    const subtitle = screen.getByText(
      "Connecting loving homes with rescue dogs in need.",
    );
    expect(subtitle).toHaveClass("text-gray-600");
    expect(subtitle).toHaveClass("dark:text-gray-400");

    // Verify dark class is applied to document
    expect(document.documentElement).toHaveClass("dark");
  });

  test("section headings have dark mode colors", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<AboutPage />);

    const sectionHeadings = [
      screen.getByText("Our Mission"),
      screen.getByText("How It Works"),
      screen.getByText("Get Involved"),
    ];

    sectionHeadings.forEach((heading) => {
      expect(heading).toHaveClass("text-gray-800");
      expect(heading).toHaveClass("dark:text-gray-200");
    });
  });

  test("body text has dark mode colors", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<AboutPage />);

    // Mission text
    const missionText = screen.getByText(/Our mission is to simplify/);
    expect(missionText).toHaveClass("text-gray-700");
    expect(missionText).toHaveClass("dark:text-gray-300");

    // Get involved text
    const involvedText = screen.getByText(/Are you a rescue organization/);
    expect(involvedText).toHaveClass("text-gray-700");
    expect(involvedText).toHaveClass("dark:text-gray-300");
  });

  test("how it works section has dark background", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<AboutPage />);

    // Find the How It Works section by its heading, then find its parent container
    const howItWorksHeading = screen.getByText("How It Works");
    const howItWorksSection = howItWorksHeading.closest("section");

    expect(howItWorksSection).toHaveClass("bg-gray-50");
    expect(howItWorksSection).toHaveClass("dark:bg-gray-800");
  });

  test("step titles in how it works section have dark mode colors", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<AboutPage />);

    const stepTitles = [
      screen.getByText("1. Browse Dogs"),
      screen.getByText("2. View Details"),
      screen.getByText("3. Connect & Adopt"),
    ];

    stepTitles.forEach((title) => {
      expect(title).toHaveClass("text-gray-900");
      expect(title).toHaveClass("dark:text-gray-100");
    });
  });

  test("step descriptions have dark mode colors", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<AboutPage />);

    // Find step descriptions by their text content
    const browseDescription = screen.getByText(
      /Use our search and filter tools/,
    );
    const detailsDescription = screen.getByText(/Click on a dog's profile/);
    const connectDescription = screen.getByText(/Use the provided links/);

    [browseDescription, detailsDescription, connectDescription].forEach(
      (desc) => {
        expect(desc).toHaveClass("text-gray-600");
        expect(desc).toHaveClass("dark:text-gray-400");
      },
    );
  });

  test("contact button maintains proper styling in dark mode", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<AboutPage />);

    const contactButton = screen.getByText("Contact Us");
    expect(contactButton).toBeInTheDocument();

    // The button should be wrapped by the Button component which handles its own dark mode styling
    expect(contactButton.closest("a")).toHaveAttribute(
      "href",
      "mailto:rescuedogsme@gmail.com",
    );
  });
});
