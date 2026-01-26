import { render } from "../../../test-utils";
import Analytics from "../Analytics";

let capturedBeforeSend = null;

jest.mock("@vercel/analytics/next", () => ({
  Analytics: function MockAnalytics({ beforeSend }) {
    capturedBeforeSend = beforeSend;
    return <div data-testid="vercel-analytics" />;
  },
}));

jest.mock("@/utils/safeStorage", () => ({
  safeStorage: {
    get: jest.fn(),
  },
}));

import { safeStorage } from "@/utils/safeStorage";

describe("Analytics Component", () => {
  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
    capturedBeforeSend = null;
    jest.clearAllMocks();
  });

  it("renders Analytics component in production", () => {
    process.env.NODE_ENV = "production";

    const { getByTestId } = render(<Analytics />);

    expect(getByTestId("vercel-analytics")).toBeInTheDocument();
  });

  it("renders Analytics component in Vercel environment", () => {
    process.env.VERCEL_ENV = "production";

    const { getByTestId } = render(<Analytics />);

    expect(getByTestId("vercel-analytics")).toBeInTheDocument();
  });

  it("renders Analytics component in preview environment", () => {
    process.env.VERCEL_ENV = "preview";

    const { getByTestId } = render(<Analytics />);

    expect(getByTestId("vercel-analytics")).toBeInTheDocument();
  });

  it("does not render Analytics component in development", () => {
    process.env.NODE_ENV = "development";

    const { queryByTestId } = render(<Analytics />);

    expect(queryByTestId("vercel-analytics")).not.toBeInTheDocument();
  });

  it("does not render Analytics component when no environment is set", () => {
    const { queryByTestId } = render(<Analytics />);

    expect(queryByTestId("vercel-analytics")).not.toBeInTheDocument();
  });

  it("is a client component", () => {
    expect(() => render(<Analytics />)).not.toThrow();
  });
});

describe("handleBeforeSend callback", () => {
  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
    capturedBeforeSend = null;
    jest.clearAllMocks();
  });

  it("passes beforeSend callback to VercelAnalytics", () => {
    process.env.NODE_ENV = "production";
    render(<Analytics />);
    expect(capturedBeforeSend).toBeInstanceOf(Function);
  });

  it("returns event unchanged when va-disable is not set", () => {
    process.env.NODE_ENV = "production";
    safeStorage.get.mockReturnValue(null);

    render(<Analytics />);

    const event = { name: "pageview", url: "/dogs" };
    expect(capturedBeforeSend(event)).toEqual(event);
    expect(safeStorage.get).toHaveBeenCalledWith("va-disable");
  });

  it("returns null when va-disable is set in localStorage", () => {
    process.env.NODE_ENV = "production";
    safeStorage.get.mockReturnValue("true");

    render(<Analytics />);

    const event = { name: "pageview", url: "/dogs" };
    expect(capturedBeforeSend(event)).toBeNull();
    expect(safeStorage.get).toHaveBeenCalledWith("va-disable");
  });

  it("blocks events for any truthy va-disable value", () => {
    process.env.NODE_ENV = "production";
    safeStorage.get.mockReturnValue("1");

    render(<Analytics />);

    expect(capturedBeforeSend({ name: "pageview" })).toBeNull();
  });

  it("allows events when va-disable is empty string", () => {
    process.env.NODE_ENV = "production";
    safeStorage.get.mockReturnValue("");

    render(<Analytics />);

    const event = { name: "pageview" };
    expect(capturedBeforeSend(event)).toEqual(event);
  });
});
