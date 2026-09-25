import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  ANYWHERE,
  resetVisitorLocationForTests,
  setOnlyAdoptable,
  setVisitorCountry,
  useVisitorLocation,
} from "../visitorLocation";
import { trackLocationSet } from "@/lib/analytics";

jest.mock("@/lib/analytics", () => ({ trackLocationSet: jest.fn() }));

function Probe(): React.JSX.Element {
  const { country, choice, onlyAdoptable } = useVisitorLocation();
  return <p data-testid="probe">{JSON.stringify({ country, choice, onlyAdoptable })}</p>;
}

const probe = () => JSON.parse(screen.getByTestId("probe").textContent || "{}");

function mockGeo(country: string | null): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ country }) });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetVisitorLocationForTests();
  jest.clearAllMocks();
});

describe("visitor location", () => {
  it("defaults to the connection's country, labels only, and records it once", async () => {
    const fetchMock = mockGeo("GB");
    render(<Probe />);

    await waitFor(() => expect(probe().country).toBe("GB"));
    expect(probe()).toEqual({ country: "GB", choice: null, onlyAdoptable: false });
    expect(fetchMock).toHaveBeenCalledWith("/api/geo");
    expect(trackLocationSet).toHaveBeenCalledWith("geo", "GB", false);
    // Nothing from the connection is kept beyond the tab
    expect(localStorage.getItem("visitorCountry")).toBeNull();
  });

  it("does not ask the connection again within the tab", async () => {
    sessionStorage.setItem("visitorCountryGeo", "DE");
    const fetchMock = mockGeo("GB");
    render(<Probe />);

    await waitFor(() => expect(probe().country).toBe("DE"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers the visitor's own choice and keeps it in the browser", async () => {
    const fetchMock = mockGeo("GB");
    render(<Probe />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    act(() => setVisitorCountry("NL"));

    expect(probe().country).toBe("NL");
    expect(localStorage.getItem("visitorCountry")).toBe("NL");
    expect(trackLocationSet).toHaveBeenCalledWith("picker", "NL", false);

    // On the next visit the stored choice stands and the connection is not asked
    resetVisitorLocationForTests();
    render(<Probe />);
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Anywhere means no country at all", async () => {
    mockGeo("GB");
    render(<Probe />);
    await waitFor(() => expect(probe().country).toBe("GB"));

    act(() => setVisitorCountry(ANYWHERE));
    expect(probe()).toEqual({ country: null, choice: ANYWHERE, onlyAdoptable: false });
    expect(trackLocationSet).toHaveBeenLastCalledWith("picker", null, false);
  });

  it("remembers the only-adoptable switch", () => {
    mockGeo(null);
    render(<Probe />);
    act(() => setOnlyAdoptable(true));

    expect(localStorage.getItem("onlyAdoptable")).toBe("true");
    act(() => setOnlyAdoptable(false));
    expect(localStorage.getItem("onlyAdoptable")).toBeNull();
  });
});
