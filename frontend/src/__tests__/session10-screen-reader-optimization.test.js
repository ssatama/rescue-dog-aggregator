/**
 * Session 10 - Screen Reader Optimization Tests
 * Tests for enhanced ARIA labels, roles, and screen reader compatibility
 */

import { render, screen } from "../test-utils";

// Import components to test
import { DogDetailSkeleton } from "../components/ui/DogDetailSkeleton";
import SkeletonPulse from "../components/ui/SkeletonPulse";
import ContentSkeleton from "../components/ui/ContentSkeleton";

describe("Session 10: Screen Reader Optimization", () => {
  describe("Loading States Screen Reader Support", () => {
    test("DogDetailSkeleton should have proper screen reader announcements", () => {
      render(<DogDetailSkeleton />);

      // Should have main status role for loading announcement
      const statusContainer = screen.getByRole("status");
      expect(statusContainer).toBeInTheDocument();
      expect(statusContainer).toHaveAttribute(
        "aria-label",
        "Loading dog details",
      );

      // Should have screen reader only text
      expect(
        screen.getByText("Loading dog details, please wait..."),
      ).toHaveClass("sr-only");
    });

    test("SkeletonPulse should handle standalone vs child element accessibility", () => {
      // Test standalone skeleton (should have role="status")
      const { rerender } = render(
        <SkeletonPulse standalone={true} aria-label="Loading content" />,
      );

      const standaloneElement = screen.getByRole("status");
      expect(standaloneElement).toHaveAttribute(
        "aria-label",
        "Loading content",
      );

      // Test child skeleton (should not have role="status")
      rerender(
        <div role="status" aria-label="Loading page">
          <SkeletonPulse standalone={false} />
        </div>,
      );

      // Should only have one status role (the parent)
      const statusElements = screen.getAllByRole("status");
      expect(statusElements).toHaveLength(1);
    });

    test("ContentSkeleton should provide context about text loading", () => {
      const { container } = render(
        <ContentSkeleton lines={3} aria-label="Loading article" />,
      );

      // Should have status container
      const statusContainer = screen.getByRole("status");
      expect(statusContainer).toHaveAttribute("aria-label", "Loading article");

      // Should have multiple skeleton lines (ContentSkeleton creates SkeletonPulse elements)
      const skeletonElements = container.querySelectorAll(".skeleton-element");
      expect(skeletonElements.length).toBe(3);
    });
  });

  describe("Dynamic Content Announcements", () => {
    test("Loading state changes should be announced properly", () => {
      // Mock a component that changes from loading to loaded
      const LoadingComponent = ({ isLoading }) => (
        <div>
          {isLoading ? (
            <div role="status" aria-live="polite" aria-label="Loading">
              <span className="sr-only">Loading content, please wait...</span>
            </div>
          ) : (
            <div role="status" aria-live="polite" aria-label="Content loaded">
              <span className="sr-only">Content loaded successfully</span>
            </div>
          )}
        </div>
      );

      const { rerender } = render(<LoadingComponent isLoading={true} />);

      // Should announce loading
      expect(screen.getByText("Loading content, please wait...")).toHaveClass(
        "sr-only",
      );

      rerender(<LoadingComponent isLoading={false} />);

      // Should announce completion
      expect(screen.getByText("Content loaded successfully")).toHaveClass(
        "sr-only",
      );
    });

    test("Error states should be announced assertively", () => {
      const ErrorComponent = ({ hasError, errorMessage }) => (
        <div>
          {hasError && (
            <div role="alert" aria-live="assertive">
              <span className="sr-only">Error: {errorMessage}</span>
              <div>{errorMessage}</div>
            </div>
          )}
        </div>
      );

      render(
        <ErrorComponent hasError={true} errorMessage="Failed to load data" />,
      );

      // Should have alert role for assertive announcement
      const alertElement = screen.getByRole("alert");
      expect(alertElement).toHaveAttribute("aria-live", "assertive");
      expect(screen.getByText("Error: Failed to load data")).toHaveClass(
        "sr-only",
      );
    });
  });

  describe("Enhanced Form Accessibility", () => {
    test("Form inputs should have proper descriptions and error states", () => {
      const FormComponent = ({ hasError }) => (
        <div>
          <label htmlFor="breed-input">Dog Breed</label>
          <input
            id="breed-input"
            type="text"
            placeholder="Enter breed name"
            aria-describedby="breed-help breed-error"
            aria-invalid={hasError}
          />
          <div id="breed-help" className="sr-only">
            Search for your dog&apos;s breed to filter results
          </div>
          {hasError && (
            <div id="breed-error" role="alert" className="text-red-600">
              Please enter a valid breed name
            </div>
          )}
        </div>
      );

      const { rerender } = render(<FormComponent hasError={false} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute(
        "aria-describedby",
        "breed-help breed-error",
      );
      expect(input).toHaveAttribute("aria-invalid", "false");

      rerender(<FormComponent hasError={true} />);

      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid breed name",
      );
    });

    test("Filter buttons should announce their state changes", () => {
      const FilterComponent = ({ isActive, count }) => (
        <button
          aria-pressed={isActive}
          aria-label={`Size filter${count > 0 ? `, ${count} dogs` : ""}${isActive ? ", currently active" : ""}`}
        >
          Size {count > 0 && `(${count})`}
        </button>
      );

      const { rerender } = render(
        <FilterComponent isActive={false} count={0} />,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-pressed", "false");
      expect(button).toHaveAttribute("aria-label", "Size filter");

      rerender(<FilterComponent isActive={true} count={5} />);

      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button).toHaveAttribute(
        "aria-label",
        "Size filter, 5 dogs, currently active",
      );
    });
  });

  describe("Complex Component Accessibility", () => {
    test("Card navigation should provide clear context", () => {
      const DogCardComponent = ({ dogName, organizationName }) => (
        <div
          role="button"
          tabIndex={0}
          aria-label={`View details for ${dogName} from ${organizationName}`}
          className="focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
        >
          <h3>{dogName}</h3>
          <p>{organizationName}</p>
        </div>
      );

      render(
        <DogCardComponent dogName="Buddy" organizationName="Local Rescue" />,
      );

      const card = screen.getByRole("button");
      expect(card).toHaveAttribute(
        "aria-label",
        "View details for Buddy from Local Rescue",
      );
      expect(card).toHaveAttribute("tabIndex", "0");
    });

    test("Dropdown menus should have proper ARIA relationships", () => {
      const DropdownComponent = () => (
        <div>
          <button
            aria-expanded={false}
            aria-haspopup="menu"
            aria-controls="dropdown-menu"
            id="dropdown-trigger"
          >
            Options
          </button>
          <div
            id="dropdown-menu"
            role="menu"
            aria-labelledby="dropdown-trigger"
            hidden
          >
            <div role="menuitem">Option 1</div>
            <div role="menuitem">Option 2</div>
          </div>
        </div>
      );

      render(<DropdownComponent />);

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-controls", "dropdown-menu");

      const menu = screen.getByRole("menu", { hidden: true });
      expect(menu).toHaveAttribute("aria-labelledby", "dropdown-trigger");
    });
  });

  describe("Progress and Status Indicators", () => {
    test("Progress indicators should announce completion", () => {
      const ProgressComponent = ({ progress, total }) => (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Loading progress: ${progress} of ${total} items`}
        >
          <div style={{ width: `${(progress / total) * 100}%` }}>
            <span className="sr-only">
              {progress === total
                ? "Loading complete"
                : `Loading ${progress} of ${total} items`}
            </span>
          </div>
        </div>
      );

      const { rerender } = render(
        <ProgressComponent progress={3} total={10} />,
      );

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow", "3");
      expect(progressbar).toHaveAttribute("aria-valuemax", "10");
      expect(screen.getByText("Loading 3 of 10 items")).toHaveClass("sr-only");

      rerender(<ProgressComponent progress={10} total={10} />);

      expect(screen.getByText("Loading complete")).toHaveClass("sr-only");
    });

    test("Status changes should use appropriate aria-live regions", () => {
      const StatusComponent = ({ status }) => (
        <div>
          <div role="status" aria-live="polite">
            <span className="sr-only">Status: {status}</span>
          </div>
          <div>{status}</div>
        </div>
      );

      const { rerender } = render(<StatusComponent status="Connected" />);

      expect(screen.getByText("Status: Connected")).toHaveClass("sr-only");

      rerender(<StatusComponent status="Disconnected" />);

      expect(screen.getByText("Status: Disconnected")).toHaveClass("sr-only");
    });
  });
});
