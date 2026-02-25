import type { Metadata } from "next";
import "./globals.css";
import { Inter, Caveat } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { Analytics, SpeedInsights } from "@/components/analytics";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MobileBottomNavWrapper from "@/components/navigation/MobileBottomNavWrapper";
import SentryInitializer from "@/components/SentryInitializer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://www.rescuedogs.me"
      : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  ),
  title: "Rescue Dog Aggregator - Find Your Perfect Rescue Dog",
  description:
    "Find your perfect rescue dog from multiple organizations, all in one place. Browse available dogs for adoption and connect with rescue organizations.",
  keywords:
    "rescue dogs, dog adoption, pet rescue, animal shelter, adopt a dog, rescue organizations",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        url: "/favicon-16x16.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Rescue Dog Aggregator - Find Your Perfect Rescue Dog",
    description:
      "Find your perfect rescue dog from multiple organizations, all in one place. Browse available dogs for adoption and connect with rescue organizations.",
    type: "website",
    siteName: "Rescue Dog Aggregator",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rescue Dog Aggregator - Find Your Perfect Rescue Dog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rescue Dog Aggregator - Find Your Perfect Rescue Dog",
    description:
      "Find your perfect rescue dog from multiple organizations, all in one place.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://images.rescuedogs.me" />
        <link rel="dns-prefetch" href="https://images.rescuedogs.me" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Rescue Dog Aggregator",
              url: "https://www.rescuedogs.me",
              description:
                "Find adoptable rescue dogs from verified organizations across Europe. Browse dogs available for adoption from shelters and rescues.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://www.rescuedogs.me/dogs?search={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
              publisher: {
                "@type": "Organization",
                name: "Rescue Dog Aggregator",
                logo: {
                  "@type": "ImageObject",
                  url: "https://www.rescuedogs.me/logo.jpeg",
                  width: 512,
                  height: 512,
                },
              },
              inLanguage: "en-US",
              copyrightYear: new Date().getFullYear(),
              keywords:
                "rescue dogs, dog adoption, pet rescue, animal shelter, adopt a dog",
            }).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-background font-sans`}
      >
        <ThemeProvider>
          <ToastProvider>
            <FavoritesProvider>
              <ErrorBoundary
                showError={process.env.NODE_ENV === "development"}
              >
                {children}
                <MobileBottomNavWrapper />
              </ErrorBoundary>
              <Analytics />
              <SpeedInsights />
              <ServiceWorkerRegistration />
              <PerformanceMonitor />
              <SentryInitializer />
            </FavoritesProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
