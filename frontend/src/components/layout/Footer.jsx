import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-card text-card-foreground border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:justify-between md:items-center">
          {/* Left Side: Brand/Mission */}
          <div className="mb-6 md:mb-0">
            <Link
              href="/"
              className="flex items-center gap-3 text-card-title font-semibold text-foreground hover:text-muted-foreground"
            >
              <Image
                src="/logo.jpeg"
                alt="Rescue Dog Aggregator logo"
                width={80}
                height={80}
                className="rounded-full object-cover w-20 h-20"
              />
              <div>
                <span className="block">Rescue Dog Aggregator</span>
                <p className="mt-1 text-small text-muted-foreground font-normal">
                  Helping rescue dogs find loving homes.
                </p>
              </div>
            </Link>
          </div>

          {/* Right Side: Navigation Links */}
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
            <Link
              href="/about"
              className="text-small text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            {/* *** Change Contact to mailto link *** */}
            <a
              href="mailto:rescuedogsme@gmail.com"
              className="text-small text-muted-foreground hover:text-foreground"
            >
              Contact
            </a>
            {/* *** Remove Privacy Policy link *** */}
            {/* <Link href="/privacy" className="text-sm hover:text-white">
              Privacy Policy
            </Link> */}
          </div>
        </div>
      </div>
    </footer>
  );
}
