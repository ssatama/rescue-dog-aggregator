import React from "react";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../../../test-utils";
import GlobalSearch from "../GlobalSearch";
import { getSuggestions, type SuggestResponse } from "@/services/searchService";
import { trackSearchPerformed } from "@/lib/analytics";

const push = jest.fn();
let pathname = "/";
let searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));
jest.mock("@/services/searchService", () => ({ getSuggestions: jest.fn() }));
jest.mock("@/lib/analytics", () => ({ trackSearchPerformed: jest.fn() }));

const mockGetSuggestions = getSuggestions as jest.Mock;

const EMPTY: SuggestResponse = { breeds: [], rescues: [], dogs: [], filters: [] };
const POPULAR: SuggestResponse = {
  ...EMPTY,
  breeds: [{ name: "German Shepherd Dog", slug: "german-shepherd-dog", count: 62, matched_synonym: null }],
};
const STAFFY: SuggestResponse = {
  breeds: [{ name: "Staffordshire Bull Terrier", slug: "staffordshire-bull-terrier", count: 38, matched_synonym: "staffy" }],
  rescues: [{ id: 4, name: "Dogs Trust", slug: "dogs-trust", count: 438 }],
  dogs: [{ name: "Taffy", slug: "taffy-9673", breed: "Mixed Breed", rescue: "The Underdog", image: null }],
  filters: [
    { label: "Puppies", params: { age_category: "Puppy" } },
    { label: "Good with cats", params: { good_with_cats: "true" } },
  ],
};

function respond(byQuery: Record<string, SuggestResponse>): void {
  mockGetSuggestions.mockImplementation((query: string) => Promise.resolve(byQuery[query] ?? EMPTY));
}

function input(): HTMLElement {
  return screen.getByRole("combobox", { name: "Search breeds, rescues and dogs" });
}

beforeEach(() => {
  jest.clearAllMocks();
  pathname = "/";
  searchParams = new URLSearchParams();
  respond({ "": POPULAR, staffy: STAFFY });
});

