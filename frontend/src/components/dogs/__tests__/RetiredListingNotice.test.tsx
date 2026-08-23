import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RetiredListingNotice from "../RetiredListingNotice";

describe("RetiredListingNotice", () => {
  it("renders nothing for a dog still listed at its organisation", () => {
    const { container } = render(<RetiredListingNotice active={true} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the API omits the flag", () => {
    const { container } = render(<RetiredListingNotice active={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("tells the reader the dog is no longer listed", () => {
    render(<RetiredListingNotice active={false} />);

    expect(screen.getByTestId("retired-listing-notice")).toHaveTextContent(
      /no longer listed/i,
    );
  });

  it("does not claim the dog was adopted", () => {
    // status is only ever 'available' or 'unknown' in production - a dog that
    // vanished from source may have been adopted, pulled, or lost to a broken
    // scraper. Saying "adopted" would be inventing an outcome.
    render(<RetiredListingNotice active={false} />);

    expect(screen.getByTestId("retired-listing-notice")).not.toHaveTextContent(
      /adopted/i,
    );
  });

  it("points the reader at dogs they can still adopt", () => {
    render(<RetiredListingNotice active={false} />);

    expect(screen.getByRole("link", { name: /browse available dogs/i })).toHaveAttribute(
      "href",
      "/dogs",
    );
  });

  it("announces itself to assistive technology", () => {
    render(<RetiredListingNotice active={false} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
