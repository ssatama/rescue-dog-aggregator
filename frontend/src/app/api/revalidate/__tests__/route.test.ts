/**
 * @jest-environment node
 */
import { POST } from "../route";
import { revalidatePath, revalidateTag } from "next/cache";

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const TOKEN = "test-revalidation-token";

beforeAll(() => {
  process.env.REVALIDATION_TOKEN = TOKEN;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function makeRequest(opts: {
  token?: string | null;
  body?: unknown;
  bodyRaw?: string;
}): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.token != null) {
    headers["x-revalidate-token"] = opts.token;
  }
  const body =
    opts.bodyRaw !== undefined
      ? opts.bodyRaw
      : opts.body !== undefined
        ? JSON.stringify(opts.body)
        : undefined;
  return new Request("http://localhost/api/revalidate", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/revalidate", () => {
  it("returns 401 when token header is missing", async () => {
    const res = await POST(makeRequest({ token: null, body: {} }));
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns 401 when token does not match", async () => {
    const res = await POST(makeRequest({ token: "wrong", body: {} }));
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns 401 when REVALIDATION_TOKEN env is unset (fail closed)", async () => {
    const original = process.env.REVALIDATION_TOKEN;
    delete process.env.REVALIDATION_TOKEN;
    try {
      const res = await POST(makeRequest({ token: TOKEN, body: {} }));
      expect(res.status).toBe(401);
      expect(revalidateTag).not.toHaveBeenCalled();
    } finally {
      process.env.REVALIDATION_TOKEN = original;
    }
  });

  it("returns 200 and revalidates tags + paths with correct token", async () => {
    const res = await POST(
      makeRequest({
        token: TOKEN,
        body: {
          tags: ["animals", "statistics"],
          paths: ["/dogs/buddy-1"],
        },
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      revalidated: { tags: string[]; paths: string[] };
    };
    expect(data.revalidated).toEqual({
      tags: ["animals", "statistics"],
      paths: ["/dogs/buddy-1"],
    });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith("animals", "max");
    expect(revalidateTag).toHaveBeenCalledWith("statistics", "max");
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/dogs/buddy-1");
  });

  it("returns 400 when body has no tags or paths", async () => {
    const res = await POST(makeRequest({ token: TOKEN, body: {} }));
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns 400 when body is malformed JSON", async () => {
    const res = await POST(
      makeRequest({ token: TOKEN, bodyRaw: "{not json" }),
    );
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns 400 when tags/paths are non-array values", async () => {
    const res = await POST(
      makeRequest({
        token: TOKEN,
        body: { tags: "not-an-array", paths: 42 },
      }),
    );
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ignores non-string entries inside arrays", async () => {
    const res = await POST(
      makeRequest({
        token: TOKEN,
        body: {
          tags: ["good", 42, null],
          paths: [{}, "/ok"],
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("good", "max");
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/ok");
  });
});
