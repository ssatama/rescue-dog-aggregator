// src/app/dogs/[slug]/__tests__/DogDetailClient.integration.test.jsx
// TDD Phase 3: RED - Tests for dog detail OrganizationCard integration

import React from "react";
import { render, screen, waitFor } from "../../../../test-utils";
import "@testing-library/jest-dom";
import DogDetailClient from "../DogDetailClient";
import { getAnimalBySlug } from "../../../../services/animalsService";

// Mock the animalsService
jest.mock("../../../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
}));

// Mock OrganizationCard to verify props
jest.mock("../../../../components/organizations/OrganizationCard", () => {
  return function MockOrganizationCard({ organization, size }) {
    return (
      <div
        data-testid="organization-card-mock"
        data-size={size}
        data-org-id={organization?.id}
        data-org-name={organization?.name}
      >
        OrganizationCard - {organization?.name} - Size: {size}
      </div>
    );
  };
});

// Mock other components and utilities
jest.mock("../../../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../../../components/ui/DogDetailSkeleton", () => {
  return function MockDogDetailSkeleton() {
    return <div data-testid="dog-detail-skeleton">Loading...</div>;
  };
});

jest.mock("../../../../components/ui/ShareButton", () => {
  return function MockShareButton() {
    return <button data-testid="share-button">Share</button>;
  };
});

jest.mock("../../../../components/ui/MobileStickyBar", () => {
  return function MockMobileStickyBar() {
    return <div data-testid="mobile-sticky-bar">Mobile Bar</div>;
  };
});

