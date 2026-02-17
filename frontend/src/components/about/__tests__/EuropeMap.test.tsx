import { render, screen, waitFor, fireEvent } from "../../../test-utils";
import EuropeMap from "../EuropeMap";
import { getOrganizations } from "../../../services/organizationsService";

jest.mock("../../../services/organizationsService");
jest.mock("../../providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light" }),
}));

jest.mock("react-simple-maps", () => {
  const geographies = [
    { rsmKey: "gb", properties: { name: "United Kingdom" } },
    { rsmKey: "es", properties: { name: "Spain" } },
    { rsmKey: "fr", properties: { name: "France" } },
  ];

  return {
    ComposableMap: ({ children, "data-testid": testId }: any) => (
      <div data-testid={testId}>{children}</div>
    ),
    ZoomableGroup: ({ children }: any) => <div>{children}</div>,
    Geographies: ({ children }: any) => (
      <div>{children({ geographies })}</div>
    ),
    Geography: ({ geography, fill, stroke, strokeWidth, style, ...rest }: any) => (
      <div
        data-testid={`geography-${geography?.rsmKey}`}
        {...rest}
      />
    ),
    Marker: ({ children }: any) => <g data-testid="marker">{children}</g>,
  };
});

const mockOrgs = [
  { id: 1, name: "Dogs Trust", country: "UK" },
  { id: 2, name: "Many Tears", country: "UK" },
  { id: 3, name: "REAN", country: "UK" },
  { id: 4, name: "Galgos del Sol", country: "ES" },
];

const mockGetOrganizations = getOrganizations as jest.Mock;

describe("EuropeMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("data fetching", () => {
    test("shows loading state while fetching", () => {
      mockGetOrganizations.mockReturnValue(new Promise(() => {}));
      render(<EuropeMap />);

      expect(screen.getByText("Loading map...")).toBeInTheDocument();
      expect(screen.queryByTestId("europe-map")).not.toBeInTheDocument();
    });

    test("shows error message and retry button when fetch fails", async () => {
      mockGetOrganizations.mockRejectedValue(new Error("Network error"));
      render(<EuropeMap />);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load organization data"),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: "Retry" }),
      ).toBeInTheDocument();
    });

    test("retry button re-fetches data after error", async () => {
      mockGetOrganizations
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(mockOrgs);

      render(<EuropeMap />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Retry" }),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });
      expect(mockGetOrganizations).toHaveBeenCalledTimes(2);
    });

    test("renders map on successful fetch", async () => {
      mockGetOrganizations.mockResolvedValue(mockOrgs);
      render(<EuropeMap />);

      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });
      expect(screen.queryByText("Loading map...")).not.toBeInTheDocument();
    });

    test("handles empty response without error", async () => {
      mockGetOrganizations.mockResolvedValue([]);
      render(<EuropeMap />);

      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });
    });

    test("handles non-array response without crash", async () => {
      mockGetOrganizations.mockResolvedValue(null);
      render(<EuropeMap />);

      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });
    });
  });

  describe("tooltip interactions", () => {
    beforeEach(() => {
      mockGetOrganizations.mockResolvedValue(mockOrgs);
    });

    test("shows tooltip on hover over country with orgs", async () => {
      render(<EuropeMap />);
      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });

      fireEvent.mouseEnter(screen.getByTestId("geography-gb"));

      expect(screen.getByText("United Kingdom")).toBeInTheDocument();
      expect(
        screen.getByText(/3 organization\(s\) based here/),
      ).toBeInTheDocument();
    });

    test("hides tooltip on mouse leave", async () => {
      render(<EuropeMap />);
      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });

      fireEvent.mouseEnter(screen.getByTestId("geography-gb"));
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();

      fireEvent.mouseLeave(screen.getByTestId("geography-gb"));
      expect(
        screen.queryByText(/organization\(s\) based here/),
      ).not.toBeInTheDocument();
    });

    test("does not show tooltip for country without orgs", async () => {
      render(<EuropeMap />);
      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });

      fireEvent.mouseEnter(screen.getByTestId("geography-fr"));

      expect(
        screen.queryByText(/organization\(s\) based here/),
      ).not.toBeInTheDocument();
    });

    test("Enter key toggles tooltip on and off", async () => {
      render(<EuropeMap />);
      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });

      const uk = screen.getByTestId("geography-gb");

      fireEvent.keyDown(uk, { key: "Enter" });
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();

      fireEvent.keyDown(uk, { key: "Enter" });
      expect(
        screen.queryByText(/organization\(s\) based here/),
      ).not.toBeInTheDocument();
    });

    test("focus shows tooltip and blur hides it", async () => {
      render(<EuropeMap />);
      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });

      fireEvent.focus(screen.getByTestId("geography-gb"));
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();

      fireEvent.blur(screen.getByTestId("geography-gb"));
      expect(
        screen.queryByText(/organization\(s\) based here/),
      ).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      mockGetOrganizations.mockResolvedValue(mockOrgs);
    });

    test("countries with orgs have tabIndex=0 and descriptive aria-label", async () => {
      render(<EuropeMap />);
      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });

      const uk = screen.getByTestId("geography-gb");
      expect(uk).toHaveAttribute("tabindex", "0");
      expect(uk).toHaveAttribute(
        "aria-label",
        "United Kingdom: 3 organization(s) based here",
      );
    });

    test("countries without org code have tabIndex=-1", async () => {
      render(<EuropeMap />);
      await waitFor(() => {
        expect(screen.getByTestId("europe-map")).toBeInTheDocument();
      });

      const france = screen.getByTestId("geography-fr");
      expect(france).toHaveAttribute("tabindex", "-1");
      expect(france).toHaveAttribute("aria-label", "France");
    });
  });
});