describe("GlobalSearch", () => {
  it("offers the most listed breeds before anything is typed", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.click(input());

    expect(await screen.findByRole("option", { name: /German Shepherd Dog/ })).toBeInTheDocument();
    expect(screen.getByText("Popular breeds")).toBeInTheDocument();
    expect(mockGetSuggestions).toHaveBeenCalledWith("", expect.any(AbortSignal));
  });

  it("sends one request for the settled text, not one per keystroke", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "staffy");

    expect(await screen.findByRole("option", { name: /Staffordshire Bull Terrier/ })).toBeInTheDocument();
    const queries = mockGetSuggestions.mock.calls.map(([query]) => query);
    expect(queries.filter((query) => query !== "")).toEqual(["staffy"]);
  });

  it("groups results and explains a synonym match", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "staffy");

    const breed = await screen.findByRole("option", { name: /Staffordshire Bull Terrier/ });
    expect(breed).toHaveTextContent("matches “staffy”");
    expect(breed).toHaveTextContent("38 dogs");
    expect(screen.getByRole("option", { name: /Dogs Trust/ })).toHaveTextContent("438 dogs");
    expect(screen.getByRole("option", { name: /Taffy/ })).toHaveTextContent("Mixed Breed · The Underdog");
    expect(screen.getByRole("option", { name: "Puppies" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Good with cats" })).toBeInTheDocument();
  });

  it("works with the keyboard: arrows choose, Enter opens", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "staffy");
    await screen.findByRole("option", { name: /Staffordshire/ });

    await userEvent.keyboard("{ArrowDown}");
    const first = screen.getByRole("option", { name: /Staffordshire/ });
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(input()).toHaveAttribute("aria-activedescendant", first.id);

    await userEvent.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/dogs?breed=Staffordshire+Bull+Terrier");
    expect(trackSearchPerformed).toHaveBeenCalledWith("header", "breed", 38);
    expect(input()).toHaveValue("");
  });

  it("ArrowUp from the field goes to the last option", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "staffy");
    await screen.findByRole("option", { name: /Staffordshire/ });

    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: "Search all dogs for “staffy”" })).toHaveAttribute("aria-selected", "true");
  });

  it("Enter with nothing chosen searches the catalog, without sending the text to analytics", async () => {
    render(<GlobalSearch surface="mobile" />);
    await userEvent.type(input(), "staffy{Enter}");

    expect(push).toHaveBeenCalledWith("/dogs?search=staffy");
    expect(trackSearchPerformed).toHaveBeenCalledWith("mobile", "none", null);
    expect(JSON.stringify((trackSearchPerformed as jest.Mock).mock.calls)).not.toContain("staffy");
  });

  it("opens a dog and filters by a rescue", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "staffy");

    await userEvent.click(await screen.findByRole("option", { name: /Taffy/ }));
    expect(push).toHaveBeenCalledWith("/dogs/taffy-9673");
    expect(trackSearchPerformed).toHaveBeenCalledWith("header", "dog", 1);

    await userEvent.type(input(), "staffy");
    await userEvent.click(await screen.findByRole("option", { name: /Dogs Trust/ }));
    expect(push).toHaveBeenLastCalledWith("/dogs?organization_id=4");
  });

  it("offers Browse all dogs when nothing matches", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "zzqx");

    expect(await screen.findByText("No breeds, rescues or dogs match “zzqx”.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "Browse all dogs" }));
    expect(push).toHaveBeenCalledWith("/dogs");
    expect(input()).toHaveValue("");
  });

  it("Escape closes the list", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "staffy");
    await screen.findByRole("option", { name: /Staffordshire/ });

    await userEvent.keyboard("{Escape}");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveValue("staffy");
  });

  it("the home hero's field takes ⌘K in place of the header's and reports as home", async () => {
    render(<GlobalSearch surface="home" />);

    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(input()).toHaveFocus();
    await userEvent.keyboard("staffy{Enter}");
    expect(trackSearchPerformed).toHaveBeenCalledWith("home", "none", null);
  });

  it("⌘K and / focus the header field", async () => {
    render(<GlobalSearch surface="header" />);

    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(input()).toHaveFocus();

    input().blur();
    await userEvent.keyboard("/");
    expect(input()).toHaveFocus();
  });

  it("on the catalog, shows the current text search and keeps the other filters on a pick", async () => {
    pathname = "/dogs";
    searchParams = new URLSearchParams("size=Small&search=staffy&page=3");
    render(<GlobalSearch surface="header" />);

    expect(input()).toHaveValue("staffy");
    await userEvent.click(input());
    await userEvent.click(await screen.findByRole("option", { name: /Staffordshire/ }));

    expect(push).toHaveBeenCalledWith("/dogs?size=Small&breed=Staffordshire+Bull+Terrier");
  });

  it("shows the text search of a catalog landing page", () => {
    pathname = "/dogs/puppies";
    searchParams = new URLSearchParams("search=bella");
    render(<GlobalSearch surface="header" />);

    expect(input()).toHaveValue("bella");
  });

  it("retries a failed load the next time the field is focused", async () => {
    mockGetSuggestions.mockRejectedValueOnce(new Error("down"));
    render(<GlobalSearch surface="header" />);

    await userEvent.click(input());
    await waitFor(() => expect(mockGetSuggestions).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    input().blur();
    await userEvent.click(input());
    expect(await screen.findByRole("option", { name: /German Shepherd Dog/ })).toBeInTheDocument();
  });

  it("clearing the field drops the catalog search it showed", async () => {
    pathname = "/dogs";
    searchParams = new URLSearchParams("size=Small&search=luna");
    render(<GlobalSearch surface="header" />);

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(push).toHaveBeenCalledWith("/dogs?size=Small");
    expect(input()).toHaveValue("");
  });

  it("Enter on an empty field stays put and records nothing", async () => {
    render(<GlobalSearch surface="header" />);
    await userEvent.click(input());
    await screen.findByRole("option", { name: /German Shepherd Dog/ });

    await userEvent.keyboard("{Enter}");
    expect(push).not.toHaveBeenCalled();
    expect(trackSearchPerformed).not.toHaveBeenCalled();
  });

  it("says so when suggestions cannot load, and still searches on Enter", async () => {
    mockGetSuggestions.mockRejectedValue(new Error("down"));
    render(<GlobalSearch surface="header" />);
    await userEvent.type(input(), "lab");

    expect(await screen.findByText("Suggestions aren't available right now.")).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dogs?search=lab"));
  });
});
