import type { Metadata } from "next";
import Link from "next/link";
import Layout from "../../components/layout/Layout";
import Breadcrumbs from "../../components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy | Rescue Dog Aggregator",
  description:
    "Our privacy practices: no cookies, no personal tracking, no user accounts. We believe in transparency about what we collect and don't collect.",
  alternates: {
    canonical: "https://www.rescuedogs.me/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Rescue Dog Aggregator",
    description:
      "Our privacy practices: no cookies, no personal tracking, no user accounts. We believe in transparency.",
    type: "website",
    siteName: "Rescue Dog Aggregator",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Rescue Dog Aggregator",
    description:
      "Our privacy practices: no cookies, no personal tracking, no user accounts.",
  },
};

export default function PrivacyPage(): React.JSX.Element {
  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Privacy" }];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="text-center mb-12">
          <h1 className="text-title text-gray-900 dark:text-gray-100 mb-3">
            Privacy Policy
          </h1>
          <p className="text-body text-gray-600 dark:text-gray-400">
            We believe in transparency. Here&apos;s exactly what we do and
            don&apos;t collect.
          </p>
        </div>

        <div className="space-y-12 sm:space-y-16 md:space-y-24 lg:space-y-32 py-8 sm:py-12 md:py-16 lg:py-24">
          <section className="bg-orange-50 dark:bg-orange-900/20 p-6 sm:p-8 md:p-10 rounded-lg text-center">
            <div className="text-4xl mb-4">🍪</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Notice Something Missing?
            </h2>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300">
              No annoying cookie consent popups. We don&apos;t use cookies, so
              we don&apos;t need to ask.
            </p>
          </section>

          <section>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">
              What We Collect
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 rounded-lg">
                <div className="text-3xl mb-3">💾</div>
                <h3 className="text-card-title text-gray-900 dark:text-gray-100 mb-3">
                  Your Favorites
                </h3>
                <p className="text-body text-gray-600 dark:text-gray-400 mb-2">
                  When you save dogs to your favorites, they&apos;re stored in
                  your browser&apos;s localStorage.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Your list stays on your device. Our analytics count that a
                  dog was saved, never who saved it.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 rounded-lg">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="text-card-title text-gray-900 dark:text-gray-100 mb-3">
                  Anonymous Analytics
                </h3>
                <p className="text-body text-gray-600 dark:text-gray-400 mb-2">
                  We use{" "}
                  <Link
                    href="https://vercel.com/docs/analytics/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Vercel Analytics
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="https://posthog.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    PostHog
                  </Link>{" "}
                  (data stored in the EU, in Frankfurt) to understand how people
                  use the site.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1 mt-3">
                  <li>• Page views & timestamps</li>
                  <li>• Clicks, such as which dogs you open or save</li>
                  <li>• Filters you use, and that you searched (never what you typed)</li>
                  <li>• Anonymous session recordings, with form inputs masked</li>
                  <li>• Device type (mobile/desktop/tablet)</li>
                  <li>• Country/city (aggregate)</li>
                  <li>• Browser & OS</li>
                  <li>• Referrer source</li>
                </ul>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                  Analytics store nothing on your device, so each visit starts
                  fresh and is never linked to you or to earlier visits.
                </p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-3">
                  No cookies • No personal identification • No cross-site
                  tracking
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 rounded-lg md:col-span-2">
                <div className="text-3xl mb-3">📍</div>
                <h3 className="text-card-title text-gray-900 dark:text-gray-100 mb-3">
                  Where You Live
                </h3>
                <p className="text-body text-gray-600 dark:text-gray-400 mb-2">
                  To mark the dogs you can adopt, we guess your country from
                  your internet connection. The guess is made fresh on each
                  visit and never stored on our servers; your browser keeps it
                  only until you close the tab.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  If you pick a country yourself, or choose &ldquo;Anywhere&rdquo;, that choice is
                  saved in your browser&apos;s localStorage and nowhere else.
                  Analytics record the country you set, never anything more
                  precise. It only labels dogs: we never hide dogs by location
                  unless you turn on &ldquo;Only dogs I can adopt&rdquo;.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 md:p-10 rounded-lg">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">
              What We Don&apos;t Collect
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
              <div>
                <div className="text-3xl mb-2">👤</div>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  No user accounts
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">📧</div>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  No email addresses
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">🍪</div>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  No cookies
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">📍</div>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  No personal tracking
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">💰</div>
                <p className="text-body text-gray-600 dark:text-gray-400">
                  No data sold
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-6">
              Error Monitoring
            </h2>
            <p className="text-lg md:text-xl leading-relaxed text-gray-700 dark:text-gray-300 mb-4">
              We use{" "}
              <Link
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 dark:text-orange-400 hover:underline"
              >
                Sentry
              </Link>{" "}
              to catch technical errors and crashes. This helps us keep the site
              working smoothly. Sentry only collects error data, not your
              personal information.
            </p>
          </section>

          <section>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-6">
              Dog Data Sources
            </h2>
            <p className="text-lg md:text-xl leading-relaxed text-gray-700 dark:text-gray-300">
              All dog listings are aggregated from public rescue organization
              websites. We link directly to original sources for adoption
              applications. We are not affiliated with or endorsed by these
              rescue organizations – we simply make their dogs easier to
              discover.
            </p>
          </section>

          <section className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 md:p-10 rounded-lg">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">
              Open Source & Contact
            </h2>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 text-center mb-8">
              This project is open source. You can see exactly how we handle
              data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="https://github.com/ssatama/rescue-dog-aggregator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                View on GitHub
              </Link>
              <Link
                href="/about#contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contact Us
              </Link>
            </div>
          </section>

          <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
            Last updated: December 2025
          </p>
        </div>
      </div>
    </Layout>
  );
}