import { render, screen, fireEvent } from "../../../test-utils";
import OrganizationLink from "../OrganizationLink";

describe("OrganizationLink", () => {
  const mockOrganization = {
    id: 1,
    name: "Pets in Turkey",
    dog_count: 45,
  };

  describe("Basic Rendering", () => {
    test("should render organization name and count", () => {
      render(<OrganizationLink organization={mockOrganization} />);

      expect(screen.getByText("Pets in Turkey (45)")).toBeInTheDocument();
    });

    test("should create proper link to organization filter", () => {
      render(<OrganizationLink organization={mockOrganization} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/dogs?organization=pets-in-turkey");
    });

    test("should handle organization names with spaces and special characters", () => {
      const orgWithSpaces = {
        id: 2,
        name: "Berlin Rescue & Shelter",
        dog_count: 23,
      };

      render(<OrganizationLink organization={orgWithSpaces} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/dogs?organization=berlin-rescue-shelter",
      );
    });
  });

  describe("Styling and Hover States", () => {
    test("should have proper CSS classes for styling", () => {
      render(<OrganizationLink organization={mockOrganization} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("text-orange-600", "hover:text-orange-800");
    });

    test("should have hover effect", () => {
      render(<OrganizationLink organization={mockOrganization} />);

      const link = screen.getByRole("link");
      fireEvent.mouseEnter(link);

      // Test that hover class is applied (via CSS)
      expect(link).toHaveClass("hover:text-orange-800");
    });
  });

  describe("Accessibility", () => {
    test("should have proper accessibility attributes", () => {
      render(<OrganizationLink organization={mockOrganization} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "aria-label",
        "View 45 dogs from Pets in Turkey",
      );
    });

    test("should be keyboard accessible", () => {
      render(<OrganizationLink organization={mockOrganization} />);

      const link = screen.getByRole("link");
      link.focus();
      expect(document.activeElement).toBe(link);
    });
  });

  describe("Edge Cases", () => {
    test("should handle zero dog count", () => {
      const orgWithZeroDogs = {
        id: 3,
        name: "Empty Shelter",
        dog_count: 0,
      };

      render(<OrganizationLink organization={orgWithZeroDogs} />);

      expect(screen.getByText("Empty Shelter (0)")).toBeInTheDocument();
    });

    test("should handle single dog count", () => {
      const orgWithOneDog = {
        id: 4,
        name: "Small Rescue",
        dog_count: 1,
      };

      render(<OrganizationLink organization={orgWithOneDog} />);

      expect(screen.getByText("Small Rescue (1)")).toBeInTheDocument();

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "aria-label",
        "View 1 dogs from Small Rescue",
      );
    });

    test("should handle very long organization names", () => {
      const orgWithLongName = {
        id: 5,
        name: "Very Long Organization Name That Might Cause Layout Issues",
        dog_count: 15,
      };

      render(<OrganizationLink organization={orgWithLongName} />);

      expect(
        screen.getByText(
          "Very Long Organization Name That Might Cause Layout Issues (15)",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("URL Generation", () => {
    test("should convert organization names to URL-safe slugs", () => {
      const testCases = [
        { name: "Pets in Turkey", expected: "pets-in-turkey" },
        { name: "Berlin Rescue & Shelter", expected: "berlin-rescue-shelter" },
        { name: "Happy Tails!", expected: "happy-tails" },
        { name: "Tierschutz EU", expected: "tierschutz-eu" },
      ];

      testCases.forEach(({ name, expected }) => {
        const org = { id: 1, name, dog_count: 10 };
        const { unmount } = render(<OrganizationLink organization={org} />);

        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", `/dogs?organization=${expected}`);

        unmount();
      });
    });
  });
});
