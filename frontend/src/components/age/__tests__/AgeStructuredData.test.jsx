import { render } from "@testing-library/react";
import AgeStructuredData from "../AgeStructuredData";
import { AGE_CATEGORIES } from "@/utils/ageData";

describe("AgeStructuredData", () => {
  const getJsonLd = (container) => {
    const script = container.querySelector('script[type="application/ld+json"]');
    return script ? JSON.parse(script.textContent) : null;
  };

  describe("Puppies page schema", () => {
    it("renders valid JSON-LD script tag", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.puppies} dogCount={150} />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).toBeInTheDocument();
    });

    it("generates correct CollectionPage schema for puppies", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.puppies} dogCount={150} />
      );

      const schema = getJsonLd(container);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("CollectionPage");
      expect(schema.name).toBe("Rescue Puppies for Adoption");
      expect(schema.url).toBe("https://www.rescuedogs.me/dogs/puppies");
      expect(schema.numberOfItems).toBe(150);
    });

    it("includes description from age category", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.puppies} dogCount={150} />
      );

      const schema = getJsonLd(container);
      expect(schema.description).toBe(AGE_CATEGORIES.puppies.description);
    });

    it("includes about entity with age information", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.puppies} dogCount={150} />
      );

      const schema = getJsonLd(container);
      expect(schema.about["@type"]).toBe("Thing");
      expect(schema.about.name).toBe("Puppies");
      expect(schema.about.description).toContain("Under 1 year");
    });

    it("includes isPartOf with website information", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.puppies} dogCount={150} />
      );

      const schema = getJsonLd(container);
      expect(schema.isPartOf["@type"]).toBe("WebSite");
      expect(schema.isPartOf.name).toBe("RescueDogs.me");
      expect(schema.isPartOf.url).toBe("https://www.rescuedogs.me");
    });
  });

  describe("Senior dogs page schema", () => {
    it("generates correct CollectionPage schema for senior dogs", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.senior} dogCount={85} />
      );

      const schema = getJsonLd(container);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("CollectionPage");
      expect(schema.name).toBe("Senior Rescue Dogs for Adoption");
      expect(schema.url).toBe("https://www.rescuedogs.me/dogs/senior");
      expect(schema.numberOfItems).toBe(85);
    });

    it("includes about entity with senior age information", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.senior} dogCount={85} />
      );

      const schema = getJsonLd(container);
      expect(schema.about.name).toBe("Senior Dogs");
      expect(schema.about.description).toContain("8+ years");
    });
  });

  describe("Edge cases", () => {
    it("handles zero dog count", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.puppies} dogCount={0} />
      );

      const schema = getJsonLd(container);
      expect(schema.numberOfItems).toBe(0);
    });

    it("handles large dog counts", () => {
      const { container } = render(
        <AgeStructuredData ageCategory={AGE_CATEGORIES.puppies} dogCount={10000} />
      );

      const schema = getJsonLd(container);
      expect(schema.numberOfItems).toBe(10000);
    });
  });
});
