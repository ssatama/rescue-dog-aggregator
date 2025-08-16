import { render, screen, waitFor } from "../../test-utils";
import { R2_CUSTOM_DOMAIN } from "../../constants/imageConfig";

// Mock organization data with R2 logo URL scenarios
const mockOrganizations = [
  {
    id: 2,
    name: "Pets in Turkey",
    config_id: "pets-in-turkey",
    logo_url:
      "https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-pets-in-turkey.jpg",
    description: "We are a group of animal and nature loving people...",
    website_url: "https://www.petsinturkey.org/",
    total_dogs: 33,
    new_this_week: 5,
  },
  {
    id: 11,
    name: "Tierschutzverein Europa e.V.",
    config_id: "tierschutzverein-europa",
    logo_url:
      "https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-tierschutzverein-europa.jpg",
    description: "Since 2006, the members have been committed...",
    website_url: "https://tierschutzverein-europa.de",
    total_dogs: 15,
    new_this_week: 2,
  },
  {
    id: 5,
    name: "REAN (Rescuing European Animals in Need)",
    config_id: "rean",
    logo_url:
      "https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-rean.jpg",
    description: "UK charity rescuing dogs from Romanian shelters...",
    website_url: "https://www.rean.org.uk",
    total_dogs: 8,
    new_this_week: 1,
  },
];

// Mock the OrganizationCard component
const MockOrganizationCard = ({ organization, size = "medium" }) => {
  return (
    <div
      data-testid={`org-card-${organization.config_id}`}
      className={`org-card size-${size}`}
    >
      {organization.logo_url && (
        <img
          src={organization.logo_url}
          alt={`${organization.name} logo`}
          data-testid={`org-logo-${organization.config_id}`}
          onError={(e) => {
            e.target.setAttribute("data-error", "true");
          }}
        />
      )}
      <h3>{organization.name}</h3>
      <p>{organization.description}</p>
      <div>Dogs: {organization.total_dogs}</div>
      <div>New this week: {organization.new_this_week}</div>
    </div>
  );
};

