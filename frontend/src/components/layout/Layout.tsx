"use client";
import Header from "./Header";
import Footer from "./Footer";
import { ErrorBoundary } from "../ErrorBoundary";
import type { LayoutProps } from "@/types/layoutComponents";

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main id="main-content" className="flex-grow px-4 py-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
