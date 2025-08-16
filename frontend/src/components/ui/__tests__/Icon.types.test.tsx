import React from "react";
import { render, screen } from "../../../test-utils";
import { Icon, IconName, IconSize, IconColor, iconNames } from "../Icon";

describe("Icon TypeScript Tests", () => {
  test("accepts valid IconName types", () => {
    const validNames: IconName[] = ["heart", "x", "menu", "search"];

    validNames.forEach((name) => {
      const { unmount } = render(<Icon name={name} />);
      expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
      unmount();
    });
  });

  test("accepts valid IconSize types", () => {
    const validSizes: IconSize[] = ["small", "default", "medium", "large"];

    validSizes.forEach((size) => {
      const { unmount } = render(<Icon name="heart" size={size} />);
      expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
      unmount();
    });
  });

  test("accepts valid IconColor types", () => {
    const validColors: IconColor[] = [
      "default",
      "interactive",
      "active",
      "on-dark",
    ];

    validColors.forEach((color) => {
      const { unmount } = render(<Icon name="heart" color={color} />);
      expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
      unmount();
    });
  });

  test("properly types aria-label prop", () => {
    const ariaLabel = "Test icon";

    render(<Icon name="heart" aria-label={ariaLabel} />);

    const icon = screen.getByRole("img");
    expect(icon).toHaveAttribute("aria-label", ariaLabel);
  });

  test("properly types filled prop for heart icon", () => {
    render(<Icon name="heart" filled={true} />);

    const icon = screen.getByRole("img", { hidden: true });
    expect(icon).toHaveAttribute("fill", "currentColor");
  });

  test("properly types className prop", () => {
    const className = "custom-icon-class";

    render(<Icon name="heart" className={className} />);

    const icon = screen.getByRole("img", { hidden: true });
    expect(icon).toHaveClass(className);
  });

  test("handles optional props with proper typing", () => {
    render(<Icon name="heart" />);

    const icon = screen.getByRole("img", { hidden: true });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  test("iconNames export contains proper types", () => {
    expect(iconNames).toContain("heart");
    expect(iconNames).toContain("x");
    expect(iconNames).toContain("menu");
    expect(Array.isArray(iconNames)).toBe(true);
  });

  test("throws error for invalid icon name", () => {
    // Mock console.error to avoid noise in test output
    const originalError = console.error;
    console.error = jest.fn();

    // This should throw an error at runtime
    expect(() => {
      render(<Icon name={"invalid-icon" as IconName} />);
    }).toThrow();

    console.error = originalError;
  });

  test("properly types additional props spreading", () => {
    const additionalProps = {
      "data-testid": "custom-icon",
      title: "Custom title",
    };

    render(<Icon name="heart" {...additionalProps} />);

    const icon = screen.getByTestId("custom-icon");
    expect(icon).toHaveAttribute("title", "Custom title");
  });

  test("component has proper displayName", () => {
    expect(Icon.displayName).toBe("Icon");
  });
});
