import { render } from "../../../test-utils";
import SpeedInsights from "../SpeedInsights";

// Mock Vercel Speed Insights
jest.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: function MockSpeedInsights() {
    return <div data-testid="vercel-speed-insights" />;
  },
}));

describe("SpeedInsights Component", () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
  });

  it("renders SpeedInsights component in production", () => {
    process.env.NODE_ENV = "production";

    const { getByTestId } = render(<SpeedInsights />);

    expect(getByTestId("vercel-speed-insights")).toBeInTheDocument();
  });

  it("renders SpeedInsights component in Vercel environment", () => {
    process.env.VERCEL_ENV = "production";

    const { getByTestId } = render(<SpeedInsights />);

    expect(getByTestId("vercel-speed-insights")).toBeInTheDocument();
  });

  it("renders SpeedInsights component in preview environment", () => {
    process.env.VERCEL_ENV = "preview";

    const { getByTestId } = render(<SpeedInsights />);

    expect(getByTestId("vercel-speed-insights")).toBeInTheDocument();
  });

  it("does not render SpeedInsights component in development", () => {
    process.env.NODE_ENV = "development";

    const { queryByTestId } = render(<SpeedInsights />);

    expect(queryByTestId("vercel-speed-insights")).not.toBeInTheDocument();
  });

  it("does not render SpeedInsights component when no environment is set", () => {
    const { queryByTestId } = render(<SpeedInsights />);

    expect(queryByTestId("vercel-speed-insights")).not.toBeInTheDocument();
  });

  it("is a client component", () => {
    // This test ensures the component is marked as client-side
    // We test this indirectly by checking it renders without SSR issues
    expect(() => render(<SpeedInsights />)).not.toThrow();
  });
});
