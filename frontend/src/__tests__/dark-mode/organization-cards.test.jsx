/**
 * @jest-environment jsdom
 */

import { render, screen } from "../../test-utils";
import "@testing-library/jest-dom";
import OrganizationCard from "../../components/organizations/OrganizationCard";

// Mock LazyImage component
jest.mock("../../components/ui/LazyImage", () => {
  return function MockLazyImage({ src, alt, className, placeholder, onError }) {
    return <img src={src} alt={alt} className={className} />;
  };
});

// Mock SocialMediaLinks component
jest.mock("../../components/ui/SocialMediaLinks", () => {
  return function MockSocialMediaLinks({ socialMedia, className, size }) {
    return (
      <div data-testid="social-media-links" className={className}>
        Social Links
      </div>
    );
  };
});

// Mock button component
jest.mock("@/components/ui/button", () => ({
  Button: function MockButton({
    children,
    asChild,
    variant,
    size,
    className,
    ...props
  }) {
    if (asChild) {
      return (
        <div className={className} {...props}>
          {children}
        </div>
      );
    }
    return (
      <button className={className} {...props}>
        {children}
      </button>
    );
  },
}));

const mockOrganization = {
  id: 1,
  name: "REAN (Rescuing European Animals in Need)",
  country: "GB",
  city: "London",
  service_regions: ["GB", "DE"],
  ships_to: ["GB", "DE", "FR"],
  website_url: "https://rean.org.uk",
  total_dogs: 28,
  new_this_week: 5,
  recent_dogs: [
    { id: 1, name: "Buddy", thumbnail_url: "/buddy.jpg" },
    { id: 2, name: "Luna", thumbnail_url: "/luna.jpg" },
    { id: 3, name: "Max", thumbnail_url: "/max.jpg" },
  ],
  social_media: {
    facebook: "https://facebook.com/rean",
    instagram: "https://instagram.com/rean",
  },
};

describe("OrganizationCard Dark Mode", () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = "";
  });

  test("organization card has dark background in dark mode", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<OrganizationCard organization={mockOrganization} />);

    // Find the main card element (it should be the first button element)
    const card = screen.getAllByRole("button")[0];
    expect(card).toBeInTheDocument();

    // Should have card background class that works with CSS variables
    expect(card).toHaveClass("bg-card");
    expect(card).toHaveClass("text-card-foreground");

    // Should have dark mode shadow classes
    expect(card).toHaveClass("dark:shadow-lg");
    expect(card).toHaveClass("dark:shadow-purple-500/5");

    // Verify dark class is applied to document
    expect(document.documentElement).toHaveClass("dark");
  });

  test("organization card has light background in light mode", () => {
    // Light mode (default)
    render(<OrganizationCard organization={mockOrganization} />);

    const card = screen.getAllByRole("button")[0];
    expect(card).toHaveClass("bg-card");
    expect(card).toHaveClass("text-card-foreground");
    expect(card).toHaveClass("shadow-sm");

    // Verify dark class is NOT applied to document
    expect(document.documentElement).not.toHaveClass("dark");
  });

  test("text elements use proper dark mode classes", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<OrganizationCard organization={mockOrganization} />);

    // Organization name should use foreground color
    const orgName = screen.getByText(mockOrganization.name);
    expect(orgName).toHaveClass("text-foreground");

    // Location info should use muted foreground
    const location = screen.getByText("London, GB");
    expect(location).toHaveClass("text-muted-foreground");

    // "Based in" labels should use foreground
    const basedInText = screen.getByText("Based in:");
    expect(basedInText.closest("div")).toHaveClass("text-foreground");
  });

  test("buttons maintain proper styling in dark mode", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<OrganizationCard organization={mockOrganization} />);

    // Visit Website button (outline variant) - check its parent button element
    const visitButtonText = screen.getByText("Visit Website");
    const visitButton = visitButtonText.closest("a").parentElement; // Get the Button wrapper
    expect(visitButton).toHaveClass("text-foreground");
    expect(visitButton).toHaveClass("border-border");
    expect(visitButton).toHaveClass("hover:bg-muted");

    // View Dogs button (primary)
    const viewButton = screen.getByText("28 Dogs").closest("button");
    expect(viewButton).toHaveClass("bg-orange-600");
    expect(viewButton).toHaveClass("hover:bg-orange-700");
    expect(viewButton).toHaveClass("text-white");
  });

  test("new this week badge has proper colors", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<OrganizationCard organization={mockOrganization} />);

    // Find the "NEW" badge
    const newBadge = screen.getByText("5 NEW");
    expect(newBadge).toHaveClass("bg-green-100");
    expect(newBadge).toHaveClass("text-green-800");

    // This badge should have dark mode variants
    expect(newBadge).toHaveClass("dark:bg-green-900/30");
    expect(newBadge).toHaveClass("dark:text-green-400");
  });
});
