"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { reportError } from "../utils/logger";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            reportError(error, { context: "React Query", queryKey: JSON.stringify(query.queryKey) });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            reportError(error, { context: "React Query mutation" });
          },
        }),
        defaultOptions: {
          queries: {
            // With SSR, we want to avoid refetching immediately on mount
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            // Stale time: 5 minutes (same as ISR revalidation)
            staleTime: 5 * 60 * 1000,
            // Cache time: 30 minutes
            gcTime: 30 * 60 * 1000,
            // Retry failed requests 2 times
            retry: 2,
            // Network retry delay
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}