/**
 * Server component to preload hero images for LCP optimization
 * Renders a <link rel="preload"> tag in the document head
 */
export default function ImagePreload({ src, as = "image", fetchPriority = "high" }) {
  if (!src) return null;

  return (
    <link
      rel="preload"
      href={src}
      as={as}
      fetchPriority={fetchPriority}
    />
  );
}
