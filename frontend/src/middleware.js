import { NextResponse } from "next/server";

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Check if this is a breed detail page request
  if (pathname.startsWith("/breeds/") && pathname !== "/breeds/mixed") {
    const slug = pathname.split("/breeds/")[1];

    // Check if this is a mixed breed slug
    if (
      slug &&
      (slug.toLowerCase().includes("mix") || slug === "mixed-breed")
    ) {
      // Redirect to the consolidated mixed breeds page
      const url = request.nextUrl.clone();
      url.pathname = "/breeds/mixed";
      return NextResponse.redirect(url, { status: 301 }); // 301 permanent redirect for SEO
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/breeds/:path*",
};
