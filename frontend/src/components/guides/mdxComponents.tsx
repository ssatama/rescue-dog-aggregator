import type { ComponentPropsWithoutRef } from "react";
import { DogGrid } from "./DogGrid";
import { Callout } from "./Callout";
import { Stats } from "./Stats";

/**
 * Components MDX is rendered with. Declared outside GuideContent so the guide
 * route can render the body on the server: DogGrid, Callout and Stats are all
 * client components, which compose normally inside server-rendered MDX.
 *
 * No h2 override. rehype-slug and rehype-autolink-headings already set the id
 * and anchor on every heading, and a hand-rolled id here was dead anyway —
 * JSX spreads props last, so rehype's id won. It also disagreed with rehype:
 * "What's Actually Required" slugs to "whats" under rehype and "what-s" under
 * a naive replace.
 */
export const mdxComponents = {
  DogGrid,
  Callout,
  Stats,

  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-3xl font-bold mt-8 mb-4" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mb-4 leading-relaxed" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a className="text-orange-500 hover:underline" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded" {...props} />
  ),
};
