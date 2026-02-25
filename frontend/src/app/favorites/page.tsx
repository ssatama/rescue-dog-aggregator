import type { Metadata } from "next";
import Layout from "../../components/layout/Layout";
import FavoritesClient from "./FavoritesClient";

export const metadata: Metadata = {
  title: "My Favorites | Rescue Dog Aggregator",
  description: "View your saved favorite rescue dogs.",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <Layout>
      <FavoritesClient />
    </Layout>
  );
}
