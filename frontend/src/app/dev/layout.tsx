import { notFound } from "next/navigation";

// Developer tools only. In production they 404 (a server layout, so before anything
// streams) instead of rendering a "development only" message with a 200 (#445).
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return children;
}
