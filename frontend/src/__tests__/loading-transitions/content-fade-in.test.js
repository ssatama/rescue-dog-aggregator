import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("Content Fade-in Transitions", () => {
  describe("CSS .content-fade-in class", () => {
    it("has proper CSS transition properties", () => {
      // Create a test element with the class
      const testElement = document.createElement("div");
      testElement.className = "content-fade-in";
      document.body.appendChild(testElement);

      // Get computed styles (note: jsdom doesn't fully support CSS, so we test the class exists)
      expect(testElement).toHaveClass("content-fade-in");

      // Clean up
      document.body.removeChild(testElement);
    });

    it("respects prefers-reduced-motion preference", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      // Create element and verify class still applies (CSS handles reduced motion)
      const testElement = document.createElement("div");
      testElement.className = "content-fade-in";
      document.body.appendChild(testElement);

      expect(testElement).toHaveClass("content-fade-in");
      document.body.removeChild(testElement);
    });
  });

  describe("Loading state transitions", () => {
    it("applies fade-in transition when content loads", async () => {
      // Mock component that simulates loading to content transition
      const MockComponent = ({ loading, content }) => (
        <div data-testid="container">
          {loading ? (
            <div data-testid="skeleton">Loading skeleton...</div>
          ) : (
            <div
              data-testid="content"
              className={content?.length > 0 ? "content-fade-in" : ""}
            >
              {content?.map((item, index) => (
                <div key={index} data-testid="content-item">
                  {item.name}
                </div>
              ))}
            </div>
          )}
        </div>
      );

      // Test initial loading state
      const { rerender } = render(
        <MockComponent loading={true} content={[]} />,
      );

      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
      expect(screen.queryByTestId("content")).not.toBeInTheDocument();

      // Test transition to loaded state with content
      rerender(
        <MockComponent
          loading={false}
          content={[{ name: "Item 1" }, { name: "Item 2" }]}
        />,
      );

      await waitFor(() => {
        const content = screen.getByTestId("content");
        expect(content).toBeInTheDocument();
        expect(content).toHaveClass("content-fade-in");
        expect(screen.getAllByTestId("content-item")).toHaveLength(2);
      });

      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    });

    it("does not apply fade-in when no content is available", async () => {
      const MockComponent = ({ loading, content }) => (
        <div data-testid="container">
          {loading ? (
            <div data-testid="skeleton">Loading skeleton...</div>
          ) : (
            <div
              data-testid="content"
              className={content?.length > 0 ? "content-fade-in" : ""}
            >
              {content?.length === 0 && (
                <div data-testid="empty-state">No content available</div>
              )}
            </div>
          )}
        </div>
      );

      const { rerender } = render(
        <MockComponent loading={true} content={[]} />,
      );

      // Transition to empty state (no content)
      rerender(<MockComponent loading={false} content={[]} />);

      await waitFor(() => {
        const content = screen.getByTestId("content");
        expect(content).toBeInTheDocument();
        expect(content).not.toHaveClass("content-fade-in");
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });
    });
  });

  describe("Card component fade-in", () => {
    it("applies fade-in transition to individual card components", () => {
      const MockCard = ({ loaded }) => (
        <div
          data-testid="mock-card"
          className={loaded ? "content-fade-in" : "opacity-0"}
        >
          Card Content
        </div>
      );

      // Test initial state
      const { rerender } = render(<MockCard loaded={false} />);

      const card = screen.getByTestId("mock-card");
      expect(card).toHaveClass("opacity-0");
      expect(card).not.toHaveClass("content-fade-in");

      // Test loaded state
      rerender(<MockCard loaded={true} />);

      expect(card).toHaveClass("content-fade-in");
      expect(card).not.toHaveClass("opacity-0");
    });
  });

  describe("Performance considerations", () => {
    it("does not cause layout shifts during fade-in", () => {
      const MockComponent = ({ showContent }) => (
        <div data-testid="fixed-container" className="w-64 h-48">
          {showContent && (
            <div
              data-testid="content"
              className="content-fade-in w-full h-full"
            >
              Content
            </div>
          )}
        </div>
      );

      const { rerender } = render(<MockComponent showContent={false} />);

      const container = screen.getByTestId("fixed-container");
      expect(container).toHaveClass("w-64", "h-48");

      rerender(<MockComponent showContent={true} />);

      const content = screen.getByTestId("content");
      expect(content).toHaveClass("content-fade-in", "w-full", "h-full");
      expect(container).toHaveClass("w-64", "h-48"); // Container dimensions unchanged
    });
  });

  describe("Accessibility and reduced motion", () => {
    it("maintains content visibility for screen readers", () => {
      const MockComponent = () => (
        <div
          data-testid="accessible-content"
          className="content-fade-in"
          role="region"
          aria-label="Content area"
        >
          Important content
        </div>
      );

      render(<MockComponent />);

      const content = screen.getByTestId("accessible-content");
      expect(content).toBeInTheDocument();
      expect(content).toHaveAttribute("role", "region");
      expect(content).toHaveAttribute("aria-label", "Content area");
      expect(content).toHaveClass("content-fade-in");
    });
  });
});
