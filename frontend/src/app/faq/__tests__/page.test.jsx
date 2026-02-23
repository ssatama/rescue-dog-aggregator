import { render, screen, fireEvent } from "@testing-library/react";
import FaqClient from "../FaqClient";
import { metadata } from "../layout";

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
    return (
      <script data-testid="breadcrumb-schema" type="application/ld+json" />
    );
  },
}));

describe("FAQ Page", () => {
  describe("Metadata", () => {
    test("has correct title", () => {
      expect(metadata.title).toBe("Frequently Asked Questions | Rescue Dogs");
    });

    test("has description under 160 characters", () => {
      expect(metadata.description.length).toBeLessThanOrEqual(160);
    });

    test("has canonical URL", () => {
      expect(metadata.alternates.canonical).toBe(
        "https://www.rescuedogs.me/faq"
      );
    });

    test("has OpenGraph metadata", () => {
      expect(metadata.openGraph.title).toContain("FAQ");
      expect(metadata.openGraph.type).toBe("website");
      expect(metadata.openGraph.siteName).toBe("Rescue Dog Aggregator");
    });

    test("has Twitter metadata", () => {
      expect(metadata.twitter.card).toBe("summary");
      expect(metadata.twitter.title).toContain("FAQ");
    });
  });

  describe("Page Content", () => {
    beforeEach(() => {
      render(<FaqClient />);
    });

    test("renders page title", () => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /frequently asked questions/i,
        })
      ).toBeInTheDocument();
    });

    test("renders breadcrumbs with correct items", () => {
      const breadcrumbs = screen.getByTestId("breadcrumbs");
      expect(breadcrumbs).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("FAQ")).toBeInTheDocument();
    });

    test("renders intro text with contact link", () => {
      expect(
        screen.getByText(/everything you need to know about adopting/i)
      ).toBeInTheDocument();
      const contactLink = screen.getByRole("link", { name: /get in touch/i });
      expect(contactLink).toHaveAttribute("href", "/about#contact");
    });

    test("renders all five FAQ sections", () => {
      expect(
        screen.getByRole("heading", { name: /about the platform/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /adoption process/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /success & support/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /why european rescue/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /privacy & contact/i })
      ).toBeInTheDocument();
    });

    test("renders section navigation pills", () => {
      const navLinks = screen.getAllByRole("link", { name: /🐕|📋|💚|🌍|🔒/i });
      expect(navLinks.length).toBe(5);
    });

    test("renders expand/collapse buttons", () => {
      expect(
        screen.getByRole("button", { name: /expand all/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /collapse all/i })
      ).toBeInTheDocument();
    });

    test("renders CTA section with Browse Dogs and Guides links", () => {
      expect(
        screen.getByRole("heading", {
          name: /ready to find your new best friend/i,
        })
      ).toBeInTheDocument();
      const browseLink = screen.getByRole("link", { name: /browse dogs/i });
      expect(browseLink).toHaveAttribute("href", "/dogs");
      const guidesLink = screen.getByRole("link", { name: /read our guides/i });
      expect(guidesLink).toHaveAttribute("href", "/guides");
    });

    test("renders footer links to About, Privacy, and Organizations", () => {
      const aboutLink = screen.getByRole("link", { name: /about us/i });
      expect(aboutLink).toHaveAttribute("href", "/about");
      const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
      expect(privacyLink).toHaveAttribute("href", "/privacy");
      const orgsLink = screen.getByRole("link", {
        name: /our partner rescues/i,
      });
      expect(orgsLink).toHaveAttribute("href", "/organizations");
    });

    test("renders BreadcrumbSchema for SEO", () => {
      expect(screen.getByTestId("breadcrumb-schema")).toBeInTheDocument();
    });
  });

  describe("FAQ Questions", () => {
    beforeEach(() => {
      render(<FaqClient />);
    });

    test("renders commercial platform question", () => {
      expect(
        screen.getByText(/is rescuedogs.me a commercial platform/i)
      ).toBeInTheDocument();
    });

    test("renders adoption cost question", () => {
      expect(
        screen.getByText(/how much does it cost to adopt/i)
      ).toBeInTheDocument();
    });

    test("renders first-time owner question", () => {
      expect(
        screen.getByText(/are rescue dogs good for first-time owners/i)
      ).toBeInTheDocument();
    });

    test("renders European focus question", () => {
      expect(
        screen.getByText(/why focus on european rescues/i)
      ).toBeInTheDocument();
    });

    test("renders privacy question", () => {
      expect(
        screen.getByText(/do you track users or use cookies/i)
      ).toBeInTheDocument();
    });
  });

  describe("Accordion Functionality", () => {
    beforeEach(() => {
      render(<FaqClient />);
    });

    test("all FAQ items are collapsed by default", () => {
      const accordionButtons = screen.getAllByRole("button", {
        expanded: false,
      });
      const faqButtons = accordionButtons.filter(
        (btn) =>
          btn.textContent.includes("?") && !btn.textContent.includes("Expand")
      );
      expect(faqButtons.length).toBeGreaterThan(0);
    });

    test("clicking a FAQ question expands it", () => {
      const commercialQuestion = screen.getByText(
        /is rescuedogs.me a commercial platform/i
      );
      const button = commercialQuestion.closest("button");

      expect(button).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    test("clicking an expanded FAQ question collapses it", () => {
      const commercialQuestion = screen.getByText(
        /is rescuedogs.me a commercial platform/i
      );
      const button = commercialQuestion.closest("button");

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    test("expand all button expands all FAQ items", () => {
      const expandAllButton = screen.getByRole("button", {
        name: /expand all/i,
      });

      fireEvent.click(expandAllButton);

      const faqButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));

      faqButtons.forEach((btn) => {
        expect(btn).toHaveAttribute("aria-expanded", "true");
      });
    });

    test("collapse all button collapses all FAQ items", () => {
      const expandAllButton = screen.getByRole("button", {
        name: /expand all/i,
      });
      const collapseAllButton = screen.getByRole("button", {
        name: /collapse all/i,
      });

      fireEvent.click(expandAllButton);
      fireEvent.click(collapseAllButton);

      const faqButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));

      faqButtons.forEach((btn) => {
        expect(btn).toHaveAttribute("aria-expanded", "false");
      });
    });

    test("multiple FAQ items can be expanded simultaneously", () => {
      const buttons = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      const firstButton = buttons[0];
      const secondButton = buttons[1];

      fireEvent.click(firstButton);
      fireEvent.click(secondButton);

      expect(firstButton).toHaveAttribute("aria-expanded", "true");
      expect(secondButton).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("FAQ Schema", () => {
    test("renders FAQPage JSON-LD schema", () => {
      render(<FaqClient />);
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      const faqScript = Array.from(scripts).find((script) => {
        try {
          const data = JSON.parse(script.textContent);
          return data["@type"] === "FAQPage";
        } catch {
          return false;
        }
      });
      expect(faqScript).toBeTruthy();
    });

    test("FAQPage schema contains all questions", () => {
      render(<FaqClient />);
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      const faqScript = Array.from(scripts).find((script) => {
        try {
          const data = JSON.parse(script.textContent);
          return data["@type"] === "FAQPage";
        } catch {
          return false;
        }
      });

      const schema = JSON.parse(faqScript.textContent);
      expect(schema.mainEntity).toBeDefined();
      expect(schema.mainEntity.length).toBe(14);
      schema.mainEntity.forEach((item) => {
        expect(item["@type"]).toBe("Question");
        expect(item.name).toBeDefined();
        expect(item.acceptedAnswer).toBeDefined();
        expect(item.acceptedAnswer["@type"]).toBe("Answer");
      });
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      render(<FaqClient />);
    });

    test("has single h1 heading", () => {
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
    });

    test("has proper heading hierarchy with h2 section headings", () => {
      const h2s = screen.getAllByRole("heading", { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(5);
    });

    test("FAQ buttons have aria-expanded attribute", () => {
      const buttons = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(buttons.length).toBe(14);
    });

    test("emoji icons have aria-hidden for accessibility", () => {
      const emojiSpans = document.querySelectorAll('[aria-hidden="true"]');
      expect(emojiSpans.length).toBeGreaterThanOrEqual(5);
    });

    test("section anchors exist for navigation", () => {
      expect(document.getElementById("about")).toBeInTheDocument();
      expect(document.getElementById("adoption")).toBeInTheDocument();
      expect(document.getElementById("success")).toBeInTheDocument();
      expect(document.getElementById("european")).toBeInTheDocument();
      expect(document.getElementById("privacy")).toBeInTheDocument();
    });
  });
});
