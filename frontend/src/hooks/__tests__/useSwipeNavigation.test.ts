import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { getDogNeighbors } from "../../services/animalsService";
import { reportError } from "../../utils/logger";
import { useSwipeNavigation } from "../useSwipeNavigation";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("react-swipeable", () => ({ useSwipeable: jest.fn((config) => config) }));
jest.mock("../../services/animalsService", () => ({ getDogNeighbors: jest.fn() }));
jest.mock("../../utils/logger", () => ({ reportError: jest.fn() }));

const push = jest.fn();
const prefetch = jest.fn();
const prev = { slug: "rex-1", name: "Rex", primary_image_url: "https://img/rex.jpg" };
const next = { slug: "bo-3", name: "Bo", primary_image_url: null };

const props = (slug = "dolly-2", searchParams: Record<string, string> = {}) => ({
  currentDogSlug: slug,
  searchParams,
});

const swipe = () => (useSwipeable as jest.Mock).mock.calls.at(-1)[0];
const press = (key: string) => act(() => void document.dispatchEvent(new KeyboardEvent("keydown", { key })));

describe("useSwipeNavigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, prefetch });
    (getDogNeighbors as jest.Mock).mockResolvedValue({ prev, next });
  });

  it("asks the neighbors endpoint, not a 300-dog list", async () => {
    const { result } = renderHook(() => useSwipeNavigation(props()));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getDogNeighbors).toHaveBeenCalledTimes(1);
    expect(getDogNeighbors).toHaveBeenCalledWith("dolly-2", {});
    expect(result.current.prevDog).toEqual(prev);
    expect(result.current.nextDog).toEqual(next);
  });

  it("passes the page's filters on, leaving out empty and 'Any' values", async () => {
    renderHook(() => useSwipeNavigation(props("dolly-2", { size: "Large", sex: "Any", breed: "" })));

    await waitFor(() => expect(getDogNeighbors).toHaveBeenCalledWith("dolly-2", { size: "Large" }));
  });

  it("prefetches both neighbour pages, keeping the filters", async () => {
    renderHook(() => useSwipeNavigation(props("dolly-2", { size: "Large" })));

    await waitFor(() => expect(prefetch).toHaveBeenCalledTimes(2));
    expect(prefetch).toHaveBeenCalledWith("/dogs/rex-1?size=Large");
    expect(prefetch).toHaveBeenCalledWith("/dogs/bo-3?size=Large");
  });

  it("goes to the next dog on a left swipe and the previous on a right swipe", async () => {
    const { result } = renderHook(() => useSwipeNavigation(props()));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => swipe().onSwipedLeft());
    act(() => swipe().onSwipedRight());

    expect(push).toHaveBeenNthCalledWith(1, "/dogs/bo-3");
    expect(push).toHaveBeenNthCalledWith(2, "/dogs/rex-1");
  });

  it("navigates with the arrow keys, unless the gallery already handled them", async () => {
    const { result } = renderHook(() => useSwipeNavigation(props()));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    press("ArrowRight");
    expect(push).toHaveBeenLastCalledWith("/dogs/bo-3");

    push.mockClear();
    const handled = new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true });
    handled.preventDefault();
    act(() => void document.dispatchEvent(handled));
    expect(push).not.toHaveBeenCalled();
  });

  it("does nothing at a dog with no neighbours", async () => {
    (getDogNeighbors as jest.Mock).mockResolvedValue({ prev: null, next: null });
    const { result } = renderHook(() => useSwipeNavigation(props()));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    press("ArrowLeft");
    press("ArrowRight");

    expect(push).not.toHaveBeenCalled();
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("reports a failed request and offers no navigation", async () => {
    (getDogNeighbors as jest.Mock).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useSwipeNavigation(props()));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prevDog).toBeNull();
    expect(reportError).toHaveBeenCalled();
  });

  it("drops the previous dog's neighbours while the next dog's load", async () => {
    const { result, rerender } = renderHook((p) => useSwipeNavigation(p), { initialProps: props() });
    await waitFor(() => expect(result.current.nextDog).toEqual(next));

    let resolve: (v: unknown) => void = () => {};
    (getDogNeighbors as jest.Mock).mockReturnValue(new Promise((r) => (resolve = r)));
    rerender(props("bo-3"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.nextDog).toBeNull();
    await act(async () => resolve({ prev: { slug: "dolly-2", name: "Dolly" }, next: null }));
    expect(result.current.prevDog?.slug).toBe("dolly-2");
  });
});
