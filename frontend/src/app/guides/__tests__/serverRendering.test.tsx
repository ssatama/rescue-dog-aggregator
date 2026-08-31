import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { isValidElement, type ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import GuidePage from "@/app/guides/[slug]/page";

jest.mock("@/components/layout/Layout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function findElement(
  node: ReactNode,
  predicate: (el: React.ReactElement) => boolean,
): React.ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;

  const props = node.props as { children?: ReactNode };
  return findElement(props?.children, predicate);
}

/**
 * The guide body must be produced by this server component, not fetched by the
 * client. Verified structurally here; the byte-level proof is the build output,
 * where each guide page went from 0 to 9 <h2> elements.
 */
describe("guide route server rendering", () => {
  it("renders the MDX body in the server component tree", async () => {
    const element = await GuidePage({
      params: Promise.resolve({ slug: "european-rescue-guide" }),
    });

    const mdx = findElement(element, (el) => el.type === MDXRemote);

    expect(mdx).not.toBeNull();
  });

  it("gives the renderer the guide's own body", async () => {
    // Read from disk, not through getGuide: using the same loader the route
    // uses would make the oracle circular, and a getGuide that returned the
    // frontmatter too, or ignored its slug, would still satisfy both sides.
    const raw = fs.readFileSync(
      path.join(process.cwd(), "content", "guides", "european-rescue-guide.mdx"),
      "utf-8",
    );
    const body = matter(raw).content;

    const element = await GuidePage({
      params: Promise.resolve({ slug: "european-rescue-guide" }),
    });

    const mdx = findElement(element, (el) => el.type === MDXRemote);
    const source = (mdx?.props as { source?: string })?.source ?? "";

    expect(source).toBe(body);
    expect(source).not.toContain("lastUpdated:");
  });

  it("nests the body inside GuideContent so the shell stays interactive", async () => {
    const element = await GuidePage({
      params: Promise.resolve({ slug: "european-rescue-guide" }),
    });

    const guideContent = findElement(
      element,
      (el) => {
        const props = el.props as { guide?: unknown; children?: ReactNode };
        // GuideSchema also takes a guide prop; GuideContent is the one that
        // wraps the body.
        return props?.guide !== undefined && props?.children !== undefined;
      },
    );
    const body = findElement(
      (guideContent?.props as { children?: ReactNode })?.children,
      (el) => el.type === MDXRemote,
    );

    expect(body).not.toBeNull();
  });
});
