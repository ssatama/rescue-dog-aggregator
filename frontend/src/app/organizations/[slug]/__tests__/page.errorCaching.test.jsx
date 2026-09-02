/**
 * The organization detail route is ISR-cached for `revalidate` (7 days). It
 * used to swallow every fetch failure and render an empty OrganizationDetail
 * shell with HTTP 200, which ISR then pinned for the whole window.
 *
 * Production symptom: /organizations/furry-rescue-italy — an inactive org the
 * API 404s — served a 200 with no schema, no breadcrumbs and no content, and
 * fired a Sentry error on every render (JAVASCRIPT-NEXTJS-6X / -6Y).
 *
 * This is the same rule already applied to dog pages in page.errorCaching.test.jsx.
 */
import { notFound } from "next/navigation";
import { OrganizationDetailPageAsync } from "../page";
import { getOrganizationBySlug } from "../../../../services/organizationsService";

jest.mock("../../../../services/organizationsService", () => ({
  getOrganizationBySlug: jest.fn(),
  getAllOrganizations: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("../../../../utils/logger", () => ({
  reportError: jest.fn(),
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function notFoundError() {
  const error = new Error("Organization not found");
  error.status = 404;
  return error;
}

const props = { params: Promise.resolve({ slug: "furry-rescue-italy" }) };

describe("organization detail page — a retired org is a 404, not an empty 200", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls notFound() when the API says the organization does not exist", async () => {
    getOrganizationBySlug.mockRejectedValue(notFoundError());

    await expect(OrganizationDetailPageAsync(props)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalled();
  });
});

describe("organization detail page — failed fetches must not be cached", () => {
  beforeEach(() => jest.clearAllMocks());

  it("propagates a transient API failure instead of rendering a shell", async () => {
    getOrganizationBySlug.mockRejectedValue(new Error("HTTP 503"));

    await expect(OrganizationDetailPageAsync(props)).rejects.toThrow("HTTP 503");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("propagates a params resolution failure instead of rendering a shell", async () => {
    const badProps = { params: Promise.reject(new Error("params unavailable")) };

    await expect(OrganizationDetailPageAsync(badProps)).rejects.toThrow(
      "params unavailable",
    );
    expect(getOrganizationBySlug).not.toHaveBeenCalled();
  });
});
