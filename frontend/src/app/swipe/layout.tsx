import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swipe Dogs | Find Your Perfect Match",
  description:
    "Swipe through rescue dogs one at a time to find your perfect match. Like Tinder, but for dog adoption!",
  openGraph: {
    title: "Swipe to Find Your Perfect Rescue Dog",
    description:
      "Discover rescue dogs one swipe at a time. Find your perfect match from thousands of dogs looking for homes.",
    images: ["/swipe-og-image.png"],
  },
};

export default function SwipeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
