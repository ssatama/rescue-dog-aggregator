import { render } from "@testing-library/react";
import CountryStructuredData from "../CountryStructuredData";

describe("CountryStructuredData", () => {
  const mockCountry = {
    code: "UK",
    name: "United Kingdom",
    description: "Rescue dogs from UK organizations",
  };

  const mockStats = {
    total: 4500,
    countries: [
      { code: "UK", name: "United Kingdom", count: 3000 },
      { code: "DE", name: "Germany", count: 800 },
    ],
  };

  describe("index page type", () => {
    it("renders CollectionPage schema for index", () => {
      const { container } = render(
        <CountryStructuredData pageType="index" stats={mockStats} />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).toBeInTheDocument();

      const schema = JSON.parse(script.textContent);
      expect(schema["@type"]).toBe("CollectionPage");
      expect(schema.name).toBe("Rescue Dogs by Country");
    });

    it("includes correct country count for index", () => {
      const { container } = render(
        <CountryStructuredData pageType="index" stats={mockStats} />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      const schema = JSON.parse(script.textContent);
      expect(schema.numberOfItems).toBe(2);
    });

    it("includes ItemList with countries", () => {
      const { container } = render(
        <CountryStructuredData pageType="index" stats={mockStats} />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      const schema = JSON.parse(script.textContent);
      expect(schema.mainEntity["@type"]).toBe("ItemList");
      expect(schema.mainEntity.itemListElement).toHaveLength(2);
    });

    it("includes correct URL for index page", () => {
      const { container } = render(
        <CountryStructuredData pageType="index" stats={mockStats} />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      const schema = JSON.parse(script.textContent);
      expect(schema.url).toBe("https://www.rescuedogs.me/dogs/country");
    });
  });

  describe("country page type", () => {
    it("renders CollectionPage schema for country", () => {
      const { container } = render(
        <CountryStructuredData
          pageType="country"
          country={mockCountry}
          dogCount={3000}
        />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).toBeInTheDocument();

      const schema = JSON.parse(script.textContent);
      expect(schema["@type"]).toBe("CollectionPage");
      expect(schema.name).toBe("Rescue Dogs in United Kingdom");
    });

    it("includes correct dog count for detail", () => {
      const { container } = render(
        <CountryStructuredData
          pageType="country"
          country={mockCountry}
          dogCount={3000}
        />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      const schema = JSON.parse(script.textContent);
      expect(schema.numberOfItems).toBe(3000);
    });

    it("includes country description", () => {
      const { container } = render(
        <CountryStructuredData
          pageType="country"
          country={mockCountry}
          dogCount={3000}
        />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      const schema = JSON.parse(script.textContent);
      expect(schema.description).toBe("Rescue dogs from UK organizations");
    });

    it("includes about with Country type", () => {
      const { container } = render(
        <CountryStructuredData
          pageType="country"
          country={mockCountry}
          dogCount={3000}
        />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      const schema = JSON.parse(script.textContent);
      expect(schema.about["@type"]).toBe("Country");
      expect(schema.about.name).toBe("United Kingdom");
    });

    it("includes lowercase country code in URL", () => {
      const { container } = render(
        <CountryStructuredData
          pageType="country"
          country={mockCountry}
          dogCount={3000}
        />
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      const schema = JSON.parse(script.textContent);
      expect(schema.url).toBe("https://www.rescuedogs.me/dogs/country/uk");
    });
  });
});
