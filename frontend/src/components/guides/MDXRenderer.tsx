"use client";

import { MDXRemote } from "next-mdx-remote";
import type { MDXRemoteProps } from "next-mdx-remote";

export default function MDXRenderer(props: MDXRemoteProps): React.JSX.Element {
  return <MDXRemote {...props} />;
}
