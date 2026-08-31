import type { ReactNode } from "react";

/**
 * jest cannot load next-mdx-remote's ESM build, so the real server renderer is
 * mocked here as the other MDX packages already are. Actual server rendering
 * is verified against the production build output, not in jest.
 */
export function MDXRemote({ source }: { source?: string }): ReactNode {
  return <div data-testid="mdx-server-rendered">{source}</div>;
}
