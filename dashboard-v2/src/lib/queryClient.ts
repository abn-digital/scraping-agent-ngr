import { MutationCache, QueryClient } from "@tanstack/react-query";
import { aviso } from "./avisos";
import { errorMessage } from "./errors";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silent?: boolean };
  }
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      aviso.error(errorMessage(err, "No se pudo completar la acción"));
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
