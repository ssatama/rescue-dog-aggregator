import { render, screen } from "../../../test-utils";
import TrustSection from "../TrustSection";
import AgeBrowseSection from "../AgeBrowseSection";
import CountryBrowseSection from "../CountryBrowseSection";

jest.mock("../../../services/animalsService", () => ({
  getStatistics: jest.fn(),
}));

// Sentry JAVASCRIPT-NEXTJS-70: the server renders "1,531" but a browser whose
// default locale is fi-FI renders "1 531" (narrow no-break space), so these
// client components failed to hydrate on the homepage for Finnish visitors.
const FINNISH_GROUPED_1531 = (1531).toLocaleString("fi-FI");

describe("homepage counts render the same in every browser locale", () => {
  const originalToLocaleString = Number.prototype.toLocaleString;

  beforeEach(() => {
    // eslint-disable-next-line no-extend-native
    Number.prototype.toLocaleString = function (locales, options) {
      return originalToLocaleString.call(this, locales ?? "fi-FI", options);
    };
  });

  afterEach(() => {
    // eslint-disable-next-line no-extend-native
    Number.prototype.toLocaleString = originalToLocaleString;
  });

  test("TrustSection total dog count", () => {
    render(
      <TrustSection
        initialStatistics={{
          total_dogs: 1531,
          total_organizations: 12,
          countries: [],
          organizations: [],
        }}
      />,
    );

    expect(screen.getByText("1,531")).toBeInTheDocument();
    expect(screen.queryByText(FINNISH_GROUPED_1531)).not.toBeInTheDocument();
  });

  test("AgeBrowseSection puppy and senior counts", () => {
    render(
      <AgeBrowseSection
        ageStats={[
          { slug: "puppies", count: 1531 },
          { slug: "senior", count: 1531 },
        ]}
      />,
    );

    expect(screen.getAllByText("1,531")).toHaveLength(2);
  });

  test("CountryBrowseSection per-country counts", () => {
    render(<CountryBrowseSection countryStats={[{ code: "UK", count: 1531 }]} />);

    expect(screen.getByText(/1,531 dogs/)).toBeInTheDocument();
  });
});
