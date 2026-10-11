"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Standard pro data-fetching mimo DataTable (viz skill
 * nextjs-tanstack-query-conventions) - jeden QueryClient na appku,
 * vytvořený přes useState, aby při remountu komponenty (ne appky) nevznikl
 * nový a nezahodil cache.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Appka je celá interní administrace - data se nemění pod
            // rukama tak často, aby refetch na každé přefokusování okna
            // dával smysl, a zbytečně by zatěžoval API.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
