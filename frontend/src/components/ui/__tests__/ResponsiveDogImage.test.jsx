import React from "react";
import { render, screen } from "../../../test-utils";
import "@testing-library/jest-dom";
import ResponsiveDogImage from "../ResponsiveDogImage";

describe("ResponsiveDogImage Component", () => {
  const mockDog = {
    id: 1,
    name: "Max",
    primary_image_url:
      "https://images.example.com/rescue_dogs/org/dog_abc123.jpg",
  };

  it("renders picture element with multiple sources", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const pictureElement = document.querySelector("picture");
    expect(pictureElement).toBeInTheDocument();
  });

  it("generates mobile source with square aspect ratio and face gravity", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const mobileSource = document.querySelector('source[media*="640px"]');
    expect(mobileSource).toBeInTheDocument();

    const srcset = mobileSource.getAttribute("srcset");
    expect(srcset).toContain("w_400");
    expect(srcset).toContain("h_400");
    expect(srcset).toContain("g_face");
    expect(srcset).toContain("c_cover");
  });

  it("generates tablet source with 4:3 aspect ratio and auto gravity", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const tabletSource = document.querySelector('source[media*="1024px"]');
    expect(tabletSource).toBeInTheDocument();

    const srcset = tabletSource.getAttribute("srcset");
    expect(srcset).toContain("w_600");
    expect(srcset).toContain("h_450");
    expect(srcset).toContain("g_auto");
    expect(srcset).toContain("c_cover");
  });

  it("includes fallback img element with auto gravity", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imgElement = screen.getByAltText("Max");
    expect(imgElement).toBeInTheDocument();

    const src = imgElement.getAttribute("src");
    expect(src).toContain("w_800");
    expect(src).toContain("h_600");
    expect(src).toContain("g_auto");
  });

  it("applies provided className to picture element", () => {
    render(<ResponsiveDogImage dog={mockDog} className="custom-class" />);
    const pictureElement = document.querySelector("picture");
    expect(pictureElement).toHaveClass("custom-class");
  });

  it("handles priority prop for lazy loading", () => {
    const { rerender } = render(
      <ResponsiveDogImage dog={mockDog} priority={false} />,
    );
    let imgElement = screen.getByAltText("Max");
    expect(imgElement).toHaveAttribute("loading", "lazy");

    rerender(<ResponsiveDogImage dog={mockDog} priority={true} />);
    imgElement = screen.getByAltText("Max");
    expect(imgElement).not.toHaveAttribute("loading");
  });

  it("handles missing image gracefully", () => {
    const dogWithoutImage = {
      id: 2,
      name: "Luna",
      primary_image_url: null,
    };

    render(<ResponsiveDogImage dog={dogWithoutImage} />);
    const imgElement = screen.getByAltText("Luna");
    expect(imgElement).toBeInTheDocument();
    expect(imgElement.src).toContain("placeholder");
  });

  it("supports custom sizes prop for responsive breakpoints", () => {
    render(
      <ResponsiveDogImage
        dog={mockDog}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />,
    );
    const imgElement = screen.getByAltText("Max");
    expect(imgElement).toHaveAttribute(
      "sizes",
      "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    );
  });

  it("generates correct srcset for different pixel densities", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const mobileSource = document.querySelector('source[media*="640px"]');
    const srcset = mobileSource.getAttribute("srcset");

    // Should include 1x and 2x versions
    expect(srcset).toContain("1x");
    expect(srcset).toContain("2x");
  });

  it("applies object-position for better framing", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imgElement = screen.getByAltText("Max");
    expect(imgElement).toHaveStyle({ objectPosition: "center 30%" });
  });
});
