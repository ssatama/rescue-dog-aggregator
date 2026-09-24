import type { Metadata } from "next";

// Next injects <meta name="robots" content="noindex"> on every 404. Without this the
// root layout's `robots: { index: true }` added a contradictory "index, follow" (#441).
export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">404</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">This page could not be found.</p>
    </main>
  );
}
