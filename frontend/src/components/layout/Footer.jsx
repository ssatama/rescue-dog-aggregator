import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-lg font-semibold">Rescue Dog Aggregator</p>
            <p className="text-sm text-gray-300">
              Helping rescue dogs find loving homes
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
            <Link href="/about" className="text-gray-300 hover:text-white">
              About
            </Link>
            <Link href="/contact" className="text-gray-300 hover:text-white">
              Contact
            </Link>
            <Link href="/privacy" className="text-gray-300 hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-700 pt-4 text-sm text-gray-400 text-center">
          &copy; {new Date().getFullYear()} Rescue Dog Aggregator. All rights reserved.
        </div>
      </div>
    </footer>
  );
}