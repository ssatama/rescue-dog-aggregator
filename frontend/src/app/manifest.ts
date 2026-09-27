import type { MetadataRoute } from "next";

// What a phone, tablet or desktop uses when the site is installed as an app.
// Next links it from every page as /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rescue Dogs",
    short_name: "Rescue Dogs",
    description: "Every rescue dog in one place. Free, no account.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // White like the icons, so the launch screen has no box around the dog
    background_color: "#FFFFFF",
    theme_color: "#FAF9F6",
    categories: ["lifestyle"],
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press on the icon. No Swipe: shortcuts show on desktop too (#484)
    shortcuts: [
      { name: "All dogs", url: "/dogs" },
      { name: "Favorites", url: "/favorites" },
    ],
  };
}
