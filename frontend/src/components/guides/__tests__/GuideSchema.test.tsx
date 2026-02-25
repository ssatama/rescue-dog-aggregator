import { render } from "@testing-library/react";
import { GuideSchema } from "../GuideSchema";
import type { Guide } from "@/types/guide";

const mockGuide: Guide = {
  slug: "test-guide",
  frontmatter: {
    title: "Test Guide Title",
    slug: "test-guide",
    description: "Test guide description for schema",
    heroImage: "/test-hero.jpg",
    heroImageAlt: "Test hero image",
    readTime: 10,
    category: "test",
    keywords: ["test", "guide"],
    lastUpdated: "2025-10-03",
    author: "Test Author",
    relatedGuides: [],
  },
  content: "Test content",
};

describe("GuideSchema", () => {
  it("renders script tag with Article schema", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );

    expect(scriptTag).toBeInTheDocument();
  });

  it("includes correct schema.org context and type", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Article");
  });

  it("includes article headline from frontmatter title", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema.headline).toBe("Test Guide Title");
  });

  it("includes article description", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema.description).toBe("Test guide description for schema");
  });

  it("includes hero image URL", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema.image).toBe("/test-hero.jpg");
  });

  it("includes publication and modification dates", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema.datePublished).toBe("2025-10-03");
    expect(schema.dateModified).toBe("2025-10-03");
  });

  it("includes author with Person type", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema.author).toBeDefined();
    expect(schema.author["@type"]).toBe("Person");
    expect(schema.author.name).toBe("Test Author");
  });

  it("includes publisher with Rescue Dog Aggregator", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema.publisher).toBeDefined();
    expect(schema.publisher["@type"]).toBe("Organization");
    expect(schema.publisher.name).toBe("Rescue Dog Aggregator");
    expect(schema.publisher.logo).toBeDefined();
    expect(schema.publisher.logo["@type"]).toBe("ImageObject");
    expect(schema.publisher.logo.url).toBe("https://www.rescuedogs.me/logo.jpeg");
  });

  it("includes mainEntityOfPage with guide URL", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schema = JSON.parse(scriptTag?.textContent || "{}");

    expect(schema.mainEntityOfPage).toBeDefined();
    expect(schema.mainEntityOfPage["@type"]).toBe("WebPage");
    expect(schema.mainEntityOfPage["@id"]).toBe(
      "https://www.rescuedogs.me/guides/test-guide",
    );
  });

  it("renders valid JSON-LD", () => {
    const { container } = render(<GuideSchema guide={mockGuide} />);
    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]',
    );

    // Should not throw when parsing
    expect(() => JSON.parse(scriptTag?.textContent || "{}")).not.toThrow();
  });
});