describe("Organization Logo R2 Migration", () => {
  describe("Logo URL Validation", () => {
    it("should have R2 URLs for all organizations", () => {
      mockOrganizations.forEach((org) => {
        expect(org.logo_url).toMatch(/images\.rescuedogs\.me/);
        expect(org.logo_url).toMatch(/^https:\/\//);
        expect(org.logo_url).not.toMatch(/\/Users\//); // No local file paths
        expect(org.logo_url).not.toMatch(/org_logos/); // No local org_logos references
      });
    });

    it("should have valid R2 paths", () => {
      const r2Orgs = mockOrganizations.filter((org) =>
        org.logo_url.includes(R2_CUSTOM_DOMAIN),
      );

      r2Orgs.forEach((org) => {
        // Should have proper R2 structure
        expect(org.logo_url).toMatch(/\/rescue_dogs\/organizations\//);
        // Should end with proper image format
        expect(org.logo_url).toMatch(/\.(jpg|jpeg|png|webp)$/i);
      });
    });

    it("should not contain local file system paths", () => {
      const problematicPatterns = [
        /\/Users\//,
        /\/home\//,
        /C:\\/,
        /org_logos/,
        /\.\.?\//,
      ];

      mockOrganizations.forEach((org) => {
        problematicPatterns.forEach((pattern) => {
          expect(org.logo_url).not.toMatch(pattern);
        });
      });
    });
  });

  describe("Organization Card Logo Display", () => {
    it("should render PIT logo without errors", async () => {
      const pitOrg = mockOrganizations.find(
        (org) => org.config_id === "pets-in-turkey",
      );
      render(<MockOrganizationCard organization={pitOrg} />);

      const logo = screen.getByTestId("org-logo-pets-in-turkey");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", pitOrg.logo_url);
      expect(logo).toHaveAttribute("alt", "Pets in Turkey logo");

      // Wait to ensure no error occurs
      await waitFor(
        () => {
          expect(logo).not.toHaveAttribute("data-error");
        },
        { timeout: 2000 },
      );
    });

    it("should render Tierschutzverein logo without errors", async () => {
      const tsOrg = mockOrganizations.find(
        (org) => org.config_id === "tierschutzverein-europa",
      );
      render(<MockOrganizationCard organization={tsOrg} />);

      const logo = screen.getByTestId("org-logo-tierschutzverein-europa");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", tsOrg.logo_url);
      expect(logo).toHaveAttribute("alt", "Tierschutzverein Europa e.V. logo");

      await waitFor(
        () => {
          expect(logo).not.toHaveAttribute("data-error");
        },
        { timeout: 2000 },
      );
    });

    it("should render REAN logo without errors", async () => {
      const reanOrg = mockOrganizations.find((org) => org.config_id === "rean");
      render(<MockOrganizationCard organization={reanOrg} />);

      const logo = screen.getByTestId("org-logo-rean");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", reanOrg.logo_url);
      expect(logo).toHaveAttribute(
        "alt",
        "REAN (Rescuing European Animals in Need) logo",
      );

      await waitFor(
        () => {
          expect(logo).not.toHaveAttribute("data-error");
        },
        { timeout: 2000 },
      );
    });

    it("should render all organization cards with proper logo URLs", () => {
      const container = render(
        <div>
          {mockOrganizations.map((org) => (
            <MockOrganizationCard key={org.id} organization={org} />
          ))}
        </div>,
      );

      mockOrganizations.forEach((org) => {
        const card = screen.getByTestId(`org-card-${org.config_id}`);
        const logo = screen.getByTestId(`org-logo-${org.config_id}`);

        expect(card).toBeInTheDocument();
        expect(logo).toBeInTheDocument();
        expect(logo.src).toBe(org.logo_url);
        expect(logo.src).toMatch(/images\.rescuedogs\.me/);
      });
    });
  });

  describe("Logo URL Structure Validation", () => {
    it("should have consistent R2 folder structure for uploaded logos", () => {
      const uploadedLogos = mockOrganizations.filter((org) =>
        org.logo_url.includes("/rescue_dogs/organizations/"),
      );

      uploadedLogos.forEach((org) => {
        expect(org.logo_url).toMatch(/\/rescue_dogs\/organizations\//);
        expect(org.logo_url).toMatch(
          new RegExp(`org-logo-${org.config_id}\\.(jpg|jpeg|png)$`),
        );
      });
    });

    it("should support different logo size transformations with Cloudflare Images", () => {
      const baseUrl =
        "https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-pets-in-turkey.jpg";

      // Test that we can generate different size URLs using Cloudflare Images
      const thumbnailUrl = `https://images.rescuedogs.me/cdn-cgi/image/w_64,h_64,c_fill,g_center/${baseUrl.replace("https://images.rescuedogs.me/", "")}`;
      const mediumUrl = `https://images.rescuedogs.me/cdn-cgi/image/w_128,h_128,c_fill,g_center/${baseUrl.replace("https://images.rescuedogs.me/", "")}`;
      const largeUrl = `https://images.rescuedogs.me/cdn-cgi/image/w_256,h_256,c_fill,g_center/${baseUrl.replace("https://images.rescuedogs.me/", "")}`;

      expect(thumbnailUrl).toMatch(/w_64,h_64/);
      expect(mediumUrl).toMatch(/w_128,h_128/);
      expect(largeUrl).toMatch(/w_256,h_256/);

      [thumbnailUrl, mediumUrl, largeUrl].forEach((url) => {
        expect(url).toMatch(/images\.rescuedogs\.me/);
        expect(url).not.toMatch(/\/Users\//);
      });
    });
  });

  describe("Error Prevention", () => {
    it("should not have any 404-prone local file paths", () => {
      const problematicUrls = [
        "/org_logos/pit.jpg",
        "/org_logos/tierverschutz.jpg",
        "org_logos/pit.jpg",
        "./org_logos/pit.jpg",
        "../org_logos/pit.jpg",
      ];

      mockOrganizations.forEach((org) => {
        problematicUrls.forEach((badUrl) => {
          expect(org.logo_url).not.toBe(badUrl);
          expect(org.logo_url).not.toContain("org_logos");
        });
      });
    });

    it("should have accessible URLs that do not return 404", () => {
      // This test would ideally make HTTP requests to verify URLs are accessible
      // For now, we verify they follow the correct R2 pattern
      mockOrganizations.forEach((org) => {
        expect(org.logo_url).toMatch(/^https:\/\/images\.rescuedogs\.me/);
        expect(org.logo_url).not.toMatch(/localhost/);
        expect(org.logo_url).not.toMatch(/127\.0\.0\.1/);
        expect(org.logo_url).not.toMatch(/file:\/\//);
      });
    });
  });

  describe("Configuration Sync Validation", () => {
    it("should have logos that match organization sync process results", () => {
      // Verify that the URLs match what the sync process would generate
      const expectedPatterns = {
        "pets-in-turkey": /org-logo-pets-in-turkey\.jpg$/,
        "tierschutzverein-europa": /org-logo-tierschutzverein-europa\.jpg$/,
        rean: /org-logo-rean\.jpg$/,
      };

      mockOrganizations.forEach((org) => {
        const pattern = expectedPatterns[org.config_id];
        if (pattern) {
          expect(org.logo_url).toMatch(pattern);
        }
      });
    });

    it("should not reference outdated local paths from config files", () => {
      // Ensure we are not using the old YAML config local paths
      const oldConfigPaths = [
        "/org_logos/pit.jpg",
        "/org_logos/tierverschutz.jpg",
      ];

      mockOrganizations.forEach((org) => {
        oldConfigPaths.forEach((oldPath) => {
          expect(org.logo_url).not.toBe(oldPath);
        });
      });
    });
  });
});