jest.mock("../../../../components/error/DogDetailErrorBoundary", () => {
  return function MockDogDetailErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

jest.mock("../../../../components/ui/Toast", () => ({
  ToastProvider: ({ children }) => (
    <div data-testid="toast-provider">{children}</div>
  ),
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock("../../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

// Mock the LLM detail components
jest.mock("../../../../components/dogs/detail", () => ({
  PersonalityTraits: ({ profilerData }) => {
    if (!profilerData || (profilerData.confidence_scores?.personality_traits || 0) <= 0.5) {
      return null;
    }
    return <div data-testid="personality-traits">Personality Traits</div>;
  },
  EnergyTrainability: ({ profilerData }) => {
    if (!profilerData || (!profilerData.energy_level && !profilerData.trainability)) {
      return null;
    }
    return <div data-testid="energy-trainability">Energy & Trainability</div>;
  },
  CompatibilityIcons: ({ profilerData }) => {
    if (!profilerData) return null;
    return <div data-testid="compatibility-icons">Compatibility</div>;
  },
  ActivitiesQuirks: ({ profilerData }) => {
    if (!profilerData) return null;
    return <div data-testid="activities-quirks">Activities & Quirks</div>;
  },
  NavigationArrows: ({ onPrev, onNext, hasPrev, hasNext, isLoading }) => (
    <div data-testid="navigation-arrows">
      {hasPrev && (
        <button data-testid="nav-arrow-prev" onClick={onPrev} disabled={isLoading}>
          Previous
        </button>
      )}
      {hasNext && (
        <button data-testid="nav-arrow-next" onClick={onNext} disabled={isLoading}>
          Next
        </button>
      )}
    </div>
  ),
}));

// Mock the useSwipeNavigation hook
jest.mock("../../../../hooks/useSwipeNavigation", () => ({
  useSwipeNavigation: () => ({
    handlers: {},
    prevDog: null,
    nextDog: null,
    isLoading: false,
  }),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "test-dog-mixed-breed-1" }),
  usePathname: () => "/dogs/test-dog-mixed-breed-1",
  useSearchParams: () => ({
    entries: () => [],
    toString: () => "",
  }),
}));

// Mock all other potentially problematic components
jest.mock("../../../../components/dogs/RelatedDogsSection", () => {
  return function MockRelatedDogsSection() {
    return <div data-testid="related-dogs-section">Related Dogs</div>;
  };
});

jest.mock("../../../../components/dogs/DogDescription", () => {
  return function MockDogDescription() {
    return <div data-testid="dog-description">Dog Description</div>;
  };
});

jest.mock("../../../../hooks/useScrollAnimation", () => ({
  ScrollAnimationWrapper: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../../../components/ui/HeroImageWithBlurredBackground", () => {
  return function MockHeroImage() {
    return <div data-testid="hero-image">Hero Image</div>;
  };
});

describe("DogDetailClient Dog Detail Integration", () => {
  const mockDogData = {
    id: "test-dog-1",
    slug: "test-dog-mixed-breed-1",
    name: "Buddy",
    primary_image_url: "https://example.com/buddy.jpg",
    breed: "Golden Retriever",
    standardized_breed: "Golden Retriever",
    sex: "Male",
    age_min_months: 24,
    status: "available",
    adoption_url: "https://organization.com/adopt/buddy",
    properties: {
      description: "Friendly dog looking for a home.",
    },
    organization_id: "org-123",
    organization: {
      id: "org-123",
      name: "Happy Tails Rescue",
      website_url: "https://happytails.org",
      logo_url: "https://example.com/logo.jpg",
      country: "US",
      city: "San Francisco",
      service_regions: ["US", "CA"],
      ships_to: ["US", "CA", "MX"],
      total_dogs: 25,
      new_this_week: 3,
      recent_dogs: [
        { id: "dog1", name: "Max", thumbnail_url: "max.jpg" },
        { id: "dog2", name: "Luna", thumbnail_url: "luna.jpg" },
      ],
      social_media: {
        facebook: "happytails",
        instagram: "happytails_rescue",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { getAnimalBySlug } = require("../../../../services/animalsService");
    getAnimalBySlug.mockResolvedValue(mockDogData);

    // Mock window.location for navigation tests
    delete window.location;
    window.location = { href: "http://localhost/dogs/test-dog-mixed-breed-1" };
  });

  describe("OrganizationCard Integration", () => {
    test("renders OrganizationCard instead of OrganizationSection", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        expect(
          screen.getByTestId("organization-card-mock"),
        ).toBeInTheDocument();
      });
    });

    test('passes size="medium" prop to OrganizationCard', async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgCard = screen.getByTestId("organization-card-mock");
        expect(orgCard).toHaveAttribute("data-size", "medium");
      });
    });

    test("passes correct organization data to OrganizationCard", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgCard = screen.getByTestId("organization-card-mock");
        expect(orgCard).toHaveAttribute("data-org-id", "org-123");
        expect(orgCard).toHaveAttribute("data-org-name", "Happy Tails Rescue");
      });
    });

    test("no longer renders OrganizationSection component", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        // Should not find the old OrganizationSection elements
        expect(
          screen.queryByTestId("organization-section"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId("organization-header"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId("organization-name"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId("view-all-dogs-link"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId("visit-website-button"),
        ).not.toBeInTheDocument();
      });
    });

    test("maintains organization container positioning", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const container = screen.getByTestId("organization-container");
        expect(container).toBeInTheDocument();

        // OrganizationCard should be within this container
        const orgCard = screen.getByTestId("organization-card-mock");
        expect(container).toContainElement(orgCard);
      });
    });

    test("OrganizationCard appears in proper DOM order", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgContainer = screen.getByTestId("organization-container");
        expect(orgContainer).toBeInTheDocument();

        // OrganizationCard should be within this container
        const orgCard = screen.getByTestId("organization-card-mock");
        expect(orgContainer).toContainElement(orgCard);
      });
    });
  });

  describe("Data Integration", () => {
    test("passes full organization object from dog data", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgCard = screen.getByTestId("organization-card-mock");
        // Verify the organization data is being passed correctly
        expect(orgCard.textContent).toContain("Happy Tails Rescue");
        expect(orgCard.textContent).toContain("medium");
      });
    });

    test("handles missing organization data gracefully", async () => {
      const dogWithoutOrg = { ...mockDogData, organization: null };
      const {
        getAnimalBySlug,
      } = require("../../../../services/animalsService");
      getAnimalBySlug.mockResolvedValue(dogWithoutOrg);

      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        // Should show loading placeholder when no organization data
        const orgContainer = screen.getByTestId("organization-container");
        expect(orgContainer).toBeInTheDocument();

        // Should not render OrganizationCard without data
        expect(
          screen.queryByTestId("organization-card-mock"),
        ).not.toBeInTheDocument();
      });
    });

    test("preserves all organization features in medium size", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgCard = screen.getByTestId("organization-card-mock");

        // Verify all organization data is being passed
        expect(orgCard).toHaveAttribute("data-org-id", "org-123");
        expect(orgCard).toHaveAttribute("data-org-name", "Happy Tails Rescue");
        expect(orgCard).toHaveAttribute("data-size", "medium");
      });
    });
  });

  describe("Layout and Styling", () => {
    test("maintains proper spacing and margins", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgContainer = screen.getByTestId("organization-container");
        expect(orgContainer).toHaveClass("mb-8");
      });
    });

    test("organization section and related dogs section both render", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgContainer = screen.getByTestId("organization-container");
        const relatedSections = screen.queryAllByTestId("related-dogs-section");

        expect(orgContainer).toBeInTheDocument();
        expect(relatedSections.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    test("handles API errors gracefully", async () => {
      const {
        getAnimalBySlug,
      } = require("../../../../services/animalsService");
      getAnimalBySlug.mockRejectedValue(new Error("API Error"));

      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        // Should show error state, not organization card
        expect(
          screen.queryByTestId("organization-card-mock"),
        ).not.toBeInTheDocument();
      });
    });

    test("handles incomplete organization data", async () => {
      const dogWithIncompleteOrg = {
        ...mockDogData,
        organization: {
          id: "org-123",
          name: "Minimal Org",
          // Missing other fields
        },
      };
      const {
        getAnimalBySlug,
      } = require("../../../../services/animalsService");
      getAnimalBySlug.mockResolvedValue(dogWithIncompleteOrg);

      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        const orgCard = screen.getByTestId("organization-card-mock");
        expect(orgCard).toHaveAttribute("data-org-name", "Minimal Org");
        expect(orgCard).toHaveAttribute("data-size", "medium");
      });
    });
  });

  describe("Loading States", () => {
    test("shows skeleton while loading dog data", () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      expect(screen.getByTestId("dog-detail-skeleton")).toBeInTheDocument();
    });

    test("removes skeleton after data loads", async () => {
      render(<DogDetailClient params={{ slug: "test-dog-mixed-breed-1" }} />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("dog-detail-skeleton"),
        ).not.toBeInTheDocument();
        expect(
          screen.getByTestId("organization-card-mock"),
        ).toBeInTheDocument();
      });
    });
  });
});
