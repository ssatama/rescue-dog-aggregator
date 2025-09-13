// src/app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { Analytics, SpeedInsights } from "@/components/analytics";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import QueryProvider from "@/providers/QueryProvider";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import SentryInitializer from "@/components/SentryInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Use Inter variable font with all required weights
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
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

export default function RootLayout({ children }) {
  // Initialize comprehensive performance monitoring on client side
  if (typeof window !== "undefined") {
    import("@/utils/performanceMonitoring")
      .then(({ initPerformanceMonitoring }) => {
        initPerformanceMonitoring();
      })
      .catch(console.error);
  }

  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} min-h-screen bg-background font-sans`}
      >
        <QueryProvider>
          <ThemeProvider>
            <ToastProvider>
              <FavoritesProvider>
                <ErrorBoundary
                  showError={process.env.NODE_ENV === "development"}
                >
                  {children}
                </ErrorBoundary>
                <Analytics />
                <SpeedInsights />
                <ServiceWorkerRegistration />
                <PerformanceMonitor />
                <SentryInitializer />
              </FavoritesProvider>
            </ToastProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
