import { Suspense } from "react";
import DogsPageClient from "./DogsPageClient";

export default function DogsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DogsPageClient />
    </Suspense>
  );
}
