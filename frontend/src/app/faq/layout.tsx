import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Rescue Dogs",
  description:
    "Common questions about adopting rescue dogs from Europe: costs, process, requirements, and what to expect. Find answers about our non-commercial platform.",
  alternates: { canonical: "https://www.rescuedogs.me/faq" },
  openGraph: {
    title: "FAQ | Rescue Dog Aggregator",
    description:
      "Common questions about adopting rescue dogs from Europe: costs, timelines, requirements, and support.",
    type: "website",
    siteName: "Rescue Dog Aggregator",
  },
  twitter: {
    card: "summary",
    title: "FAQ | Rescue Dog Aggregator",
    description: "Common questions about adopting rescue dogs from Europe.",
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
