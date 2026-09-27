import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { Base } from "./Base";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { queryClient } from "./lib/queryClient";

export function montar(raiz: HTMLElement) {
  createRoot(raiz).render(
    <Base>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </Base>,
  );
}
