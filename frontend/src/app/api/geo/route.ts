import { NextResponse } from "next/server";
import { COUNTRY_NAMES } from "@/utils/countryNames";

export const dynamic = "force-dynamic";

/** The visitor's country as Vercel sees the connection (#493), so pages can
 * stay static and ask for it from the browser. Read per request and never
 * stored or logged; unknown countries come back as null. */
export function GET(request: Request): NextResponse {
  const header = request.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  const country = COUNTRY_NAMES[header] ? header : null;
  return NextResponse.json({ country }, { headers: { "Cache-Control": "private, no-store" } });
}
