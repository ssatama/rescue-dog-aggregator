import React from "react";
import { render, screen } from "../../../test-utils";
import "@testing-library/jest-dom";
import ResponsiveDogImage from "../ResponsiveDogImage";

jest.mock("next/image", () => {
  const MockImage = React.forwardRef(function MockImage(props, ref) {
    const {
      src,
      alt,
      onError,
      fill,
      width,
      height,
      priority,
      quality,
      placeholder,
      blurDataURL,
      sizes,
      style,
      className,
      loading,
      ...rest
    } = props;

    const handleError = (e) => {
      if (onError) {
        onError(e);
      }
    };

    const validDomProps = {};

    Object.keys(rest).forEach((key) => {
      if (
        key.startsWith("data-") ||
        key.startsWith("aria-") ||
        ["id", "title", "role", "tabIndex", "onClick", "onKeyDown"].includes(
          key,
        )
      ) {
        validDomProps[key] = rest[key];
      }
    });

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        style={style}
        className={className}
        loading={loading}
        onError={handleError}
        data-testid="optimized-image"
        data-priority={priority}
        data-quality={quality}
        data-placeholder={placeholder}
        data-blur-data-url={blurDataURL}
        data-sizes={sizes}
        {...validDomProps}
      />
    );
  });

  MockImage.displayName = "NextImage";
  return MockImage;
});

jest.mock("../../../utils/networkUtils", () => ({
  getAdaptiveImageQuality: jest.fn(() => "q_80,"),
}));

describe("ResponsiveDogImage Component", () => {
  const mockDog = {
    id: 1,
    name: "Max",
    primary_image_url:
      "https://images.example.com/rescue_dogs/org/dog_abc123.jpg",
  };

  it("renders optimized image element", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imageElement = screen.getByTestId("optimized-image");
    expect(imageElement).toBeInTheDocument();
  });

  it("renders with correct src and alt attributes", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imgElement = screen.getByAltText("Max");
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute("src", mockDog.primary_image_url);
  });

  it("uses dog-card sizes preset", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imgElement = screen.getByTestId("optimized-image");
    expect(imgElement).toHaveAttribute(
      "data-sizes",
      "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    );
  });

  it("applies correct aspect ratio and layout", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imgElement = screen.getByTestId("optimized-image");
    expect(imgElement).not.toHaveAttribute("width");
    expect(imgElement).not.toHaveAttribute("height");
  });

  it("applies provided className to image element", () => {
    render(<ResponsiveDogImage dog={mockDog} className="custom-class" />);
    const imgElement = screen.getByTestId("optimized-image");
    expect(imgElement).toHaveClass("custom-class");
    expect(imgElement).toHaveClass("transition-transform");
    expect(imgElement).toHaveClass("duration-300");
    expect(imgElement).toHaveClass("ease-out");
    expect(imgElement).toHaveClass("group-hover:scale-105");
  });

  it("handles priority prop for lazy loading", () => {
    const { rerender } = render(
      <ResponsiveDogImage dog={mockDog} priority={false} />,
    );
    let imgElement = screen.getByTestId("optimized-image");
    expect(imgElement).toHaveAttribute("data-priority", "false");

    rerender(<ResponsiveDogImage dog={mockDog} priority={true} />);
    imgElement = screen.getByTestId("optimized-image");
    expect(imgElement).toHaveAttribute("data-priority", "true");
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
    expect(imgElement.src).toContain("placeholder_dog.svg");
  });

  it("supports custom sizes prop for responsive breakpoints", () => {
    render(
      <ResponsiveDogImage
        dog={mockDog}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />,
    );
    const imgElement = screen.getByTestId("optimized-image");
    expect(imgElement).toHaveAttribute(
      "data-sizes",
      "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    );
  });

  it("uses NextImage internally with correct props", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imgElement = screen.getByTestId("optimized-image");
    expect(imgElement).toHaveAttribute("alt", "Max");
    expect(imgElement).toHaveAttribute("src", mockDog.primary_image_url);
    expect(imgElement).toHaveStyle({
      objectFit: "cover",
      objectPosition: "center 30%",
    });
  });

  it("applies object-position for better framing", () => {
    render(<ResponsiveDogImage dog={mockDog} />);
    const imgElement = screen.getByAltText("Max");
    expect(imgElement).toHaveStyle({ objectPosition: "center 30%" });
  });
});
