import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "../../../test-utils";
import SocialMediaLinks from "../SocialMediaLinks";

describe("SocialMediaLinks", () => {
  it("only renders the links you pass via socialMedia prop", () => {
    const socialMedia = {
      facebook: "https://facebook.com/testfoo",
      instagram: "https://instagram.com/testfoo",
    };

    render(<SocialMediaLinks socialMedia={socialMedia} />);

    // facebook & instagram should render
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      socialMedia.facebook,
    );
    expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
      "href",
      socialMedia.instagram,
    );

    // twitter was not passed, so it should not render
    expect(screen.queryByRole("link", { name: /twitter/i })).toBeNull();
  });
});
