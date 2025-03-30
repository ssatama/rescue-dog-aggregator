"use client";
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="bg-white shadow">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo/Home link */}
          <div>
            <Link href="/" className="text-2xl font-bold text-red-500">
              Rescue Dog Aggregator
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/dogs" className="text-gray-700 hover:text-red-500">
              Find Dogs
            </Link>
            <Link href="/organizations" className="text-gray-700 hover:text-red-500">
              Organizations
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-red-500">
              About
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              {mobileMenuOpen ? (
                <span className="text-2xl">×</span> // Close icon
              ) : (
                <span className="text-xl">☰</span> // Menu icon
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 py-2 space-y-2">
            <Link 
              href="/dogs" 
              className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Find Dogs
            </Link>
            <Link 
              href="/organizations" 
              className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Organizations
            </Link>
            <Link 
              href="/about" 
              className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}