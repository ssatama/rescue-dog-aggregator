/**
 * Server component to preload images for LCP optimization
 * Renders a <link rel="preload"> tag inline (browsers process preload hints outside <head>)
 */

interface ImagePreloadProps {
  /** Image URL to preload */
  src: string;
  /** Resource type for preload */
  as?: "image" | "script" | "style" | "font" | "fetch";
  /** Browser fetch priority hint */
  fetchPriority?: "high" | "low" | "auto";
}

export default function ImagePreload({
  src,
  as = "image",
  fetchPriority = "high",
}: ImagePreloadProps): React.ReactElement | null {
  if (!src) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[ImagePreload] No src provided, skipping preload");
    }
    return null;
  }

  return <link rel="preload" href={src} as={as} fetchPriority={fetchPriority} />;
}
