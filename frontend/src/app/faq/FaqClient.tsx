"use client";

import { useState } from "react";
import Link from "next/link";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { ChevronDown } from "lucide-react";

interface FAQQuestion {
  question: string;
  answer: string;
}

interface FAQSectionData {
  id: string;
  title: string;
  description: string;
  questions: FAQQuestion[];
}

const FAQ_SECTIONS: FAQSectionData[] = [
  {
    id: "about",
    title: "About the Platform",
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
          "Three simple principles guide everything we do: First, your privacy matters – no cookies, no personal tracking, no accounts required. Second, we'll never commercialize this platform. Third, dogs come first – we showcase them beautifully to give them the best chance of finding their forever families.",
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
          "Expect roughly 6-10 weeks from application to arrival, covering the home check, the dog's vaccinations and health screening, and transport. Many domestic rescues have waiting lists of 3-6 months for the right match.",
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
    description: "What to expect and the support you'll receive",
    questions: [
      {
        question: "Are rescue dogs good for first-time owners?",
        answer:
          "Many rescue dogs make wonderful companions for first-time owners. Organizations assess each dog's temperament and work to match you with the right fit, and most offer post-adoption support once the dog is home.",
      },
      {
        question: "Do rescue dogs have more problems than purchased dogs?",
        answer:
          "The University of Liverpool surveyed 3,080 people who adopted a rescue dog from abroad. It found that 20% of dogs arrived with a known health condition, most often a traumatic injury, and that the common behaviour problems were fear of strangers and of unusual noises. Ask the organization what they have tested for and what they have observed, and expect a straight answer.",
      },
      {
        question: "What support is available after adoption?",
        answer:
          "You won't be on your own. Most organizations offer ongoing guidance, and there are active community groups full of experienced adopters happy to help. Many adopters seek some behavioural support, and report that challenges resolve with the right guidance.",
      },
    ],
  },
  {
    id: "european",
    title: "Why European Rescue",
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
          "We include rescues from across Europe and the UK. The rescues we currently list, and the countries their dogs are in, are on our Rescues and Countries pages. We've selected organizations that maintain high standards for health screening and post-adoption support, covering the diverse landscape of European rescue dogs.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Contact",
    description: "Your data and how to reach us",
    questions: [
      {
        question: "Do you track users or use cookies?",
        answer:
          "No, and we mean it. We don't use cookies, don't require accounts, and don't track personal information. Your favorites list is stored locally in your browser. We use only anonymous, cookie-free analytics to understand general usage patterns.",
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
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={onToggle}
        className="group flex w-full items-start justify-between gap-4 rounded-lg px-1 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isOpen}
      >
        <span className="text-base font-semibold text-ink sm:text-lg">
          {question}
        </span>
        <ChevronDown
          className={`mt-1 h-5 w-5 flex-shrink-0 text-subtle transition-transform duration-300 ease-out motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none ${isOpen ? "max-h-96 opacity-100 pb-5" : "max-h-0 opacity-0"}`}
      >
        <p className="px-1 leading-relaxed text-subtle">
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
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{section.title}</h2>
        <p className="mt-1 text-sm text-subtle">{section.description}</p>
      </div>
      <div className="rounded-xl border border-line bg-surface px-4 sm:px-6">
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
      <div className="mx-auto max-w-3xl py-6 lg:py-8">
        <Breadcrumbs items={breadcrumbItems} />
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-2 text-base text-subtle">
          Everything you need to know about adopting a rescue dog from Europe.
          Can&apos;t find what you&apos;re looking for?{" "}
          <Link href="/about#contact" className="font-semibold text-orange-700 underline underline-offset-4 hover:no-underline dark:text-orange-400">
            Get in touch
          </Link>
          .
        </p>
        <div className="mt-6 mb-10 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="FAQ sections" className="flex flex-wrap gap-2">
            {FAQ_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {section.title}
              </a>
            ))}
          </nav>
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={expandAll} className="text-subtle underline-offset-4 hover:text-ink hover:underline">
              Expand all
            </button>
            <button type="button" onClick={collapseAll} className="text-subtle underline-offset-4 hover:text-ink hover:underline">
              Collapse all
            </button>
          </div>
        </div>
        <div className="space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <FAQSection
              key={section.id}
              section={section}
              openItems={openItems}
              toggleItem={toggleItem}
            />
          ))}
        </div>
        <div className="mt-12 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Ready to find your new best friend?</h2>
          <p className="mt-2 text-subtle">Rescue dogs across Europe are waiting for a home. Start browsing today.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dogs"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-orange-700 px-5 font-semibold text-white transition-colors hover:bg-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Browse dogs
            </Link>
            <Link
              href="/guides"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-surface px-5 font-semibold text-ink transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Read our guides
            </Link>
          </div>
        </div>
        <div className="mt-10 border-t border-line pt-6">
          <p className="text-sm text-subtle">
            Learn more:{" "}
            <Link
              href="/about"
              className="text-orange-700 underline underline-offset-4 hover:no-underline dark:text-orange-400"
            >
              About Us
            </Link>
            {" · "}
            <Link
              href="/privacy"
              className="text-orange-700 underline underline-offset-4 hover:no-underline dark:text-orange-400"
            >
              Privacy Policy
            </Link>
            {" · "}
            <Link
              href="/organizations"
              className="text-orange-700 underline underline-offset-4 hover:no-underline dark:text-orange-400"
            >
              The rescues we list
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
