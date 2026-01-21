import { render, screen, waitFor } from "../../../test-utils";
import EuropeMap from "../EuropeMap";
import { getOrganizations } from "../../../services/organizationsService";

jest.mock("../../../services/organizationsService");

const mockOrgs = [
  { id: 1, name: "Dogs Trust", country: "UK" },
  { id: 2, name: "Many Tears", country: "UK" },
  { id: 3, name: "REAN", country: "UK" },
  { id: 4, name: "Galgos del Sol", country: "ES" },
  { id: 5, name: "Tierschutzverein", country: "DE" },
];

describe("EuropeMap", () => {
  test("displays map heading", () => {
    (getOrganizations as jest.Mock).mockResolvedValue(mockOrgs);
    render(<EuropeMap />);
    expect(screen.getByText(/Where We Help Dogs/i)).toBeInTheDocument();
  });

  test("shows loading state initially", () => {
    (getOrganizations as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<EuropeMap />);
    expect(screen.getByText(/Loading map/i)).toBeInTheDocument();
  });

  test("displays mission statement about rescue organizations", () => {
    (getOrganizations as jest.Mock).mockResolvedValue(mockOrgs);
    render(<EuropeMap />);
    expect(
      screen.getByText(/rescue organizations working together across borders/i),
    ).toBeInTheDocument();
  });
});
