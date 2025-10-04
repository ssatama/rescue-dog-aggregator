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
      <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">
        Get in Touch
      </h2>
      <p className="text-xl leading-relaxed text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto text-center">
        Questions about the platform? Interested in listing your rescue organization?
        We'd love to hear from you.
      </p>
      <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12">
        {contacts.map((contact) => {
          const Icon = contact.icon;
          return (
            <a
              key={contact.href}
              href={contact.href}
              target={contact.external ? "_blank" : undefined}
              rel={contact.external ? "noopener noreferrer" : undefined}
              className="group flex flex-col items-center gap-3 transition-all duration-200"
            >
              {/* Icon container with background */}
              <div className="relative w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-1 shadow-md group-hover:shadow-xl">
                <Icon className="w-7 h-7 text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200" />

                {/* Subtle glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-orange-400/0 group-hover:bg-orange-400/10 blur-xl transition-all duration-200"></div>
              </div>

              {/* Label with underline effect */}
              <span className="text-base font-medium text-gray-700 dark:text-gray-300 relative">
                {contact.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300"></span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}