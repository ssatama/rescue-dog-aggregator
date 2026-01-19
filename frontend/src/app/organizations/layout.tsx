"use client";

import QueryProvider from "@/providers/QueryProvider";

export default function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
