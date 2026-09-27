import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { URL, fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// La v2 vive en /v2 del mismo dominio que la v1: misma sesión, misma API, y la
// v1 sigue intacta en la raíz hasta que la v2 se apruebe.
const BASE = "/v2/";

// En desarrollo, la API es la de la app. PROXY_API apunta a otra (la de
// producción, por ejemplo) sin tocar este archivo.
const API = process.env.PROXY_API ?? "http://localhost:8080";

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // strictPort: si el puerto está ocupado, que falle en vez de correrse a otro
  // en silencio y servir código viejo desde el proceso anterior.
  server: {
    port: 5393,
    strictPort: true,
    proxy: {
      "/api": { target: API, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
  },
});
