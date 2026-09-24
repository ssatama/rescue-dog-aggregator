import fs from "fs";
import path from "path";
import { getAllGuides } from "@/lib/guides";
import { buildLlmsFull } from "@/utils/llmsFull";

// Built once at deploy time from public/llms.txt and content/guides (#446)
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const llmsTxt = fs.readFileSync(path.join(process.cwd(), "public/llms.txt"), "utf8");
  const guides = await getAllGuides();
  const body = buildLlmsFull(llmsTxt, guides, "https://www.rescuedogs.me");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
