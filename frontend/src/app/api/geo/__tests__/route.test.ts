/**
 * @jest-environment node
 */
import { GET } from "../route";

function geo(header?: string): Request {
  return new Request("https://www.rescuedogs.me/api/geo", {
    headers: header ? { "x-vercel-ip-country": header } : {},
  });
}

describe("GET /api/geo", () => {
  it("returns the connection's country without caching it", async () => {
    const response = GET(geo("GB"));
    expect(await response.json()).toEqual({ country: "GB" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns null when the country is missing or unknown", async () => {
    expect(await GET(geo()).json()).toEqual({ country: null });
    expect(await GET(geo("ZZ")).json()).toEqual({ country: null });
  });
});
