import { get } from "../../utils/api";
import {
  getOrganizations,
  getOrganizationById,
} from "../organizationsService";

jest.mock("../../utils/api", () => ({ get: jest.fn() }));

describe("organizationsService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getOrganizations calls GET /api/organizations", async () => {
    get.mockResolvedValue([{ id: 1, name: "Org A" }]);
    await getOrganizations();
    expect(get).toHaveBeenCalledWith("/api/organizations", {}, expect.objectContaining({}));
  });

  it("getOrganizationById calls GET /api/organizations/:id", async () => {
    get.mockResolvedValue({ id: 2, name: "Org B" });
    await getOrganizationById(2);
    expect(get).toHaveBeenCalledWith("/api/organizations/2", {}, expect.objectContaining({}));
  });
});
