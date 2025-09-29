import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-card text-card-foreground border-t border-border mt-auto">
      {/* Mobile-optimized padding and spacing */}
      <div className="max-w-7xl mx-auto py-3 md:py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:justify-between md:items-center">
          {/* Left Side: Brand/Mission - Mobile optimized */}
          <div className="mb-3 md:mb-0">
            <Link
              href="/"
              className="flex items-center gap-2 md:gap-3 text-card-title font-semibold text-foreground hover:text-muted-foreground"
            >
              <Image
                src="/logo.jpeg"
                alt="Rescue Dog Aggregator logo"
                width={80}
                height={80}
                className="rounded-full object-cover w-10 h-10 md:w-20 md:h-20"
              />
              <div>
                <span className="block text-sm md:text-base">
                  Rescue Dog Aggregator
                </span>
                <p className="mt-0.5 md:mt-1 text-xs md:text-small text-muted-foreground font-normal">
                  Helping rescue dogs find loving homes.
                </p>
              </div>
            </Link>
          </div>

          {/* Right Side: Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
            <Link
              href="/about"
              className="text-small text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <a
              href="mailto:rescuedogsme@gmail.com"
              className="text-small text-muted-foreground hover:text-foreground"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
