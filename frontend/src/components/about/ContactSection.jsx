import { Mail, Linkedin, Github } from "lucide-react";

const contacts = [
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
    <section className="mb-16">
      <h2 className="text-section text-gray-800 dark:text-gray-200 mb-4 text-center">
        Get in Touch
      </h2>
      <p className="text-body text-gray-700 dark:text-gray-300 leading-relaxed mb-6 max-w-2xl mx-auto text-center">
        Questions about the platform? Interested in listing your rescue organization?
        We'd love to hear from you.
      </p>
      <div className="flex flex-col md:flex-row justify-center items-center gap-6">
        {contacts.map((contact) => {
          const Icon = contact.icon;
          return (
            <a
              key={contact.href}
              href={contact.href}
              target={contact.external ? "_blank" : undefined}
              rel={contact.external ? "noopener noreferrer" : undefined}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span>{contact.label}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
