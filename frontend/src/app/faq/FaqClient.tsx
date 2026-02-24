"use client";

import { useState } from "react";
import Link from "next/link";
import { BreadcrumbSchema } from "../../components/seo";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { ChevronDown } from "lucide-react";

interface FAQQuestion {
  question: string;
  answer: string;
}

interface FAQSectionData {
  id: string;
  title: string;
  emoji: string;
  description: string;
  questions: FAQQuestion[];
}

const FAQ_SECTIONS: FAQSectionData[] = [
  {
    id: "about",
    title: "About the Platform",
    emoji: "🐕",
    description: "Learn about who we are and what we stand for",
    questions: [
      {
        question: "Is RescueDogs.me a commercial platform?",
        answer:
          "Not at all! RescueDogs.me is completely non-commercial and open-source. No ads, no monetization, no affiliate links – and that's a promise. We're here for one reason only: helping rescue dogs find loving homes.",
      },
      {
        question: "What are your core principles?",
        answer:
          "Three simple principles guide everything we do: First, your privacy matters – no cookies, no tracking, no accounts required. Second, we'll never commercialize this platform. Third, dogs come first – we showcase them beautifully to give them the best chance of finding their forever families.",
      },
      {
        question: "Are you affiliated with the rescue organizations?",
        answer:
          "We're completely independent. We're not affiliated with, endorsed by, or partnered with any rescue organization. We simply gather their publicly available listings to make wonderful dogs easier to discover. When you're ready to adopt, you'll apply directly with the rescue.",
      },
    ],
  },
  {
    id: "adoption",
    title: "Adoption Process",
    emoji: "📋",
    description: "Everything about costs, timelines, and requirements",
    questions: [
      {
        question: "How much does it cost to adopt a rescue dog?",
        answer:
          "European rescue adoption fees typically range from €350-€750, which includes transport to your home. This covers neutering, vaccinations, microchip, EU passport, Mediterranean disease testing, health certificates, and transport – services worth €800-€1,400 if purchased separately. It's genuinely good value for comprehensive care.",
      },
      {
        question: "How long does the adoption process take?",
        answer:
          "Good news – European rescue organizations can often match you with a dog within 2-3 weeks from application to arrival. This is considerably faster than many domestic rescues, where waiting lists can stretch 3-6 months for the right match.",
      },
      {
        question: "What's included in the adoption fee?",
        answer:
          "Quite a lot! Most fees cover: spay/neuter surgery, core vaccinations including rabies, microchipping with EU registration, EU Pet Passport, Mediterranean disease testing (Leishmaniasis, Ehrlichiosis, and more), veterinary health certificate, official documentation, and transport from the rescue to your door.",
      },
      {
        question: "What are the requirements to adopt?",
        answer:
          "Requirements vary by organization, but typically include: a secure garden for some dogs, time for a settling-in period, and home check approval. Some dogs need experienced owners. The wonderful thing about European rescues is they often have more flexible requirements than domestic shelters – they genuinely want to find good matches.",
      },
    ],
  },
  {
    id: "success",
    title: "Success & Support",
    emoji: "💚",
    description: "What to expect and the support you'll receive",
    questions: [
      {
        question: "Are rescue dogs good for first-time owners?",
        answer:
          "Absolutely! Many rescue dogs make wonderful companions for first-time owners. Organizations carefully assess each dog's temperament and work to match you with the right fit. Research shows 97% of international rescue adoptions succeed long-term, often thanks to excellent post-adoption support from the rescue community.",
      },
      {
        question: "Do rescue dogs have more problems than purchased dogs?",
        answer:
          "Actually, the data suggests otherwise. International rescue adoptions have a remarkable 97% retention rate (based on a University of Liverpool study of 3,080 adopters). The thorough matching process – including home visits and lifestyle assessments – helps create successful, lasting bonds.",
      },
      {
        question: "What support is available after adoption?",
        answer:
          "You won't be on your own! Most organizations offer ongoing guidance, and there are active community groups full of experienced adopters happy to help. About two-thirds of adopters seek some behavioral support, and the vast majority report any challenges are fully resolved with the right guidance.",
      },
    ],
  },
  {
    id: "european",
    title: "Why European Rescue",
    emoji: "🌍",
    description: "Understanding the need for cross-border adoption",
    questions: [
      {
        question: "Why focus on European rescues?",
        answer:
          "There's a real need. While adopters often face long waiting lists at domestic shelters, millions of dogs across Europe – in Romania, Spain, Greece, Turkey, and beyond – face euthanasia or life on the streets. This aggregator addresses this gap, connecting willing adopters with dogs who desperately need homes.",
      },
      {
        question: "Which countries do your rescue organizations cover?",
        answer:
          "We include rescues from across Europe: Romania, Spain, Greece, Bulgaria, Montenegro, Malta, Turkey, Germany, Bosnia, Italy, and the UK. We've selected organizations that maintain high standards for health screening and post-adoption support, covering the diverse landscape of European rescue dogs.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Contact",
    emoji: "🔒",
    description: "Your data and how to reach us",
    questions: [
      {
        question: "Do you track users or use cookies?",
        answer:
          "No, and we mean it. We don't use cookies, don't require accounts, and don't track personal information. Your favorites are stored locally in your browser and never leave your device. We use only anonymous analytics to understand general usage patterns.",
      },
      {
        question: "How can I contact you?",
        answer:
          "We'd love to hear from you! Visit our About page for contact details. The project is also open-source on GitHub if you'd like to contribute, report issues, or just see how everything works.",
      },
    ],
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps): React.JSX.Element {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 px-1 flex items-start justify-between gap-4 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-lg"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-300 ease-out ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-96 opacity-100 pb-5" : "max-h-0 opacity-0"}`}
      >
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed px-1">
          {answer}
        </p>
      </div>
    </div>
  );
}

interface FAQSectionProps {
  section: FAQSectionData;
  openItems: string[];
  toggleItem: (itemId: string) => void;
}

function FAQSection({ section, openItems, toggleItem }: FAQSectionProps): React.JSX.Element {
  return (
    <section className="scroll-mt-24" id={section.id}>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl" role="img" aria-hidden="true">
          {section.emoji}
        </span>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {section.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {section.description}
          </p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 px-6">
        {section.questions.map((faq, index) => {
          const itemId = `${section.id}-${index}`;
          return (
            <FAQItem
              key={itemId}
              question={faq.question}
              answer={faq.answer}
              isOpen={openItems.includes(itemId)}
              onToggle={() => toggleItem(itemId)}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function FaqClient(): React.JSX.Element {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "FAQ" }];

  const toggleItem = (itemId: string): void => {
    setOpenItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const expandAll = (): void => {
    const allIds = FAQ_SECTIONS.flatMap((section) =>
      section.questions.map((_, index) => `${section.id}-${index}`)
    );
    setOpenItems(allIds);
  };

  const collapseAll = (): void => setOpenItems([]);

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
            <span className="text-3xl">❓</span>
          </div>
          <h1 className="text-title text-gray-900 dark:text-gray-100 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about adopting a rescue dog from Europe.
            Can&apos;t find what you&apos;re looking for?{" "}
            <Link
              href="/about#contact"
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              Get in touch
            </Link>
            .
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-12 sm:mb-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {FAQ_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <span>{section.emoji}</span>
                  <span className="hidden sm:inline">{section.title}</span>
                </a>
              ))}
            </div>
            <div className="flex gap-2 text-sm">
              <button
                onClick={expandAll}
                className="text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                Expand all
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={collapseAll}
                className="text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                Collapse all
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-12 sm:space-y-16">
          {FAQ_SECTIONS.map((section) => (
            <FAQSection
              key={section.id}
              section={section}
              openItems={openItems}
              toggleItem={toggleItem}
            />
          ))}
        </div>
        <div className="mt-16 sm:mt-24 mb-12 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Ready to find your new best friend?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
            Thousands of rescue dogs across Europe are waiting for a loving
            home. Start browsing today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dogs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              🐾 Browse Dogs
            </Link>
            <Link
              href="/guides"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
            >
              📚 Read Our Guides
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-8 pb-12">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Learn more:{" "}
            <Link
              href="/about"
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              About Us
            </Link>
            {" · "}
            <Link
              href="/privacy"
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              Privacy Policy
            </Link>
            {" · "}
            <Link
              href="/organizations"
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              Our Partner Rescues
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
