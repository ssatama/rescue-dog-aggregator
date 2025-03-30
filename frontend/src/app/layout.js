export const metadata = {
  title: "Rescue Dog Aggregator",
  description: "Find your perfect rescue dog from multiple organizations, all in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
