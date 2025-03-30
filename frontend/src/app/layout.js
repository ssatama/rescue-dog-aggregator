// src/app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';

// Use Inter font instead of Geist (which isn't directly available in next/font/google)
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Rescue Dog Aggregator',
  description: 'Find your perfect rescue dog from multiple organizations, all in one place.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}