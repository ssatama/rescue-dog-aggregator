import type { Metadata } from "next";
import Layout from "../../components/layout/Layout";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { PersonSchema } from "../../components/seo";
import HarleyStory from "../../components/about/HarleyStory";
import StatsDisplay from "../../components/about/StatsDisplay";
import EuropeMap from "../../components/about/EuropeMap";
import ContactSection from "../../components/about/ContactSection";

export const metadata: Metadata = {
  title: "About Us | European Rescue Dog Platform - Rescue Dogs",
  description:
    "Learn about our mission to connect loving homes with rescue dogs in need. Discover how we work with rescue organizations to simplify the dog adoption process.",
  alternates: {
    canonical: "https://www.rescuedogs.me/about",
  },
  openGraph: {
    title: "About Rescue Dog Aggregator",
    description:
      "Learn about our mission to connect loving homes with rescue dogs in need. Discover how we work with rescue organizations to simplify the dog adoption process.",
    type: "website",
    siteName: "Rescue Dog Aggregator",
  },
  twitter: {
    card: "summary",
    title: "About Rescue Dog Aggregator",
    description:
      "Learn about our mission to connect loving homes with rescue dogs in need.",
  },
};

export default function AboutPage(): React.JSX.Element {
  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "About" }];

  return (
    <Layout>
      <PersonSchema
        name="Sampo Satama"
        jobTitle="Founder"
        organization={{ name: "Rescue Dog Aggregator", url: "https://www.rescuedogs.me" }}
        sameAs={[
          "https://www.linkedin.com/in/sampo-satama-data-scientist/",
          "https://github.com/ssatama",
        ]}
      />
      <div className="mx-auto max-w-3xl py-6 lg:py-8">
        <Breadcrumbs items={breadcrumbItems} />

        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          About Rescue Dog Aggregator
        </h1>
        <p className="mt-2 text-lg text-subtle">Connecting loving homes with rescue dogs in need.</p>

        <div className="mt-10 space-y-14">
          <HarleyStory />

          <StatsDisplay />

          <EuropeMap />

          <section>
            <h2 className="mb-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Our mission</h2>
            <p className="text-lg leading-relaxed text-ink">
              Our mission is to connect loving homes in the UK and across Europe
              with rescue dogs in need. We bring dogs from trusted rescue
              organizations across Europe and the UK into one place. Rescue
              organizations are not technology experts - they are experts at
              rescuing dogs in need. By bridging the gap between places where
              people are looking for a dog and regions with overcrowded
              shelters, we help more dogs find homes while supporting the work
              of the rescues.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">How it works</h2>
            <ol className="grid gap-3 md:grid-cols-3">
              <li className="rounded-xl border border-line bg-surface p-5">
                <p className="font-display text-lg font-bold text-ink">1. Browse dogs</p>
                <p className="mt-1 text-subtle">Search and filter by breed, age, size, what they live well with, and where you can adopt.</p>
              </li>
              <li className="rounded-xl border border-line bg-surface p-5">
                <p className="font-display text-lg font-bold text-ink">2. Meet the dog</p>
                <p className="mt-1 text-subtle">Each dog&apos;s page has their photos, their story and what the rescue knows about them.</p>
              </li>
              <li className="rounded-xl border border-line bg-surface p-5">
                <p className="font-display text-lg font-bold text-ink">3. Adopt through the rescue</p>
                <p className="mt-1 text-subtle">Every dog links to the rescue that lists them. You apply and adopt with them directly.</p>
              </li>
            </ol>
          </section>

          <ContactSection />
        </div>
      </div>
    </Layout>
  );
}
