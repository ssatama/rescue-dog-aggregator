import { render, screen } from "@testing-library/react";
import PrivacyPage, { metadata } from "../page";

jest.mock("../../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../../components/ui/Breadcrumbs", () => {
  return function MockBreadcrumbs({ items }) {
    return (
      <nav data-testid="breadcrumbs" aria-label="breadcrumb">
        {items.map((item, i) => (
          <span key={i}>{item.name}</span>
        ))}
      </nav>
    );
  };
});

jest.mock("../../../components/seo", () => ({
  BreadcrumbSchema: function MockBreadcrumbSchema() {
    return <script data-testid="breadcrumb-schema" type="application/ld+json" />;
  },
}));

describe("Privacy Page", () => {
  describe("Metadata", () => {
    test("has correct title", () => {
      expect(metadata.title).toBe("Privacy Policy | Rescue Dog Aggregator");
    });

    test("has description under 160 characters", () => {
      expect(metadata.description.length).toBeLessThanOrEqual(160);
    });

    test("has canonical URL", () => {
      expect(metadata.alternates.canonical).toBe(
        "https://www.rescuedogs.me/privacy"
      );
    });

    test("has OpenGraph metadata", () => {
      expect(metadata.openGraph.title).toContain("Privacy");
      expect(metadata.openGraph.type).toBe("website");
      expect(metadata.openGraph.siteName).toBe("Rescue Dog Aggregator");
    });

    test("has Twitter metadata", () => {
      expect(metadata.twitter.card).toBe("summary");
      expect(metadata.twitter.title).toContain("Privacy");
    });
  });

  describe("Page Content", () => {
    beforeEach(() => {
      render(<PrivacyPage />);
    });

    test("renders page title", () => {
      expect(
        screen.getByRole("heading", { level: 1, name: /privacy policy/i })
      ).toBeInTheDocument();
    });

    test("renders breadcrumbs with correct items", () => {
      const breadcrumbs = screen.getByTestId("breadcrumbs");
      expect(breadcrumbs).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Privacy")).toBeInTheDocument();
    });

    test("renders no cookie banner section", () => {
      expect(
        screen.getByText(/notice something missing/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/we don't use cookies/i)
      ).toBeInTheDocument();
    });

    test("renders What We Collect section", () => {
      expect(
        screen.getByRole("heading", { name: /what we collect/i })
      ).toBeInTheDocument();
    });

    test("renders favorites localStorage info", () => {
      expect(
        screen.getByRole("heading", { name: /your favorites/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/stored in your browser's localstorage/i)
      ).toBeInTheDocument();
    });

    test("renders Vercel Analytics info with link", () => {
      expect(screen.getByText(/anonymous analytics/i)).toBeInTheDocument();
      const vercelLink = screen.getByRole("link", { name: /vercel analytics/i });
      expect(vercelLink).toHaveAttribute(
        "href",
        "https://vercel.com/docs/analytics/privacy-policy"
      );
      expect(vercelLink).toHaveAttribute("target", "_blank");
    });

    test("renders What We Don't Collect section", () => {
      expect(
        screen.getByRole("heading", { name: /what we don't collect/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/no user accounts/i)).toBeInTheDocument();
      expect(screen.getByText(/no email addresses/i)).toBeInTheDocument();
      expect(screen.getByText(/no personal tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/no data sold/i)).toBeInTheDocument();
      // "No cookies" appears in multiple sections, verify at least one exists
      expect(screen.getAllByText(/no cookies/i).length).toBeGreaterThanOrEqual(1);
    });

    test("renders Error Monitoring section with Sentry link", () => {
      expect(
        screen.getByRole("heading", { name: /error monitoring/i })
      ).toBeInTheDocument();
      const sentryLink = screen.getByRole("link", { name: /sentry/i });
      expect(sentryLink).toHaveAttribute("href", "https://sentry.io/privacy/");
      expect(sentryLink).toHaveAttribute("target", "_blank");
    });

    test("renders Dog Data Sources section", () => {
      expect(
        screen.getByRole("heading", { name: /dog data sources/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/aggregated from public rescue organization/i)
      ).toBeInTheDocument();
    });

    test("renders Open Source section with GitHub link", () => {
      expect(
        screen.getByRole("heading", { name: /open source.*contact/i })
      ).toBeInTheDocument();
      const githubLink = screen.getByRole("link", { name: /view on github/i });
      expect(githubLink).toHaveAttribute(
        "href",
        "https://github.com/ssatama/rescue-dog-aggregator"
      );
      expect(githubLink).toHaveAttribute("target", "_blank");
    });

    test("renders Contact Us link pointing to About page contact section", () => {
      const contactLink = screen.getByRole("link", { name: /contact us/i });
      expect(contactLink).toHaveAttribute("href", "/about#contact");
    });

    test("renders last updated date", () => {
      expect(screen.getByText(/last updated.*december 2025/i)).toBeInTheDocument();
    });

    test("renders BreadcrumbSchema for SEO", () => {
      expect(screen.getByTestId("breadcrumb-schema")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      render(<PrivacyPage />);
    });

    test("has single h1 heading", () => {
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
    });

    test("has proper heading hierarchy", () => {
      const h2s = screen.getAllByRole("heading", { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(5);
    });

    test("external links have proper attributes", () => {
      const externalLinks = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("target") === "_blank");

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });
});