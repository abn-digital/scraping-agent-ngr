import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useSearchParams } from "react-router";
import logoNgr from "@/assets/ngr.png";
import { SelectorDeEspacio } from "@/components/layout/SelectorDeEspacio";
import { Shell } from "@/components/layout/Shell";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { ultimaMarca } from "@/lib/recordar";
import MarcaPage from "@/pages/MarcaPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ResumenPage from "@/pages/ResumenPage";
import RevisionPage from "@/pages/RevisionPage";
import TiendaPage from "@/pages/TiendaPage";
import TiendasPage from "@/pages/TiendasPage";

// La guía viva del sistema existe solo en desarrollo: en el build, esta rama
// desaparece y la página no llega al bundle.
const SistemaPage = import.meta.env.DEV ? lazy(() => import("@/pages/SistemaPage")) : null;

function Esperando() {
  return (
    <div role="status" className="grid min-h-screen place-items-center text-meta text-ink-3">
      <span aria-hidden>…</span>
      <span className="sr-only">Cargando</span>
    </div>
  );
}

// NGR es el cliente de toda la app: un contexto arriba del riel, con su logo.
// Hay uno solo, así que se muestra y no se abre.
const NGR = { id: "ngr", nombre: "NGR", detalle: "Perú · 6 marcas", logo: logoNgr };

function ConShell() {
  return (
    <Shell
      arriba={(variante, riel) => (
        <SelectorDeEspacio
          actual={NGR}
          espacios={[NGR]}
          variante={variante}
          riel={riel}
          onElegir={() => {}}
        />
      )}
    >
      <Outlet />
    </Shell>
  );
}

/** "Comparativa" en el riel abre la última marca que se miró, en el canal que tenía. */
function IrAMarca() {
  const [params] = useSearchParams();
  const destino = ultimaMarca();
  const q = params.toString();
  return <Navigate replace to={`/marcas/${destino}${q ? `?${q}` : ""}`} />;
}

export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route element={<ConShell />}>
          <Route index element={<ResumenPage />} />
          <Route path="marcas" element={<IrAMarca />} />
          <Route path="marcas/:marca" element={<MarcaPage vista="precios" />} />
          <Route path="marcas/:marca/revision" element={<MarcaPage vista="revision" />} />
          <Route path="revision" element={<RevisionPage />} />
          <Route path="tiendas" element={<TiendasPage />} />
          <Route path="tiendas/:id" element={<TiendaPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {SistemaPage && (
          <Route
            path="/sistema"
            element={
              <Shell>
                <Suspense fallback={<Esperando />}>
                  <SistemaPage />
                </Suspense>
              </Shell>
            }
          />
        )}
      </Routes>
    </TooltipProvider>
  );
}
