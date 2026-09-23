import { render, screen } from "@testing-library/react";
import AgeHubClient from "../age/AgeHubClient";
import CountriesHubClient from "../country/CountriesHubClient";
import CountryDogsClient from "../country/[code]/CountryDogsClient";
import PuppiesClient from "../puppies/PuppiesClient";
import SeniorDogsClient from "../senior/SeniorDogsClient";
import { AGE_CATEGORIES } from "@/utils/ageData";
import { COUNTRIES } from "@/utils/countryData";

jest.mock("../DogsPageClientSimplified", () => {
  return function MockDogsPageClientSimplified() {
    return <div data-testid="dogs-page-client" />;
  };
});

jest.mock("@/components/age/AgeQuickNav", () => {
  return function MockAgeQuickNav() {
    return <nav />;
  };
});

jest.mock("@/components/countries/CountryQuickNav", () => {
  return function MockCountryQuickNav() {
    return <nav />;
  };
});

// Same failure as the homepage (Sentry JAVASCRIPT-NEXTJS-70, #425): the server
// renders "1,531" and a fi-FI browser renders "1 531", so hydration fails.
const FINNISH_GROUPED_1531 = (1531).toLocaleString("fi-FI");

const pageProps = {
  initialDogs: [],
  metadata: { total: 1531, page: 1, limit: 24 },
  totalCount: 1531,
};

describe("dog hub pages render counts the same in every browser locale", () => {
  const originalToLocaleString = Number.prototype.toLocaleString;

  beforeEach(() => {
    Number.prototype.toLocaleString = function (locales, options) {
      return originalToLocaleString.call(this, locales ?? "fi-FI", options);
    };
  });

  afterEach(() => {
    Number.prototype.toLocaleString = originalToLocaleString;
  });

  test("AgeHubClient category and stat counts", () => {
    render(
      <AgeHubClient
        initialStats={{
          ageCategories: [
            { slug: "puppies", count: 1531 },
            { slug: "senior", count: 1531 },
          ],
        }}
      />,
    );

    expect(screen.getAllByText(/1,531/).length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(new RegExp(FINNISH_GROUPED_1531))).not.toBeInTheDocument();
  });

  test("CountriesHubClient total and per-country counts", () => {
    render(
      <CountriesHubClient
        initialStats={{ total: 1531, countries: [{ code: "UK", count: 1531, organizations: 3 }] }}
      />,
    );

    expect(screen.getAllByText(/1,531/).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(new RegExp(FINNISH_GROUPED_1531))).not.toBeInTheDocument();
  });

  test("CountryDogsClient total", () => {
    render(<CountryDogsClient {...pageProps} country={COUNTRIES.UK} allCountries={COUNTRIES} />);

    expect(screen.getByText("1,531")).toBeInTheDocument();
  });

  test("PuppiesClient total", () => {
    render(<PuppiesClient {...pageProps} ageCategory={AGE_CATEGORIES.puppies} />);

    expect(screen.getByText("1,531")).toBeInTheDocument();
  });

  test("SeniorDogsClient total", () => {
    render(<SeniorDogsClient {...pageProps} ageCategory={AGE_CATEGORIES.senior} />);

    expect(screen.getByText("1,531")).toBeInTheDocument();
  });
});
