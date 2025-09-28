import Head from "next/head";
import React from "react";

interface MobileHomeSEOProps {
  totalDogs?: number;
  totalOrganizations?: number;
  totalBreeds?: number;
}

export const MobileHomeSEO: React.FC<MobileHomeSEOProps> = ({
  totalDogs = 3000,
  totalOrganizations = 13,
  totalBreeds = 50,
}) => {
  const title = `Rescue Dogs - Find Your Perfect Match | ${totalDogs.toLocaleString()}+ Dogs Available`;
  const description = `Browse ${totalDogs.toLocaleString()}+ rescue dogs from ${totalOrganizations} European organizations. Find your perfect companion with our personality matching system. Swipe through dogs, filter by breed, and save favorites.`;
  const url = "https://www.rescuedogs.me";
  const imageUrl = `${url}/og-image.jpg`;

  // JSON-LD structured data for Organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "AnimalShelter",
    name: "Rescue Dog Aggregator",
    url: url,
    logo: `${url}/logo.png`,
    description: description,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "120",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "Multiple European Countries",
    },
    areaServed: ["Europe", "EU"],
    serviceType: "Dog Adoption Platform",
  };

  // JSON-LD for ItemList (dogs)
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Available Rescue Dogs",
    numberOfItems: totalDogs,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Browse All Dogs",
        url: `${url}/dogs`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Swipe Through Dogs",
        url: `${url}/swipe`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Browse by Breed",
        url: `${url}/breeds`,
      },
    ],
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: url,
      },
    ],
  };

  // FAQPage schema for better visibility
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How many rescue dogs are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `We currently have ${totalDogs.toLocaleString()}+ rescue dogs available from ${totalOrganizations} trusted European rescue organizations.`,
        },
      },
      {
        "@type": "Question",
        name: "How does the adoption process work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Browse or swipe through available dogs, save your favorites, and contact the rescue organization directly through our platform to start the adoption process.",
        },
      },
      {
        "@type": "Question",
        name: "What breeds are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `We have over ${totalBreeds} different breeds available, including popular breeds like Labrador Retrievers, German Shepherds, and many mixed breeds.`,
        },
      },
    ],
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="Rescue Dog Aggregator" />

      {/* Mobile Specific */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Rescue Dogs" />
      <meta name="application-name" content="Rescue Dogs" />
      <meta name="format-detection" content="telephone=no" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Rescue Dog Aggregator" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={imageUrl} />
      <meta name="twitter:creator" content="@rescuedogs" />

      {/* Performance hints */}
      <link rel="dns-prefetch" href="https://www.rescuedogs.me" />
      <link rel="preconnect" href="https://www.rescuedogs.me" />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Alternate for mobile */}
      <link rel="alternate" media="only screen and (max-width: 640px)" href={`${url}/m`} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </Head>
  );
};