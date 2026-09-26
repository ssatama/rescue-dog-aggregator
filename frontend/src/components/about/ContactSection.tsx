import { Mail } from "lucide-react";
import { Github, Linkedin } from "../ui/brandIcons";

interface ContactItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  external: boolean;
}

const contacts: ContactItem[] = [
  {
    icon: Mail,
    label: "rescuedogsme@gmail.com",
    href: "mailto:rescuedogsme@gmail.com",
    external: false,
  },
  {
    icon: Linkedin,
    label: "Connect on LinkedIn",
    href: "https://www.linkedin.com/in/sampo-satama-data-scientist/",
    external: true,
  },
  {
    icon: Github,
    label: "View on GitHub",
    href: "https://github.com/ssatama/rescue-dog-aggregator",
    external: true,
  },
];

export default function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-24">
      <h2 className="mb-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Get in touch</h2>
      <p className="mb-5 text-lg leading-relaxed text-subtle">
        Questions about the platform? Interested in listing your rescue
        organization? We&apos;d love to hear from you.
      </p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {contacts.map((contact) => {
          const Icon = contact.icon;
          return (
            <li key={contact.href}>
              <a
                href={contact.href}
                target={contact.external ? "_blank" : undefined}
                rel={contact.external ? "noopener noreferrer" : undefined}
                className="flex h-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-sm font-semibold text-ink transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-5 w-5 shrink-0 text-subtle" />
                <span className="min-w-0 break-words">{contact.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
