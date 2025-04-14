import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:justify-between md:items-center">
          {/* Left Side: Brand/Mission */}
          <div className="mb-6 md:mb-0">
            <Link href="/" className="text-xl font-semibold text-white hover:text-gray-200">
              Rescue Dog Aggregator
            </Link>
            <p className="mt-1 text-sm text-gray-400">
              Helping rescue dogs find loving homes.
            </p>
          </div>

          {/* Right Side: Navigation Links */}
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
            <Link href="/about" className="text-sm hover:text-white">
              About
            </Link>
            {/* *** Change Contact to mailto link *** */}
            <a
              href="mailto:rescuedogaggregator@gmail.com"
              className="text-sm hover:text-white"
            >
              Contact
            </a>
            {/* *** Remove Privacy Policy link *** */}
            {/* <Link href="/privacy" className="text-sm hover:text-white">
              Privacy Policy
            </Link> */}
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-8 border-t border-gray-700 pt-6 text-sm text-gray-500 text-center">
          &copy; {new Date().getFullYear()} Rescue Dog Aggregator. All rights reserved.
        </div>
      </div>
    </footer>
  );
}