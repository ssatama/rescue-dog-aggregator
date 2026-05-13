import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

interface RevalidateBody {
  tags?: unknown;
  paths?: unknown;
}

const onlyStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
};

export async function POST(request: Request): Promise<NextResponse> {
  const expected = process.env.REVALIDATION_TOKEN;
  const provided = request.headers.get("x-revalidate-token");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = await request
    .json()
    .catch((): RevalidateBody => ({}));
  const body =
    parsed != null && typeof parsed === "object"
      ? (parsed as RevalidateBody)
      : {};

  const tags = onlyStrings(body.tags);
  const paths = onlyStrings(body.paths);

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json(
      { error: "no tags or paths provided" },
      { status: 400 },
    );
  }

  for (const tag of tags) revalidateTag(tag, "max");
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({
    revalidated: { tags, paths },
    now: Date.now(),
  });
}
